// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Treasury is Ownable {
    event Deposited(address indexed token, uint amount);
    event Withdrawn(address indexed token, address to, uint amount);

    function deposit(address token, uint amount) public {
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit Deposited(token, amount);
    }

    function withdraw(address token, address to, uint amount) public onlyOwner {
        require(IERC20(token).transfer(to, amount), "Transfer failed");
        emit Withdrawn(token, to, amount);
    }

    // Additional functions for governance or yield farming can be added here
}