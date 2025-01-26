// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract ModularDEX is Ownable, ReentrancyGuard {
    struct Pair {
        uint reserve1;
        uint reserve2;
    }

    uint16 public fee = 30; // Fee in basis points (0.3%)
    address public feeRecipient;
    mapping(string => address) public tokenAddresses; // Token registry
    mapping(string => AggregatorV3Interface) public priceFeeds; // Price feed registry
    mapping(string => uint8) public tokenDecimals; // Token decimals registry
    mapping(bytes32 => Pair) public pairs; // Token pair reserves

    event TokenAdded(string indexed symbol, address tokenAddress, uint8 decimals);
    event TokenRemoved(string indexed symbol);
    event FeeUpdated(uint oldFee, uint newFee);
    event Swap(address indexed user, string tokenIn, string tokenOut, uint amountIn, uint amountOut);
    event LiquidityAdded(address indexed provider, string token1, string token2, uint amount1, uint amount2);
    event LiquidityRemoved(address indexed provider, string token1, string token2, uint amount1, uint amount2);
    event FeeRecipientUpdated(address oldFeeRecipient, address newFeeRecipient);

    constructor(address _feeRecipient, address initialOwner) Ownable() ReentrancyGuard() {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        require(initialOwner != address(0), "Invalid initial owner");
        feeRecipient = _feeRecipient;
        _transferOwnership(initialOwner);
    }

    function addToken(string memory symbol, address tokenAddress, address priceFeed, uint8 decimals) external onlyOwner {
        require(tokenAddress != address(0), "Invalid token address");
        require(priceFeed != address(0), "Invalid price feed address");
        tokenAddresses[symbol] = tokenAddress;
        priceFeeds[symbol] = AggregatorV3Interface(priceFeed);
        tokenDecimals[symbol] = decimals;
        emit TokenAdded(symbol, tokenAddress, decimals);
    }

    function removeToken(string memory symbol) external onlyOwner {
        require(tokenAddresses[symbol] != address(0), "Token not registered");
        delete tokenAddresses[symbol];
        delete priceFeeds[symbol];
        delete tokenDecimals[symbol];
        emit TokenRemoved(symbol);
    }

    function setFee(uint16 _fee) external onlyOwner {
        require(_fee <= 1000, "Fee too high"); // 1000 basis points = 10%
        emit FeeUpdated(fee, _fee);
        fee = _fee;
    }

    function setFeeRecipient(address _newFeeRecipient) external onlyOwner {
        require(_newFeeRecipient != address(0), "Invalid fee recipient");
        emit FeeRecipientUpdated(feeRecipient, _newFeeRecipient);
        feeRecipient = _newFeeRecipient;
    }

    function addLiquidity(string memory token1, string memory token2, uint amount1, uint amount2) public nonReentrant {
        require(tokenAddresses[token1] != address(0), "Invalid token1 address");
        require(tokenAddresses[token2] != address(0), "Invalid token2 address");

        bytes32 pairId = _getPairId(token1, token2);
        Pair storage pair = pairs[pairId];

        uint adjustedAmount1 = _adjustAmount(amount1, tokenDecimals[token1]);
        uint adjustedAmount2 = _adjustAmount(amount2, tokenDecimals[token2]);

        IERC20(tokenAddresses[token1]).transferFrom(msg.sender, address(this), amount1);
        IERC20(tokenAddresses[token2]).transferFrom(msg.sender, address(this), amount2);

        pair.reserve1 += adjustedAmount1;
        pair.reserve2 += adjustedAmount2;

        emit LiquidityAdded(msg.sender, token1, token2, amount1, amount2);
    }

    function removeLiquidity(string memory token1, string memory token2, uint liquidityAmount) public nonReentrant {
        bytes32 pairId = _getPairId(token1, token2);
        Pair storage pair = pairs[pairId];

        uint share = (liquidityAmount * 1e18) / (pair.reserve1 + pair.reserve2);
        uint amount1 = (share * pair.reserve1) / 1e18 / (10 ** (18 - tokenDecimals[token1]));
        uint amount2 = (share * pair.reserve2) / 1e18 / (10 ** (18 - tokenDecimals[token2]));

        require(amount1 <= pair.reserve1 && amount2 <= pair.reserve2, "Insufficient liquidity");

        pair.reserve1 -= _adjustAmount(amount1, tokenDecimals[token1]);
        pair.reserve2 -= _adjustAmount(amount2, tokenDecimals[token2]);

        IERC20(tokenAddresses[token1]).transfer(msg.sender, amount1);
        IERC20(tokenAddresses[token2]).transfer(msg.sender, amount2);

        emit LiquidityRemoved(msg.sender, token1, token2, amount1, amount2);
    }

    function _adjustAmount(uint amount, uint8 decimals) internal pure returns (uint) {
        return amount * (10 ** (18 - decimals));
    }

    function _getPairId(string memory token1, string memory token2) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(token1, token2));
    }

    function estimateOutput(
    string memory tokenIn,
    string memory tokenOut,
    uint amountIn
) public view returns (uint amountOut) {
    bytes32 pairKey = _getPairId(tokenIn, tokenOut);
    Pair storage pair = pairs[pairKey];
    require(pair.reserve1 > 0 && pair.reserve2 > 0, "No liquidity");
    return _getAmountOut(amountIn, pair.reserve1, pair.reserve2);
}

function _getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) internal pure returns (uint) {
    uint amountInWithFee = amountIn * 997; // Assuming 0.3% fee
    uint numerator = amountInWithFee * reserveOut;
    uint denominator = reserveIn * 1000 + amountInWithFee;
    return numerator / denominator;
}

function swap(
    string memory tokenIn,
    string memory tokenOut,
    uint amountIn,
    uint minAmountOut
) public nonReentrant {
    // Ensure valid tokens
    require(tokenAddresses[tokenIn] != address(0), "Invalid input token");
    require(tokenAddresses[tokenOut] != address(0), "Invalid output token");
    require(amountIn > 0, "Amount must be greater than 0");

    // Fetch reserves
    bytes32 pairKey = _getPairId(tokenIn, tokenOut);
    Pair storage pair = pairs[pairKey];
    require(pair.reserve1 > 0 && pair.reserve2 > 0, "No liquidity");

    // Calculate the fee and net input amount
    uint feeAmount = (amountIn * fee) / 10000; // Fee in basis points (e.g., 30 = 0.3%)
    uint netAmountIn = amountIn - feeAmount;   // Net amount after fee deduction

    // Calculate the output amount based on the net input amount
    uint amountOut = _getAmountOut(netAmountIn, pair.reserve1, pair.reserve2);
    require(amountOut >= minAmountOut, "Insufficient output amount");

    // Slippage tolerance check (optional, useful if not using minAmountOut)
    uint slippage = ((amountOut - minAmountOut) * 100) / minAmountOut;
    require(slippage <= 10, "Slippage exceeds tolerance"); // 10% max slippage

    // Transfer the input token from the user
    IERC20(tokenAddresses[tokenIn]).transferFrom(msg.sender, address(this), amountIn);

    // Transfer the fee to the Treasury
    IERC20(tokenAddresses[tokenIn]).approve(address(treasury), feeAmount);
    Treasury(treasury).deposit(tokenAddresses[tokenIn], feeAmount);

    // Transfer the output token to the user
    IERC20(tokenAddresses[tokenOut]).transfer(msg.sender, amountOut);

    // Update reserves
    pair.reserve1 += netAmountIn; // Add net input amount to reserve
    pair.reserve2 -= amountOut;   // Subtract output amount from reserve

    // Emit event
    emit Swap(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
}



function setPriceFeed(string memory symbol, address priceFeed) external onlyOwner {
    require(tokenAddresses[symbol] != address(0), "Token not registered");
    require(priceFeed != address(0), "Invalid price feed address");
    priceFeeds[symbol] = AggregatorV3Interface(priceFeed);
}

function getPrice(string memory symbol) public view returns (int256) {
    require(address(priceFeeds[symbol]) != address(0), "Price feed not set");
    (, int256 price, , , ) = priceFeeds[symbol].latestRoundData();
    return price;
}
function getRequiredLiquidityAmount(
    string memory token1,
    string memory token2,
    uint amount1
) public view returns (uint amount2) {
    int256 price1 = getPrice(token1);
    int256 price2 = getPrice(token2);
    require(price1 > 0 && price2 > 0, "Invalid prices");
    return (amount1 * uint(price1)) / uint(price2);
}
function removePriceFeed(string memory symbol) external onlyOwner {
    require(address(priceFeeds[symbol]) != address(0), "Price feed not set");
    delete priceFeeds[symbol];
}

event PriceFeedUpdated(string indexed symbol, address oldFeed, address newFeed);
emit PriceFeedUpdated(symbol, address(priceFeeds[symbol]), priceFeed);



}
