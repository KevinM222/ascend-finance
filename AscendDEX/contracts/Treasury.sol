// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Treasury is Ownable {
    event Deposited(address indexed token, uint amount);
    event Withdrawn(address indexed token, address to, uint amount);

    /**
     * @dev Deposit tokens into the treasury.
     * @param token The ERC20 token address.
     * @param amount The amount of tokens to deposit.
     */
    function deposit(address token, uint amount) public {
        require(token != address(0), "Invalid token address");
        require(amount > 0, "Amount must be greater than zero");
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit Deposited(token, amount);
    }

    /**
     * @dev Withdraw tokens from the treasury.
     * @param token The ERC20 token address.
     * @param to The recipient address.
     * @param amount The amount of tokens to withdraw.
     */
    function withdraw(address token, address to, uint amount) public onlyOwner {
        require(token != address(0), "Invalid token address");
        require(to != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than zero");
        require(IERC20(token).balanceOf(address(this)) >= amount, "Insufficient balance");
        require(IERC20(token).transfer(to, amount), "Transfer failed");
        emit Withdrawn(token, to, amount);
    }

    // Additional functions for governance or yield farming can be added here
}
