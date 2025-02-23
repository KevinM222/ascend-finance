// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AscStaking is Ownable {
    IERC20 public stakingToken;

    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint256 lockPeriod;
        uint256 apy;
        uint256 rewardsClaimed;
        uint256 pendingReinvestRewards;
    }

    mapping(address => Stake[]) public userStakes;
    mapping(address => mapping(uint256 => bool)) public autoReinvestStatus;
    uint256 public totalStaked;

    event Staked(address indexed user, uint256 amount, uint256 lockPeriod, uint256 apy, uint256 index);
    event Unstaked(address indexed user, uint256 amount, uint256 index);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardsReinvested(address indexed user, uint256 amount, uint256 index);
    event AutoReinvestSet(address indexed user, uint256 index, bool status);

    constructor(address _stakingToken) {
        stakingToken = IERC20(_stakingToken);
    }

    function stakeWithAutoApproval(uint256 amount, uint256 lockPeriodSeconds) external {
        require(amount > 0, "Amount must be greater than 0");
        uint256 apy = getAPY(lockPeriodSeconds);
        require(apy > 0, "Invalid lock period");

        require(stakingToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        userStakes[msg.sender].push(Stake({
            amount: amount,
            startTime: block.timestamp,
            lockPeriod: lockPeriodSeconds == 0 ? 0 : block.timestamp + lockPeriodSeconds,
            apy: apy,
            rewardsClaimed: 0,
            pendingReinvestRewards: 0
        }));

        totalStaked += amount;
        emit Staked(msg.sender, amount, lockPeriodSeconds, apy, userStakes[msg.sender].length - 1);
    }

    function unstake(uint256 index) external {
        Stake storage stake = userStakes[msg.sender][index];
        require(stake.amount > 0, "No stake at this index");
        require(stake.lockPeriod == 0 || block.timestamp >= stake.lockPeriod, "Stake is still locked");

        uint256 rewards = calculateStakeRewards(msg.sender, index);
        uint256 totalAmount = stake.amount + rewards;

        totalStaked -= stake.amount;
        delete userStakes[msg.sender][index];
        require(stakingToken.transfer(msg.sender, totalAmount), "Transfer failed");

        emit Unstaked(msg.sender, totalAmount, index);
    }

    function claimRewards() external {
        uint256 totalRewards = 0;
        for (uint256 i = 0; i < userStakes[msg.sender].length; i++) {
            Stake storage stake = userStakes[msg.sender][i];
            uint256 rewards = calculateStakeRewards(msg.sender, i);
            if (rewards > stake.rewardsClaimed) {
                uint256 claimable = rewards - stake.rewardsClaimed;
                stake.rewardsClaimed = rewards;
                if (autoReinvestStatus[msg.sender][i]) {
                    stake.amount += claimable;
                    stake.pendingReinvestRewards = 0; // Clear pending on reinvest
                    totalStaked += claimable;
                    emit RewardsReinvested(msg.sender, claimable, i);
                } else {
                    stake.pendingReinvestRewards += claimable;
                    totalRewards += claimable;
                }
            }
        }
        require(totalRewards > 0 || userStakes[msg.sender].length > 0, "No rewards to process");
    }

    function reinvestRewards(uint256 index) external {
        Stake storage stake = userStakes[msg.sender][index];
        require(stake.amount > 0, "No stake at this index");
        uint256 pending = stake.pendingReinvestRewards;
        require(pending > 0, "No rewards to reinvest");

        stake.amount += pending;
        stake.pendingReinvestRewards = 0;
        totalStaked += pending;
        emit RewardsReinvested(msg.sender, pending, index);
    }

    function claimOnlyRewards() external {
        uint256 totalRewards = 0;
        for (uint256 i = 0; i < userStakes[msg.sender].length; i++) {
            Stake storage stake = userStakes[msg.sender][i];
            if (stake.pendingReinvestRewards > 0) {
                totalRewards += stake.pendingReinvestRewards;
                stake.pendingReinvestRewards = 0;
            }
        }
        require(totalRewards > 0, "No rewards to claim");
        require(stakingToken.transfer(msg.sender, totalRewards), "Transfer failed");
        emit RewardsClaimed(msg.sender, totalRewards);
    }

    function setAutoReinvest(uint256 index, bool status) external {
        require(index < userStakes[msg.sender].length, "Invalid index");
        autoReinvestStatus[msg.sender][index] = status;
        emit AutoReinvestSet(msg.sender, index, status);
    }

    function calculateRewards(address user) external view returns (uint256) {
        uint256 totalRewards = 0;
        for (uint256 i = 0; i < userStakes[user].length; i++) {
            totalRewards += calculateStakeRewards(user, i) - userStakes[user][i].rewardsClaimed + userStakes[user][i].pendingReinvestRewards;
        }
        return totalRewards;
    }

    function calculateStakeRewards(address user, uint256 index) internal view returns (uint256) {
        Stake memory stake = userStakes[user][index];
        uint256 endTime = stake.lockPeriod == 0 || block.timestamp < stake.lockPeriod ? block.timestamp : stake.lockPeriod;
        return (stake.amount * stake.apy * (endTime - stake.startTime)) / (100 * 365 days);
    }

    function getAPY(uint256 lockPeriodSeconds) internal pure returns (uint256) {
        if (lockPeriodSeconds == 0) return 2;
        if (lockPeriodSeconds == 30 days) return 5;
        if (lockPeriodSeconds == 90 days) return 8;
        if (lockPeriodSeconds == 180 days) return 12;
        if (lockPeriodSeconds == 365 days) return 16;
        if (lockPeriodSeconds == 730 days) return 20;
        return 0;
    }

    function getAllUserStakes(address user) external view returns (Stake[] memory) {
        return userStakes[user];
    }
}