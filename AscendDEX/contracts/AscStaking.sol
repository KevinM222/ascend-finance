// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AscStaking is Ownable {
    IERC20 public ascToken;
    uint256 public totalStaked;
    uint256 public rewardPool; // Pre-allocated reward pool for staking rewards (in ASC, 18 decimals)

    // Structure to store staking details for each user
    struct StakeInfo {
        uint256 amount;
        uint256 lockUntil; // Timestamp until which funds are locked (0 for no lock)
        uint256 lastRewardClaim; // Timestamp of the last reward claim
    }
    mapping(address => StakeInfo) public stakes;

    // Tier thresholds (in ASC, 18 decimals)
    uint256 public constant MIN_LOCK_AMOUNT = 1_000 * 1e18;   // Minimum to lock for higher yield
    uint256 public constant FEE_DISCOUNT_THRESHOLD = 10_000 * 1e18; // Must stake at least 10k for fee discount

    // Example APY rates (expressed in basis points; 100 bp = 1%)
    // These can be adjusted via governance later.
    uint16 public constant NO_LOCK_APY = 200;      // 2% APY for liquid (no lock) staking
    uint16 public constant ONE_MONTH_APY = 500;      // 5% APY for a 1-month lock
    uint16 public constant THREE_MONTH_APY = 800;    // 8% APY for a 3-month lock
    uint16 public constant SIX_MONTH_APY = 1200;     // 12% APY for a 6-month lock
    uint16 public constant ONE_YEAR_APY = 1600;        // 16% APY for a 1-year lock
    uint16 public constant TWO_YEAR_APY = 2000;        // 20% APY for a 2-year lock

    // Fee discount tiers (only applicable if staked amount >= FEE_DISCOUNT_THRESHOLD)
    // For example, you might define:
    // 10% discount for staked amount between 10k and 50k, and 20% for above 50k.
    uint16 public constant TIER1_DISCOUNT = 10;
    uint16 public constant TIER2_DISCOUNT = 20;
    uint256 public constant TIER2_THRESHOLD = 50_000 * 1e18;

    event AscStaked(address indexed user, uint256 amount, uint256 lockUntil);
    event AscUnstaked(address indexed user, uint256 amount);
    event StakingRewardsClaimed(address indexed user, uint256 reward);

    constructor(IERC20 _ascToken, uint256 _rewardPool) {
        require(address(_ascToken) != address(0), "Invalid token address");
        ascToken = _ascToken;
        rewardPool = _rewardPool;
    }

    /**
     * @dev Stake ASC tokens. The user can choose a lock duration (in seconds). If lockDuration is 0, funds are liquid.
     * Requirements:
     * - If lockDuration > 0, a minimum of MIN_LOCK_AMOUNT must be staked.
     * @param amount The amount of ASC to stake.
     * @param lockDuration The lock duration in seconds (0 means no lock).
     */
    function stake(uint256 amount, uint256 lockDuration) external {
        require(amount > 0, "Amount must be > 0");
        if (lockDuration > 0) {
            require(amount >= MIN_LOCK_AMOUNT, "Minimum locked amount not met");
        }
        require(ascToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        StakeInfo storage stakeInfo = stakes[msg.sender];
        stakeInfo.amount += amount;
        // Set lockUntil to current timestamp + lockDuration; if lockDuration is 0, lockUntil remains 0
        if (lockDuration > 0) {
            stakeInfo.lockUntil = block.timestamp + lockDuration;
        }
        stakeInfo.lastRewardClaim = block.timestamp;
        totalStaked += amount;
        emit AscStaked(msg.sender, amount, stakeInfo.lockUntil);
    }

    /**
     * @dev Unstake ASC tokens. If tokens are still locked (lockUntil in the future), the user may incur a penalty or may not be allowed to unstake.
     * For simplicity, here we require that the lock period has expired.
     * @param amount The amount of ASC to unstake.
     */
    function unstake(uint256 amount) external {
        StakeInfo storage stakeInfo = stakes[msg.sender];
        require(stakeInfo.amount >= amount, "Insufficient staked balance");
        require(block.timestamp >= stakeInfo.lockUntil, "Tokens are still locked");
        stakeInfo.amount -= amount;
        totalStaked -= amount;
        require(ascToken.transfer(msg.sender, amount), "Transfer failed");
        emit AscUnstaked(msg.sender, amount);
    }

    /**
     * @dev Get fee reduction for a user based on their staked amount.
     * Fee reduction is available only if staked amount is >= FEE_DISCOUNT_THRESHOLD.
     * Returns the fee discount in percentage (e.g., 10 means 10% discount).
     */
    function getFeeReduction(address user) external view returns (uint256) {
        uint256 staked = stakes[user].amount;
        if (staked < FEE_DISCOUNT_THRESHOLD) {
            return 0;
        } else if (staked < TIER2_THRESHOLD) {
            return TIER1_DISCOUNT; // 10% discount
        } else {
            return TIER2_DISCOUNT; // 20% discount
        }
    }

    // Optionally, add functions to calculate and distribute staking rewards based on APY.
    // For instance, you might allow users to claim rewards that accrue over time from the rewardPool.
    // This can be implemented with time-based calculations in a claimRewards() function.
}
