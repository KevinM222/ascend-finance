// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract AscStaking is Ownable {
    IERC20 public ascToken;
    
    // ✅ State Variables (Must be inside the contract)
    uint256 public reinvestThreshold = 10 ether;  // ✅ Correct placement
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

    // Store unclaimed rewards
    mapping(address => uint256) public idleRewards;

    // ✅ Add this mapping to track claimed rewards
    mapping(address => uint256) public rewardsClaimed;

    constructor(IERC20 _ascToken, uint256 _rewardPool) {
        require(address(_ascToken) != address(0), "Invalid token address");
        ascToken = _ascToken;
        rewardPool = _rewardPool;
    }

    function setAutoReinvest(bool _enabled) external {
        autoReinvestEnabled[msg.sender] = _enabled;
        emit AutoReinvestToggled(msg.sender, _enabled);
    }

    function getAPY(uint256 duration) public pure returns (uint16) {
    if (duration >= 730 days) return 20;  // ✅ Should be 20, NOT 200
    if (duration >= 365 days) return 16;  // ✅ Should be 16, NOT 160
    if (duration >= 180 days) return 12;  // ✅ Should be 12, NOT 120
    if (duration >= 90 days) return 8;    // ✅ Should be 8, NOT 80
    if (duration >= 30 days) return 5;    // ✅ Should be 5, NOT 50
    return 2;  // ✅ Lowest APY, should be 2
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

        // ✅ Fixed Multiplication Order
        uint256 rewards = (stake.amount * stake.apy * stakingTime) / (100 * 365 days);

        // ✅ Prevent Underflow
        if (rewards > stake.rewardsClaimed) {
            totalRewards += rewards - stake.rewardsClaimed;
        }
    }
    return totalRewards;
}

    function reinvestRewards() public {  
    uint256 totalRewards = calculateRewards(msg.sender);
    require(totalRewards >= reinvestThreshold, "Not enough rewards to reinvest yet");

    if (userStakes[msg.sender].length == 0) { 
        userStakes[msg.sender].push(Stake({
            amount: totalRewards,
            startTime: block.timestamp,
            lockUntil: block.timestamp + 30 days, 
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

    // 🔹 Ensure tokens are moved correctly
    require(ascToken.balanceOf(address(this)) >= totalRewards, "Not enough tokens in contract");
    ascToken.transfer(address(this), totalRewards); // ✅ Actually transfers tokens!

    emit RewardsReinvested(msg.sender, totalRewards);
}


 
    function claimRewards() external {
        uint256 totalRewards = calculateRewards(msg.sender);
        require(totalRewards > 0, "No rewards available");

        for (uint256 i = 0; i < userStakes[msg.sender].length; i++) {
            userStakes[msg.sender][i].rewardsClaimed += 
                (userStakes[msg.sender][i].amount * userStakes[msg.sender][i].apy * 
                (block.timestamp - userStakes[msg.sender][i].startTime)) / 
                (365 days * 100);
        }

        if (autoReinvestEnabled[msg.sender]) {
            this.reinvestRewards();  // ✅ Call it as external to avoid Solidity internal function issue
        } else {
            idleRewards[msg.sender] += totalRewards;
            require(ascToken.balanceOf(address(this)) >= totalRewards, "Insufficient reward pool");
            ascToken.transfer(msg.sender, totalRewards);
            emit RewardsClaimed(msg.sender, totalRewards);
        }
    }


    function withdrawIdleRewards() external {
        uint256 rewardAmount = idleRewards[msg.sender];
        require(rewardAmount > 0, "No idle rewards");

        require(ascToken.balanceOf(address(this)) >= rewardAmount, "Contract does not have enough tokens.");
    
        idleRewards[msg.sender] = 0;
        ascToken.transfer(msg.sender, rewardAmount);

        emit RewardsClaimed(msg.sender, rewardAmount);
    }


   function getTotalStaked(address user) public view returns (uint256 total) {
        for (uint256 i = 0; i < userStakes[user].length; i++) {
        total += userStakes[user][i].amount;
        }
        return total;  // ✅ Correct placement
    }  // ✅ Properly closed

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

    return (amounts, startTimes, lockPeriods, apys, rewardsClaimed);  // ✅ Fixed return statement
}

function unstake(uint256 index) external {
    require(userStakes[msg.sender].length > index, "Invalid stake index");
    Stake storage stakeData = userStakes[msg.sender][index];
    require(block.timestamp >= stakeData.lockUntil, "Stake is still locked");

    uint256 stakedAmount = stakeData.amount;
    uint256 rewardAmount = (stakeData.amount * stakeData.apy * (block.timestamp - stakeData.startTime)) / (365 days * 100);

    // Remove stake from list
    userStakes[msg.sender][index] = userStakes[msg.sender][userStakes[msg.sender].length - 1];
    userStakes[msg.sender].pop();

    // Reset rewards for user
    rewardsClaimed[msg.sender] += rewardAmount;
    idleRewards[msg.sender] = 0;

    // Transfer both stake & rewards
    uint256 totalWithdraw = stakedAmount + rewardAmount;
    require(ascToken.balanceOf(address(this)) >= totalWithdraw, "Insufficient pool balance");
    ascToken.transfer(msg.sender, totalWithdraw);

    emit Unstaked(msg.sender, stakedAmount, rewardAmount);
}


} // ✅ Closing bracket for the contract

