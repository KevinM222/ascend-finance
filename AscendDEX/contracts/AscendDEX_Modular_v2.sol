// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract ModularDEX is Ownable {
    struct Pair {
        uint reserve1; // Reserve for token1
        uint reserve2; // Reserve for token2
    }

    uint public fee = 3; // Fee in basis points (0.3%)
    address public feeRecipient;
    mapping(string => address) public tokenAddresses; // Token registry
    mapping(string => AggregatorV3Interface) public priceFeeds; // Price feed registry
    mapping(bytes32 => Pair) public pairs; // Token pair reserves

    event TokenAdded(string indexed symbol, address tokenAddress);
    event TokenRemoved(string indexed symbol);
    event FeeUpdated(uint oldFee, uint newFee);
    event Swap(address indexed user, string tokenIn, string tokenOut, uint amountIn, uint amountOut);
    event LiquidityAdded(address indexed provider, string token1, string token2, uint amount1, uint amount2);

    constructor(address _feeRecipient, address initialOwner) Ownable(initialOwner) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        require(initialOwner != address(0), "Invalid initial owner");
        feeRecipient = _feeRecipient;
    }

    function addToken(string memory symbol, address tokenAddress, address priceFeed) external onlyOwner {
        require(tokenAddress != address(0), "Invalid token address");
        require(priceFeed != address(0), "Invalid price feed address");
        tokenAddresses[symbol] = tokenAddress;
        priceFeeds[symbol] = AggregatorV3Interface(priceFeed);
        emit TokenAdded(symbol, tokenAddress);
    }

    function removeToken(string memory symbol) external onlyOwner {
        require(tokenAddresses[symbol] != address(0), "Token not registered");
        delete tokenAddresses[symbol];
        delete priceFeeds[symbol];
        emit TokenRemoved(symbol);
    }

    function setFee(uint _fee) external onlyOwner {
        require(_fee <= 100, "Fee too high");
        emit FeeUpdated(fee, _fee);
        fee = _fee;
    }

    function addLiquidity(string memory token1, string memory token2, uint amount1, uint amount2) public {
        require(tokenAddresses[token1] != address(0) && tokenAddresses[token2] != address(0), "Invalid tokens");

        bytes32 pairId = keccak256(abi.encodePacked(token1, token2));
        Pair storage pair = pairs[pairId];

        IERC20(tokenAddresses[token1]).transferFrom(msg.sender, address(this), amount1);
        IERC20(tokenAddresses[token2]).transferFrom(msg.sender, address(this), amount2);

        pair.reserve1 += amount1;
        pair.reserve2 += amount2;

        emit LiquidityAdded(msg.sender, token1, token2, amount1, amount2);
    }

    function swap(
        string memory tokenIn,
        string memory tokenOut,
        uint amountIn,
        uint amountOutMin
    ) public {
        require(tokenAddresses[tokenIn] != address(0) && tokenAddresses[tokenOut] != address(0), "Invalid tokens");
        require(keccak256(bytes(tokenIn)) != keccak256(bytes(tokenOut)), "Tokens must be different");

        bytes32 pairId = keccak256(abi.encodePacked(tokenIn, tokenOut));
        Pair storage pair = pairs[pairId];

        uint reserveIn = pair.reserve1;
        uint reserveOut = pair.reserve2;

        uint amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
        uint feeAmount = (amountOut * fee) / 1000;
        amountOut -= feeAmount;

        require(amountOut >= amountOutMin, "Insufficient output amount");

        IERC20(tokenAddresses[tokenIn]).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenAddresses[tokenOut]).transfer(msg.sender, amountOut);
        IERC20(tokenAddresses[tokenOut]).transfer(feeRecipient, feeAmount);

        pair.reserve1 += amountIn;
        pair.reserve2 -= amountOut;

        emit Swap(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }

    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) public pure returns (uint) {
        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");
        uint numerator = amountIn * reserveOut;
        uint denominator = reserveIn + amountIn;
        return numerator / denominator;
    }

    function getPrice(string memory symbol) public view returns (int) {
        AggregatorV3Interface priceFeed = priceFeeds[symbol];
        require(address(priceFeed) != address(0), "Price feed not registered");
        (, int price,,,) = priceFeed.latestRoundData();
        return price;
    }
}
