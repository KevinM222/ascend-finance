// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AscStaking is Ownable {
    IERC20 public ascToken;
    // Pre-allocated staking rewards pool (in ASC, 18 decimals)
    uint256 public rewardPool;
    // Total staked ASC tokens (in 18 decimals)
    uint256 public totalStaked;

    // Structure to hold staking details for each user
    struct StakeInfo {
        uint256 amount;          // Total staked amount (in ASC, 18 decimals)
        uint256 lockUntil;       // Timestamp until which funds are locked (0 means no lock)
        uint256 lastRewardClaim; // Timestamp of the last reward claim
        uint16 apy;              // APY in basis points (e.g., 200 = 2%)
    }
    mapping(address => StakeInfo) public stakes;

    // APY constants (in basis points)
    uint16 public constant NO_LOCK_APY     = 200;  // 2% APY for liquid (no lock) staking
    uint16 public constant ONE_MONTH_APY   = 500;  // 5% APY for a 1-month lock
    uint16 public constant THREE_MONTH_APY = 800;  // 8% APY for a 3-month lock
    uint16 public constant SIX_MONTH_APY   = 1200; // 12% APY for a 6-month lock
    uint16 public constant ONE_YEAR_APY    = 1600; // 16% APY for a 1-year lock
    uint16 public constant TWO_YEAR_APY    = 2000; // 20% APY for a 2-year lock

    // Duration constants (in seconds)
    uint256 public constant ONE_MONTH    = 30 days;
    uint256 public constant THREE_MONTHS = 90 days;
    uint256 public constant SIX_MONTHS   = 180 days;
    uint256 public constant ONE_YEAR     = 365 days;
    uint256 public constant TWO_YEARS    = 730 days;

    // Minimum staked amounts (in ASC, 18 decimals)
    uint256 public constant MIN_LOCK_AMOUNT         = 1000 * 1e18;   // Minimum for locked staking to get higher yield
    uint256 public constant FEE_DISCOUNT_THRESHOLD  = 10000 * 1e18;  // Minimum to qualify for fee discount

    // Fee discount tiers (only if staked >= FEE_DISCOUNT_THRESHOLD)
    // For example, 10% discount if staked is between 10k and 50k, 20% if staked >= 50k.
    uint16 public constant TIER1_DISCOUNT  = 10;  // 10% discount
    uint16 public constant TIER2_DISCOUNT  = 20;  // 20% discount
    uint256 public constant TIER2_THRESHOLD = 50000 * 1e18;

    event AscStaked(address indexed user, uint256 amount, uint256 lockUntil, uint16 apy);
    event AscUnstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 reward);
    event RewardsReinvested(address indexed user, uint256 reinvestedReward);

    /**
     * @dev Constructor sets the ASC token address and pre-allocates the staking rewards pool.
     * @param _ascToken The ASC token contract.
     * @param _rewardPool The amount of ASC pre-allocated for staking rewards (in 18 decimals).
     */
    constructor(IERC20 _ascToken, uint256 _rewardPool) {
        require(address(_ascToken) != address(0), "Invalid token address");
        ascToken = _ascToken;
        rewardPool = _rewardPool;
    }

    /**
     * @dev Stake ASC tokens.
     * @param amount The amount of ASC to stake (in 18 decimals).
     * @param lockDuration The desired lock duration in seconds (0 for no lock).
     *
     * Requirements:
     * - If lockDuration > 0, amount must be at least MIN_LOCK_AMOUNT.
     * - The APY is determined by the chosen lock duration:
     *     - 0 seconds: NO_LOCK_APY (2%)
     *     - ≥ 1 month: ONE_MONTH_APY (5%)
     *     - ≥ 3 months: THREE_MONTH_APY (8%)
     *     - ≥ 6 months: SIX_MONTH_APY (12%)
     *     - ≥ 1 year: ONE_YEAR_APY (16%)
     *     - ≥ 2 years: TWO_YEAR_APY (20%)
     */
    function stake(uint256 amount, uint256 lockDuration) external {
        require(amount > 0, "Amount must be > 0");
        StakeInfo storage info = stakes[msg.sender];
        uint16 selectedAPY;
        uint256 lockUntilTime = 0;
        if (lockDuration == 0) {
            selectedAPY = NO_LOCK_APY;
        } else {
            require(amount >= MIN_LOCK_AMOUNT, "Minimum locked amount not met");
            if (lockDuration >= TWO_YEARS) {
                selectedAPY = TWO_YEAR_APY;
                lockUntilTime = block.timestamp + TWO_YEARS;
            } else if (lockDuration >= ONE_YEAR) {
                selectedAPY = ONE_YEAR_APY;
                lockUntilTime = block.timestamp + ONE_YEAR;
            } else if (lockDuration >= SIX_MONTHS) {
                selectedAPY = SIX_MONTH_APY;
                lockUntilTime = block.timestamp + SIX_MONTHS;
            } else if (lockDuration >= THREE_MONTHS) {
                selectedAPY = THREE_MONTH_APY;
                lockUntilTime = block.timestamp + THREE_MONTHS;
            } else {
                // Any positive lock less than three months is treated as a one-month lock
                selectedAPY = ONE_MONTH_APY;
                lockUntilTime = block.timestamp + ONE_MONTH;
            }
        }
        // Transfer ASC tokens from the user to the contract
        require(ascToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        // Claim any accrued rewards before updating the stake
        _updateRewards(msg.sender);

        // Update stake info
        info.amount += amount;
        if (lockDuration > 0) {
            // Override lockUntil and APY with the new parameters
            info.lockUntil = lockUntilTime;
            info.apy = selectedAPY;
        } else if (info.amount > 0 && info.lockUntil == 0) {
            info.apy = NO_LOCK_APY;
        }
        info.lastRewardClaim = block.timestamp;
        totalStaked += amount;
        emit AscStaked(msg.sender, amount, info.lockUntil, info.apy);
    }

    /**
     * @dev Internal function to update accrued rewards for a user.
     * Uses the formula: reward = (staked amount * APY * time elapsed) / (365 days * 10000)
     * Rewards are immediately paid out from the pre-allocated rewardPool.
     */
    function _updateRewards(address user) internal {
        StakeInfo storage info = stakes[user];
        if (info.amount == 0) return;
        uint256 timeElapsed = block.timestamp - info.lastRewardClaim;
        uint256 reward = (info.amount * info.apy * timeElapsed) / (365 days * 10000);
        if (reward > rewardPool) {
            reward = rewardPool;
        }
        if (reward > 0) {
            rewardPool -= reward;
            require(ascToken.transfer(user, reward), "Reward transfer failed");
            emit RewardsClaimed(user, reward);
        }
        info.lastRewardClaim = block.timestamp;
    }

    /**
     * @dev Allows a user to claim their accrued staking rewards without unstaking.
     */
    function claimRewards() external {
        _updateRewards(msg.sender);
    }

    /**
     * @dev Reinvest accrued rewards into the user's stake.
     * Instead of transferring tokens, the reward is added to the user's staked amount.
     */
    function reinvestRewards() external {
        StakeInfo storage info = stakes[msg.sender];
        require(info.amount > 0, "No stake to reinvest from");
        uint256 timeElapsed = block.timestamp - info.lastRewardClaim;
        uint256 reward = (info.amount * info.apy * timeElapsed) / (365 days * 10000);
        if (reward > rewardPool) {
            reward = rewardPool;
        }
        require(reward > 0, "No rewards to reinvest");
        rewardPool -= reward;
        info.amount += reward;
        totalStaked += reward;
        info.lastRewardClaim = block.timestamp;
        emit RewardsReinvested(msg.sender, reward);
    }

    /**
     * @dev Unstake ASC tokens.
     * Requirements:
     * - If tokens are locked (lockUntil > 0), the lock period must have expired.
     * - Accrued rewards are updated and paid out before unstaking.
     * @param amount The amount of ASC to unstake.
     */
    function unstake(uint256 amount) external {
        StakeInfo storage info = stakes[msg.sender];
        require(info.amount >= amount, "Insufficient staked amount");
        require(info.lockUntil == 0 || block.timestamp >= info.lockUntil, "Tokens are still locked");
        _updateRewards(msg.sender);
        info.amount -= amount;
        totalStaked -= amount;
        require(ascToken.transfer(msg.sender, amount), "Transfer failed");
        emit AscUnstaked(msg.sender, amount);
    }

    /**
     * @dev Returns the fee reduction percentage for a user based on their staked amount.
     * Fee reduction is available only if staked amount is >= FEE_DISCOUNT_THRESHOLD.
     * If staked < FEE_DISCOUNT_THRESHOLD, returns 0.
     * If staked is between FEE_DISCOUNT_THRESHOLD and TIER2_THRESHOLD, returns TIER1_DISCOUNT.
     * If staked >= TIER2_THRESHOLD, returns TIER2_DISCOUNT.
     */
    function getFeeReduction(address user) external view returns (uint256) {
        uint256 staked = stakes[user].amount;
        if (staked < FEE_DISCOUNT_THRESHOLD) {
            return 0;
        } else if (staked < TIER2_THRESHOLD) {
            return TIER1_DISCOUNT;
        } else {
            return TIER2_DISCOUNT;
        }
    }
}
