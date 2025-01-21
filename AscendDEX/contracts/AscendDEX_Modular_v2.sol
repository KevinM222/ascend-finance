// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract ModularDEX is Ownable, ReentrancyGuard {
    struct Pair {
        uint reserve1; // Reserve for token1
        uint reserve2; // Reserve for token2
    }

    // Error declarations
    error InvalidTokenAddress;
    error TokenNotRegistered;
    error InsufficientLiquidity;
    error InsufficientOutputAmount;
    error FeeTooHigh;

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
        if(tokenAddress == address(0) || priceFeed == address(0)) revert InvalidTokenAddress;
        tokenAddresses[symbol] = tokenAddress;
        priceFeeds[symbol] = AggregatorV3Interface(priceFeed);
        tokenDecimals[symbol] = decimals;
        emit TokenAdded(symbol, tokenAddress, decimals);
    }

    function removeToken(string memory symbol) external onlyOwner {
        if(tokenAddresses[symbol] == address(0)) revert TokenNotRegistered;
        delete tokenAddresses[symbol];
        delete priceFeeds[symbol];
        delete tokenDecimals[symbol]; // Remove decimals mapping
        emit TokenRemoved(symbol);
    }

    function setFee(uint16 _fee) external onlyOwner {
        if(_fee > 1000) revert FeeTooHigh; // 1000 basis points = 10%
        emit FeeUpdated(fee, _fee);
        fee = _fee;
    }

    function setFeeRecipient(address _newFeeRecipient) external onlyOwner {
        require(_newFeeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _newFeeRecipient;
        emit FeeRecipientUpdated(feeRecipient, _newFeeRecipient);
    }

    function addLiquidity(string memory token1, string memory token2, uint amount1, uint amount2) public nonReentrant {
        if(tokenAddresses[token1] == address(0) || tokenAddresses[token2] == address(0)) revert InvalidTokenAddress;

        bytes32 pairId = _getPairId(token1, token2);
        Pair storage pair = pairs[pairId];

        // Normalize amounts to 18 decimals for consistency
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

        uint share = liquidityAmount * 1e18 / (pair.reserve1 + pair.reserve2);
        uint amount1 = share * pair.reserve1 / 1e18 / (10 ** (18 - tokenDecimals[token1])); // Denormalize
        uint amount2 = share * pair.reserve2 / 1e18 / (10 ** (18 - tokenDecimals[token2])); // Denormalize
        if (amount1 > pair.reserve1 || amount2 > pair.reserve2) revert InsufficientLiquidity;

        pair.reserve1 -= _adjustAmount(amount1, tokenDecimals[token1]);
        pair.reserve2 -= _adjustAmount(amount2, tokenDecimals[token2]);

        IERC20(tokenAddresses[token1]).transfer(msg.sender, amount1);
        IERC20(tokenAddresses[token2]).transfer(msg.sender, amount2);

        emit LiquidityRemoved(msg.sender, token1, token2, amount1, amount2);
    }

    function swap(
        string memory tokenIn,
        string memory tokenOut,
        uint amountIn,
        uint amountOutMin
    ) public nonReentrant {
        if(tokenAddresses[tokenIn] == address(0) || tokenAddresses[tokenOut] == address(0)) revert InvalidTokenAddress;
        if(keccak256(bytes(tokenIn)) == keccak256(bytes(tokenOut))) revert("Tokens must be different");

        bytes32 pairId = _getPairId(tokenIn, tokenOut);
        Pair storage pair = pairs[pairId];

        uint reserveIn = tokenIn < tokenOut ? pair.reserve1 : pair.reserve2;
        uint reserveOut = tokenIn < tokenOut ? pair.reserve2 : pair.reserve1;

        uint amountOut = _getAmountOut(amountIn, reserveIn, reserveOut, tokenDecimals[tokenIn], tokenDecimals[tokenOut]);
        uint feeAmount = amountOut * fee / 10000; // 10000 basis points = 100%
        uint amountOutAfterFee = amountOut - feeAmount;

        if(amountOutAfterFee < amountOutMin) revert InsufficientOutputAmount;

        // Effect
        if (tokenIn < tokenOut) {
            pair.reserve1 += _adjustAmount(amountIn, tokenDecimals[tokenIn]);
            pair.reserve2 -= amountOut;
        } else {
            pair.reserve1 -= amountOut;
            pair.reserve2 += _adjustAmount(amountIn, tokenDecimals[tokenIn]);
        }

        // Interaction
        IERC20(tokenAddresses[tokenIn]).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenAddresses[tokenOut]).transfer(msg.sender, amountOutAfterFee);
        IERC20(tokenAddresses[tokenOut]).transfer(feeRecipient, feeAmount);

        emit Swap(msg.sender, tokenIn, tokenOut, amountIn, amountOutAfterFee / (10 ** (18 - tokenDecimals[tokenOut])));
    }

    function _getAmountOut(uint amountIn, uint reserveIn, uint reserveOut, uint8 decimalsIn, uint8 decimalsOut) internal pure returns (uint) {
        if(reserveIn == 0 || reserveOut == 0) revert InsufficientLiquidity;
        uint adjustedAmountIn = _adjustAmount(amountIn, decimalsIn);
        uint adjustedReserveIn = _adjustAmount(reserveIn, decimalsIn); // Normalize for calculation
        uint adjustedReserveOut = _adjustAmount(reserveOut, decimalsOut); // Normalize for calculation
        
        uint numerator = adjustedAmountIn * adjustedReserveOut;
        uint denominator = adjustedReserveIn + adjustedAmountIn;
        return numerator / denominator;
    }

    function _adjustAmount(uint amount, uint8 decimals) internal pure returns (uint) {
        require(decimals <= 18, "Decimals greater than 18 not supported");
        return amount * (10 ** (18 - decimals));
    }

    function getPrice(string memory symbol) public view returns (int) {
        AggregatorV3Interface priceFeed = priceFeeds[symbol];
        if(address(priceFeed) == address(0)) revert TokenNotRegistered;
        (, int price,,,) = priceFeed.latestRoundData();
        return price;
    }

    function _getPairId(string memory token1, string memory token2) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(token1 < token2 ? token1 : token2, token1 < token2 ? token2 : token1));
    }
}