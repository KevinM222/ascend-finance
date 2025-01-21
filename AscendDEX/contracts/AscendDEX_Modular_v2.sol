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
}
