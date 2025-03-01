// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IWPOL is IERC20 {
    function deposit() external payable;
}

contract AscTreasury {
    address public owner = 0x274af9bd0fEe424e2cd0Fed72cc3f2cA49B751F1;
    IERC20 public usdc;
    IWPOL public wpol; // Your POL mock on Sepolia
    uint256 public constant STAKE_AMOUNT = 100 ether;
    uint256 public constant GAS_RESERVE = 2 ether;
    uint256 public stakedAmount;
    
    constructor(address _usdc, address _wpol) {
        usdc = IERC20(_usdc);
        wpol = IWPOL(_wpol);
    }
    
    function autoStake() external {
        uint256 balance = address(this).balance;
        if (balance >= STAKE_AMOUNT + GAS_RESERVE) {
            uint256 stakeable = (balance - GAS_RESERVE) / STAKE_AMOUNT * STAKE_AMOUNT;
            stakedAmount += stakeable;
            (bool sent, ) = address(0xdeAD00000000000000000000000000000000dEAd).call{value: stakeable}("");
            require(sent, "Stake transfer failed");
        }
    }
    
    function wrapPol(uint256 amount) external {
        require(msg.sender == owner, "Only owner");
        require(address(this).balance >= amount + GAS_RESERVE, "Insufficient POL");
        wpol.deposit{value: amount}();
    }
    
    function withdrawUsdc(uint256 amount) external {
        require(msg.sender == owner, "Only owner");
        require(usdc.transfer(owner, amount), "USDC withdraw failed");
    }
    
    function withdrawWpol(uint256 amount) external {
        require(msg.sender == owner, "Only owner");
        require(wpol.transfer(owner, amount), "WPOL withdraw failed");
    }
    
    receive() external payable {}
}