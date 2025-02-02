// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AscRewards is Ownable {
    IERC20 public ascToken;
    uint256 public rewardPool; // Pre-allocated reward pool in ASC (18 decimals)

    // Mapping to track accrued rewards per user
    mapping(address => uint256) public rewardBalances;

    event RewardsAllocated(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardPoolToppedUp(uint256 amount);

    /**
     * @dev Constructor sets the ASC token address and initial reward pool.
     * @param _ascToken The ASC token contract.
     * @param _rewardPool The amount of ASC pre-allocated for rewards.
     */
    constructor(IERC20 _ascToken, uint256 _rewardPool) {
        require(address(_ascToken) != address(0), "Invalid token address");
        ascToken = _ascToken;
        rewardPool = _rewardPool;
        // The owner must transfer _rewardPool ASC tokens into this contract after deployment.
    }

    /**
     * @dev Allocate rewards to a liquidity provider. Only callable by the owner (or a designated contract).
     * @param user The address of the liquidity provider.
     * @param amount The reward amount to credit (in ASC with 18 decimals).
     */
    function allocateRewards(address user, uint256 amount) external onlyOwner {
        require(amount <= rewardPool, "Not enough reward pool");
        rewardBalances[user] += amount;
        rewardPool -= amount;
        emit RewardsAllocated(user, amount);
    }

    /**
     * @dev Allows a user to claim their accrued ASC rewards.
     */
    function claimRewards() external {
        uint256 reward = rewardBalances[msg.sender];
        require(reward > 0, "No rewards to claim");
        rewardBalances[msg.sender] = 0;
        require(ascToken.transfer(msg.sender, reward), "Transfer failed");
        emit RewardsClaimed(msg.sender, reward);
    }

    /**
     * @dev Optional function to top up the reward pool.
     * The owner can call this function after transferring additional ASC tokens to the contract.
     * @param amount The amount to add to the reward pool.
     */
    function topUpRewardPool(uint256 amount) external onlyOwner {
        rewardPool += amount;
        emit RewardPoolToppedUp(amount);
    }
}
