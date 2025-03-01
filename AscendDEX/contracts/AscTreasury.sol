// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AscTreasury {
    address public owner = 0x274af9bd0fEe424e2cd0Fed72cc3f2cA49B751F1;
    IERC20 public usdc;     // 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
    IERC20 public wpol;     // WPOL: 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270
    uint256 public constant STAKE_AMOUNT = 100 ether; // 100 POL
    uint256 public constant GAS_RESERVE = 2 ether;    // 2 POL
    
    // Stake POL when balance hits 102 POL
    function autoStake() external {
        uint256 balance = address(this).balance;
        if (balance >= STAKE_AMOUNT + GAS_RESERVE) {
            uint256 stakeable = (balance - GAS_RESERVE) / STAKE_AMOUNT * STAKE_AMOUNT;
            // TODO: Call Polygon staking contract (e.g., delegate to validator)
            // For now, simulate staking by holding POL
            payable(address(this)).transfer(stakeable); // Placeholder
        }
    }
    
    // Convert POL to WPOL for DeFi
    function wrapPol(uint256 amount) external {
        require(msg.sender == owner, "Only owner");
        require(address(this).balance >= amount + GAS_RESERVE, "Insufficient POL");
        wpol.deposit{value: amount}(); // Wraps POL to WPOL
    }
    
    // Withdraw USDC or WPOL if needed
    function withdrawUsdc(uint256 amount) external {
        require(msg.sender == owner, "Only owner");
        require(usdc.transfer(owner, amount), "USDC withdraw failed");
    }
    
    function withdrawWpol(uint256 amount) external {
        require(msg.sender == owner, "Only owner");
        require(wpol.transfer(owner, amount), "WPOL withdraw failed");
    }
    
    // Receive POL from sale contract
    receive() external payable {}
}
