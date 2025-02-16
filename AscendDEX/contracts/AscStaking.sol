// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

uint256 public reinvestThreshold = 10 ether;
uint256 public rewardPool;
uint256 public totalStaked;


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
    mapping(address => bool) public autoReinvestEnabled;  // ✅ Auto reinvest toggle
    mapping(address => uint256) public idleRewards;  // ✅ Store unclaimed rewards

    event AscStaked(address indexed user, uint256 amount, uint256 lockUntil, uint16 apy);
    event AscUnstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 reward);
    event RewardsReinvested(address indexed user, uint256 reinvestedReward);
    event AutoReinvestToggled(address indexed user, bool enabled);

    constructor(IERC20 _ascToken, uint256 _rewardPool) {
        require(address(_ascToken) != address(0), "Invalid token address");
        ascToken = _ascToken;
        rewardPool = _rewardPool;
    }

    function setAutoReinvest(bool _enabled) external {
        autoReinvestEnabled[msg.sender] = _enabled;
        emit AutoReinvestToggled(msg.sender, _enabled);
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

    function calculateRewards(address user) public view returns (uint256 totalRewards) {
    for (uint256 i = 0; i < userStakes[user].length; i++) {
        Stake storage stake = userStakes[user][i];

        uint256 stakingTime = block.timestamp > stake.lockUntil ? 
            (stake.lockUntil - stake.startTime) : 
            (block.timestamp - stake.startTime);

            uint256 rewards = (stake.amount / 100) * stake.apy * stakingTime / (365 days);
            totalRewards += rewards - stake.rewardsClaimed;
        }
            return totalRewards;
    }


    function reinvestRewards() external {
        uint256 totalRewards = calculateRewards(msg.sender);
        require(totalRewards >= reinvestThreshold, "Not enough rewards to reinvest yet");

        if (userStakes[msg.sender].length == 0) { 
            userStakes[msg.sender].push(Stake({
                amount: totalRewards,
                startTime: block.timestamp,
                lockUntil: block.timestamp + 30 days, // Default 30 days
                apy: getAPY(30 days),
                rewardsClaimed: 0
            }));
        } else {
            uint256 highestYieldIndex = 0;
            uint16 highestAPY = 0;

            for (uint256 i = 0; i < userStakes[msg.sender].length; i++) {
                userStakes[msg.sender][i].rewardsClaimed += 
                    (userStakes[msg.sender][i].amount / 100) * userStakes[msg.sender][i].apy *
                    (block.timestamp - userStakes[msg.sender][i].startTime) / (365 days);

                if (userStakes[msg.sender][i].apy > highestAPY) {
                    highestAPY = userStakes[msg.sender][i].apy;
                    highestYieldIndex = i;
                }
            }

            userStakes[msg.sender][highestYieldIndex].amount += totalRewards;
            }

            emit RewardsReinvested(msg.sender, totalRewards);
        }
    }    


   function withdrawIdleRewards() external {
        uint256 rewardAmount = idleRewards[msg.sender];
        require(rewardAmount > 0, "No idle rewards");

        idleRewards[msg.sender] = 0;
        ascToken.transfer(msg.sender, rewardAmount);

        emit RewardsClaimed(msg.sender, rewardAmount);
    }


   
    function claimRewards() external {
    uint256 totalRewards = calculateRewards(msg.sender);
    require(totalRewards > 0, "No rewards available");

    for (uint256 i = 0; i < userStakes[msg.sender].length; i++) {
        uint256 stakeDuration = block.timestamp > userStakes[msg.sender][i].lockUntil
            ? (userStakes[msg.sender][i].lockUntil - userStakes[msg.sender][i].startTime)
            : (block.timestamp - userStakes[msg.sender][i].startTime);

        uint256 rewards = (userStakes[msg.sender][i].amount * userStakes[msg.sender][i].apy * stakeDuration) / (365 days * 100);

        // ✅ Ensure only new rewards are counted
        uint256 claimable = rewards > userStakes[msg.sender][i].rewardsClaimed 
            ? rewards - userStakes[msg.sender][i].rewardsClaimed 
            : 0;

        userStakes[msg.sender][i].rewardsClaimed += claimable;
        totalRewards += claimable;
    }

    require(totalRewards > 0, "No new rewards available");

    if (autoReinvestEnabled[msg.sender]) {
        reinvestRewards();
    } else {
        idleRewards[msg.sender] += totalRewards;
        require(ascToken.balanceOf(address(this)) >= totalRewards, "Insufficient reward pool");
        ascToken.transfer(msg.sender, totalRewards);
        emit RewardsClaimed(msg.sender, totalRewards);
    }
    

    function getTotalStaked(address user) public view returns (uint256 total) {
        for (uint256 i = 0; i < userStakes[user].length; i++) {
        total += userStakes[user][i].amount;
        }
         return total; // ✅ Fix: Ensure function returns total staked amount
    }

    function getAllUserStakes(address user) external view returns (
        uint256[] memory amounts,
        uint256[] memory startTimes,
        uint256[] memory lockPeriods,
        uint256[] memory apys,
        uint256[] memory rewardsClaimed
    ) {
        uint256 stakeCount = userStakes[user].length;
        amounts = new uint256[](stakeCount);
        startTimes = new uint256[](stakeCount);
        lockPeriods = new uint256[](stakeCount);
        apys = new uint256[](stakeCount);
        rewardsClaimed = new uint256[](stakeCount);

        for (uint256 i = 0; i < stakeCount; i++) {
            Stake storage stake = userStakes[user][i];
            amounts[i] = stake.amount;
            startTimes[i] = stake.startTime;
            lockPeriods[i] = stake.lockUntil;
            apys[i] = stake.apy;
            rewardsClaimed[i] = stake.rewardsClaimed;
        }
    }

    function unstake(uint256 amount) external {
        uint256 totalStakedUser = getTotalStaked(msg.sender);
        require(totalStakedUser >= amount, "Insufficient staked amount");

        uint256 remainingToUnstake = amount;
        uint256 i = 0;

        while (i < userStakes[msg.sender].length && remainingToUnstake > 0) {
            Stake storage stake = userStakes[msg.sender][i];

            if (block.timestamp < stake.lockUntil) {
                i++;
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
                i++;
            }
        }

        require(remainingToUnstake == 0, "Requested amount is still locked");
        emit AscUnstaked(msg.sender, amount);
    }

    function getAPY(uint256 duration) public pure returns (uint16) {
        if (duration >= 730 days) return 200;
        if (duration >= 365 days) return 160;
        if (duration >= 180 days) return 120;
        if (duration >= 90 days) return 80;
        if (duration >= 30 days) return 50;
        return 20;
    }
}
