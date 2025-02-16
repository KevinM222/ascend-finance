// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AscStaking is Ownable {
    IERC20 public ascToken;
    uint256 public rewardPool;
    uint256 public totalStaked;

    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint256 lockUntil;
        uint16 apy;
        uint256 rewardsClaimed;  // ✅ Track claimed rewards
    }

    mapping(address => Stake[]) public userStakes;

    event AscStaked(address indexed user, uint256 amount, uint256 lockUntil, uint16 apy);
    event AscUnstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 reward);
    event RewardsReinvested(address indexed user, uint256 reinvestedReward);

    constructor(IERC20 _ascToken, uint256 _rewardPool) {
        require(address(_ascToken) != address(0), "Invalid token address");
        ascToken = _ascToken;
        rewardPool = _rewardPool;
    }

    function stakeWithAutoApproval(uint256 amount, uint256 duration) external {
        require(amount > 0, "Cannot stake zero amount");

        ascToken.transferFrom(msg.sender, address(this), amount);
        userStakes[msg.sender].push(Stake({
            amount: amount,
            startTime: block.timestamp,
            lockUntil: block.timestamp + duration,
            apy: getAPY(duration),
            rewardsClaimed: 0
        }));

        emit AscStaked(msg.sender, amount, block.timestamp + duration, getAPY(duration));
    }

    /// ✅ **Calculate Rewards Without Claiming**
    function calculateRewards(address user) public view returns (uint256 totalRewards) {
        for (uint256 i = 0; i < userStakes[user].length; i++) {
            Stake storage stake = userStakes[user][i];

            uint256 stakingTime = block.timestamp > stake.lockUntil ? 
                (stake.lockUntil - stake.startTime) : 
                (block.timestamp - stake.startTime);

            uint256 rewards = (stake.amount * stake.apy * stakingTime) / (365 days * 100);
            totalRewards += rewards - stake.rewardsClaimed;
        }
    }

    /// ✅ **Claim Rewards Without Unstaking**
    function claimRewards() external {
        uint256 totalRewards = calculateRewards(msg.sender);
        require(totalRewards > 0, "No rewards available");

        for (uint256 i = 0; i < userStakes[msg.sender].length; i++) {
            userStakes[msg.sender][i].rewardsClaimed += 
                (userStakes[msg.sender][i].amount * userStakes[msg.sender][i].apy * 
                (block.timestamp - userStakes[msg.sender][i].startTime)) / 
                (365 days * 100);
        }

        require(ascToken.balanceOf(address(this)) >= totalRewards, "Insufficient reward pool");
        ascToken.transfer(msg.sender, totalRewards);

        emit RewardsClaimed(msg.sender, totalRewards);
    }

    /// ✅ **Auto Reinvest Rewards**
    function reinvestRewards() external {
        uint256 totalRewards = calculateRewards(msg.sender);
        require(totalRewards > 0, "No rewards available");

        uint256 latestLockPeriod = 0;

        for (uint256 i = 0; i < userStakes[msg.sender].length; i++) {
            userStakes[msg.sender][i].rewardsClaimed += 
                (userStakes[msg.sender][i].amount * userStakes[msg.sender][i].apy * 
                (block.timestamp - userStakes[msg.sender][i].startTime)) / 
                (365 days * 100);

            if (userStakes[msg.sender][i].lockUntil > latestLockPeriod) {
                latestLockPeriod = userStakes[msg.sender][i].lockUntil;
            }
        }

        userStakes[msg.sender].push(Stake({
            amount: totalRewards,
            startTime: block.timestamp,
            lockUntil: latestLockPeriod,
            apy: getAPY(latestLockPeriod - block.timestamp),
            rewardsClaimed: 0
        }));

        emit RewardsReinvested(msg.sender, totalRewards);
    }

    function getTotalStaked(address user) public view returns (uint256 total) {
        for (uint256 i = 0; i < userStakes[user].length; i++) {
            total += userStakes[user][i].amount;
        }
    }

    /// ✅ **Unstake Without Affecting Rewards**
    function unstake(uint256 amount) external {
        uint256 totalStakedUser = getTotalStaked(msg.sender);
        require(totalStakedUser >= amount, "Insufficient staked amount");

        uint256 remainingToUnstake = amount;
        uint256 i = 0;

        while (i < userStakes[msg.sender].length && remainingToUnstake > 0) {
            Stake storage stake = userStakes[msg.sender][i];

            if (stake.amount == 0) {
                i++; // Skip empty stakes
                continue;
            }

            if (block.timestamp < stake.lockUntil) {
                i++; // Skip locked stakes
                continue;
            }

            uint256 toWithdraw = stake.amount > remainingToUnstake ? remainingToUnstake : stake.amount;
            stake.amount -= toWithdraw;
            remainingToUnstake -= toWithdraw;

            uint256 fee = toWithdraw / 100;
            uint256 withdrawable = toWithdraw - fee;

            ascToken.transfer(msg.sender, withdrawable);
            ascToken.transfer(owner(), fee);

            if (stake.amount == 0) {
                userStakes[msg.sender][i] = userStakes[msg.sender][userStakes[msg.sender].length - 1];
                userStakes[msg.sender].pop();
            } else {
                i++; // Move to next stake
            }
        }

        require(remainingToUnstake == 0, "Requested amount is still locked");
        emit AscUnstaked(msg.sender, amount);
    }

    function getAPY(uint256 duration) public pure returns (uint16) {
        if (duration >= 730 days) return 200;  // 20%
        if (duration >= 365 days) return 160;  // 16%
        if (duration >= 180 days) return 120;  // 12%
        if (duration >= 90 days) return 80;    // 8%
        if (duration >= 30 days) return 50;    // 5%
        return 20;  // Default 2%
    }
}
