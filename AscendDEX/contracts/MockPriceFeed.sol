// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/AggregatorV3Interface.sol";

contract MockPriceFeed is AggregatorV3Interface {
    uint8 private _decimals;
    string private _description;
    uint256 private _version;
    int256 private _price;

    constructor(uint8 decimals_, string memory description_, uint256 version_, int256 initialPrice) {
        _decimals = decimals_;
        _description = description_;
        _version = version_;
        _price = initialPrice;
    }

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function description() external view override returns (string memory) {
        return _description;
    }

    function version() external view override returns (uint256) {
        return _version;
    }

    function getRoundData(uint80 /*_roundId*/)
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (0, _price, block.timestamp, block.timestamp, 0);
    }

    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (0, _price, block.timestamp, block.timestamp, 0);
    }

    function setPrice(int256 newPrice) external {
        _price = newPrice;
    }
}
