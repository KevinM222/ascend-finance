// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AscStaking is Ownable {
    IERC20 public ascToken;
    uint256 public reinvestThreshold = 10 ether;
    uint256 public rewardPool;
    uint256 public totalStaked;

    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint256 lockUntil;
        uint16 apy;
        uint256 rewardsClaimed;
    }

    mapping(address => Stake[]) public userStakes;
    mapping(address => mapping(uint256 => bool)) public autoReinvestStatus;
    mapping(address => uint256) public idleRewards;
    mapping(address => uint256) public rewardsClaimed;

    event AscStaked(address indexed user, uint256 amount, uint256 lockUntil, uint16 apy);
    event AscUnstaked(address indexed user, uint256 amount, uint256 rewards);
    event RewardsClaimed(address indexed user, uint256 reward);
    event RewardsReinvested(address indexed user, uint256 reinvestedReward, uint256 stakeIndex);
    event AutoReinvestToggled(address indexed user, bool enabled, uint256 stakeIndex);

    constructor(IERC20 _ascToken, uint256 _rewardPool) {
        require(address(_ascToken) != address(0), "Invalid token address");
        ascToken = _ascToken;
        rewardPool = _rewardPool;
    }

    function setAutoReinvest(uint256 _index, bool _enabled) external {
        require(_index < userStakes[msg.sender].length, "Invalid stake index");
        autoReinvestStatus[msg.sender][_index] = _enabled;
        emit AutoReinvestToggled(msg.sender, _enabled, _index);
    }

    function getAPY(uint256 duration) public pure returns (uint16) {
        if (duration >= 730 days) return 20;
        if (duration >= 365 days) return 16;
        if (duration >= 180 days) return 12;
        if (duration >= 90 days) return 8;
        if (duration >= 30 days) return 5;
        return 2;
    }

    function stakeWithAutoApproval(uint256 amount, uint256 duration) external {
        require(amount > 0, "Cannot stake zero amount");
        require(ascToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        userStakes[msg.sender].push(Stake({
            amount: amount,
            startTime: block.timestamp,
            lockUntil: block.timestamp + duration,
            apy: getAPY(duration),
            rewardsClaimed: 0
        }));

        totalStaked += amount;
        emit AscStaked(msg.sender, amount, block.timestamp + duration, getAPY(duration));
    }

    function calculateRewards(address user) public view returns (uint256 totalRewards) {
        for (uint256 i = 0; i < userStakes[user].length; i++) {
            Stake storage stake = userStakes[user][i];
            uint256 stakingTime = block.timestamp > stake.lockUntil 
                ? (stake.lockUntil - stake.startTime) 
                : (block.timestamp - stake.startTime);
            uint256 rewards = (stake.amount * stake.apy * stakingTime) / (100 * 365 days);
            if (rewards > stake.rewardsClaimed) {
                totalRewards += rewards - stake.rewardsClaimed;
            }
        }
        return totalRewards;
    }

    function claimRewards() external {
        uint256 totalTransfer = 0;
        uint256 totalReinvested = 0;

        for (uint256 i = 0; i < userStakes[msg.sender].length; i++) {
            Stake storage stake = userStakes[msg.sender][i];
            uint256 rewards = (stake.amount * stake.apy * (block.timestamp - stake.startTime)) / (100 * 365 days);
            if (rewards > stake.rewardsClaimed) {
                uint256 claimable = rewards - stake.rewardsClaimed;
                stake.rewardsClaimed = rewards; // Mark rewards as claimed

                if (autoReinvestStatus[msg.sender][i]) {
                    stake.amount += claimable; // Reinvest into this specific stake
                    totalStaked += claimable;
                    totalReinvested += claimable;
                    emit RewardsReinvested(msg.sender, claimable, i);
                } else {
                    idleRewards[msg.sender] += claimable; // Queue for manual withdrawal
                    totalTransfer += claimable;
                }
            }
        }

        require(totalTransfer > 0 || totalReinvested > 0, "No rewards available");
        if (totalTransfer > 0) {
            require(ascToken.balanceOf(address(this)) >= totalTransfer, "Insufficient reward pool");
            require(ascToken.transfer(msg.sender, totalTransfer), "Transfer failed");
            rewardsClaimed[msg.sender] += totalTransfer;
            emit RewardsClaimed(msg.sender, totalTransfer);
        }
    }

    function reinvestRewards() external {
        uint256 totalRewards = calculateRewards(msg.sender);
        require(totalRewards >= reinvestThreshold, "Not enough rewards to reinvest");

        uint256 highestYieldIndex = 0;
        uint16 highestAPY = 0;

        for (uint256 i = 0; i < userStakes[msg.sender].length; i++) {
            Stake storage stake = userStakes[msg.sender][i];
            uint256 rewards = (stake.amount * stake.apy * (block.timestamp - stake.startTime)) / (100 * 365 days);
            stake.rewardsClaimed = rewards; // Update claimed rewards
            if (stake.apy > highestAPY) {
                highestAPY = stake.apy;
                highestYieldIndex = i;
            }
        }

        userStakes[msg.sender][highestYieldIndex].amount += totalRewards;
        totalStaked += totalRewards;
        emit RewardsReinvested(msg.sender, totalRewards, highestYieldIndex);
    }

    function withdrawIdleRewards() external {
        uint256 rewardAmount = idleRewards[msg.sender];
        require(rewardAmount > 0, "No idle rewards");
        require(ascToken.balanceOf(address(this)) >= rewardAmount, "Insufficient pool balance");

        idleRewards[msg.sender] = 0;
        require(ascToken.transfer(msg.sender, rewardAmount), "Transfer failed");

        rewardsClaimed[msg.sender] += rewardAmount;
        emit RewardsClaimed(msg.sender, rewardAmount);
    }

    function getTotalStaked(address user) public view returns (uint256 total) {
        for (uint256 i = 0; i < userStakes[user].length; i++) {
            total += userStakes[user][i].amount;
        }
        return total;
    }

    function getAllUserStakes(address user) external view returns (
        uint256[] memory amounts,
        uint256[] memory startTimes,
        uint256[] memory lockPeriods,
        uint256[] memory apys,
        uint256[] memory claimedRewards
    ) {
        uint256 stakeCount = userStakes[user].length;
        amounts = new uint256[](stakeCount);
        startTimes = new uint256[](stakeCount);
        lockPeriods = new uint256[](stakeCount);
        apys = new uint256[](stakeCount);
        claimedRewards = new uint256[](stakeCount);

        for (uint256 i = 0; i < stakeCount; i++) {
            Stake storage stake = userStakes[user][i];
            amounts[i] = stake.amount;
            startTimes[i] = stake.startTime;
            lockPeriods[i] = stake.lockUntil;
            apys[i] = stake.apy;
            claimedRewards[i] = stake.rewardsClaimed;
        }

        return (amounts, startTimes, lockPeriods, apys, claimedRewards);
    }

    function unstake(uint256 index) external {
        require(index < userStakes[msg.sender].length, "Invalid stake index");
        Stake storage stake = userStakes[msg.sender][index];
        require(block.timestamp >= stake.lockUntil, "Stake is still locked");

        uint256 stakedAmount = stake.amount;
        uint256 rewards = (stake.amount * stake.apy * (block.timestamp - stake.startTime)) / (100 * 365 days);
        uint256 unclaimedRewards = rewards > stake.rewardsClaimed ? rewards - stake.rewardsClaimed : 0;

        totalStaked -= stakedAmount;
        userStakes[msg.sender][index] = userStakes[msg.sender][userStakes[msg.sender].length - 1];
        userStakes[msg.sender].pop();

        uint256 totalWithdraw = stakedAmount + unclaimedRewards;
        require(ascToken.balanceOf(address(this)) >= totalWithdraw, "Insufficient pool balance");
        require(ascToken.transfer(msg.sender, totalWithdraw), "Transfer failed");

        rewardsClaimed[msg.sender] += unclaimedRewards;
        idleRewards[msg.sender] = 0;

        emit AscUnstaked(msg.sender, stakedAmount, unclaimedRewards);
    }
}