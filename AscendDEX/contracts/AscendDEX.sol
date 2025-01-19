// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/AggregatorV3Interface.sol";

contract AscendDEX is Ownable {
    address public immutable token1;
    address public immutable token2_POL;
    address public immutable token2_USDC;

    struct Pair {
        uint reserve1; // Reserve for token1 (ASC)
        uint reserve2; // Reserve for token2 (POL or USDC)
    }

    mapping(address => Pair) public pairs;
    uint public fee = 3; // Fee in basis points (0.3%)

    AggregatorV3Interface internal immutable priceFeed_POL;
    AggregatorV3Interface internal immutable priceFeed_USDC;

    event FeeUpdated(uint oldFee, uint newFee);
    event LiquidityAdded(address indexed provider, address token2, uint amount1, uint amount2);
    event TokenSwapped(address indexed trader, address tokenIn, uint amountIn, address tokenOut, uint amountOut);

    constructor(
        address _token1,
        address _token2_POL,
        address _token2_USDC,
        address _priceFeed_POL,
        address _priceFeed_USDC,
        address initialOwner
    ) Ownable(initialOwner) {
        token1 = _token1;
        token2_POL = _token2_POL;
        token2_USDC = _token2_USDC;

        priceFeed_POL = AggregatorV3Interface(_priceFeed_POL);
        priceFeed_USDC = AggregatorV3Interface(_priceFeed_USDC);

        pairs[token2_POL] = Pair(0, 0);
        pairs[token2_USDC] = Pair(0, 0);
    }

    function setFee(uint _fee) external onlyOwner {
        require(_fee <= 100, "Fee too high");
        emit FeeUpdated(fee, _fee);
        fee = _fee;
    }

    function getPrice(address token) public view returns (int) {
        if (token == token2_POL) {
            (, int price,,,) = priceFeed_POL.latestRoundData();
            return price;
        } else if (token == token2_USDC) {
            (, int price,,,) = priceFeed_USDC.latestRoundData();
            return price;
        }
        return 0;
    }

    function addLiquidity(address token2, uint amount1, uint amount2) public {
        require(token2 == token2_POL || token2 == token2_USDC, "Invalid token pair");

        Pair storage pair = pairs[token2];

        IERC20(token1).transferFrom(msg.sender, address(this), amount1);
        IERC20(token2).transferFrom(msg.sender, address(this), amount2);

        pair.reserve1 += amount1;
        pair.reserve2 += amount2;

        emit LiquidityAdded(msg.sender, token2, amount1, amount2);
    }

    function swap(
    address tokenIn,
    uint amountIn,
    address tokenOut,
    uint amountOutMin
) public {
    require(tokenIn != tokenOut, "Tokens must be different");

    Pair storage pair = pairs[tokenIn == token1 ? tokenOut : tokenIn];
    uint reserveIn = tokenIn == token1 ? pair.reserve1 : pair.reserve2;
    uint reserveOut = tokenOut == token1 ? pair.reserve1 : pair.reserve2;

    // Debug: Log initial reserves and inputs
    console.log("Initial reserves: reserveIn = %s, reserveOut = %s", reserveIn, reserveOut);
    console.log("Input: amountIn = %s, tokenIn = %s, tokenOut = %s", amountIn, tokenIn, tokenOut);

    uint amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
    uint feeAmount = (amountOut * fee) / 1000;
    amountOut -= feeAmount;

    // Debug: Log calculated outputs
    console.log("Calculated amountOut = %s, feeAmount = %s", amountOut, feeAmount);

    require(amountOut >= amountOutMin, "Insufficient output amount");

    IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
    IERC20(tokenOut).transfer(msg.sender, amountOut);

    // Debug: Log reserves before updates
    console.log("Reserves before update: reserve1 = %s, reserve2 = %s", pair.reserve1, pair.reserve2);

    if (tokenIn == token1) {
        pair.reserve1 += amountIn;
        pair.reserve2 -= amountOut;
    } else {
        pair.reserve1 -= amountOut;
        pair.reserve2 += amountIn;
    }

    // Debug: Log reserves after updates
    console.log("Reserves after update: reserve1 = %s, reserve2 = %s", pair.reserve1, pair.reserve2);

    emit TokenSwapped(msg.sender, tokenIn, amountIn, tokenOut, amountOut);
}


    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) public pure returns (uint) {
        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");
        uint numerator = amountIn * reserveOut;
        uint denominator = reserveIn + amountIn;
        return numerator / denominator;
    }
}
