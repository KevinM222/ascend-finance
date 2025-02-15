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
    }

    mapping(address => Stake[]) public userStakes; // ✅ Fix: Support multiple stakes per user

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
            apy: getAPY(duration)
        }));

        emit AscStaked(msg.sender, amount, block.timestamp + duration, getAPY(duration));
    }

    function getAllUserStakes(address user) external view returns (
        uint256[] memory amounts,
        uint256[] memory startTimes,
        uint256[] memory lockPeriods,
        uint256[] memory apys
    ) {
        uint256 stakeCount = userStakes[user].length;
        amounts = new uint256[](stakeCount);
        startTimes = new uint256[](stakeCount);
        lockPeriods = new uint256[](stakeCount);
        apys = new uint256[](stakeCount);

        for (uint256 i = 0; i < stakeCount; i++) {
            Stake storage stake = userStakes[user][i];
            amounts[i] = stake.amount;
            startTimes[i] = stake.startTime;
            lockPeriods[i] = stake.lockUntil;
            apys[i] = stake.apy;
        }
    }

    function getTotalStaked(address user) public view returns (uint256 total) {
    for (uint256 i = 0; i < userStakes[user].length; i++) {
        total += userStakes[user][i].amount;
    }
}  // Make sure this closing bracket is present


    function unstakeSpecificStake(uint256 stakeIndex) external {
        require(stakeIndex < userStakes[msg.sender].length, "Invalid stake index");

        Stake storage stakeToUnstake = userStakes[msg.sender][stakeIndex];
        require(block.timestamp >= stakeToUnstake.lockUntil, "Stake is still locked");

        uint256 fee = stakeToUnstake.amount / 100;
        uint256 withdrawable = stakeToUnstake.amount - fee;

        ascToken.transfer(msg.sender, withdrawable);
        ascToken.transfer(owner(), fee);

        userStakes[msg.sender][stakeIndex] = userStakes[msg.sender][userStakes[msg.sender].length - 1];
        userStakes[msg.sender].pop();

        emit AscUnstaked(msg.sender, stakeToUnstake.amount);
    }

    function unstake(uint256 amount) external {
        uint256 totalStakedUser = getTotalStaked(msg.sender);
        require(totalStakedUser >= amount, "Insufficient staked amount");

        for (uint256 i = 0; i < userStakes[msg.sender].length; i++) {
            if (amount == 0) break;
            Stake storage stake = userStakes[msg.sender][i];

            if (stake.amount > 0 && block.timestamp >= stake.lockUntil) {
                uint256 toWithdraw = stake.amount > amount ? amount : stake.amount;
                stake.amount -= toWithdraw;
                amount -= toWithdraw;

                uint256 fee = toWithdraw / 100;
                uint256 withdrawable = toWithdraw - fee;

                ascToken.transfer(msg.sender, withdrawable);
                ascToken.transfer(owner(), fee);

                if (stake.amount == 0) {
                    userStakes[msg.sender][i] = userStakes[msg.sender][userStakes[msg.sender].length - 1];
                    userStakes[msg.sender].pop();
                }
            }
        }

        emit AscUnstaked(msg.sender, amount);
    }

    function getAPY(uint256 duration) public pure returns (uint16) {
        if (duration >= 730 days) return 2000;
        if (duration >= 365 days) return 1600;
        if (duration >= 180 days) return 1200;
        if (duration >= 90 days) return 800;
        if (duration >= 30 days) return 500;
        return 200;
    }
}
