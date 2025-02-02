// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AscRewards is Ownable {
    IERC20 public ascToken;
    uint256 public rewardPool; // Pre-allocated reward pool in ASC (18 decimals)

    // Mapping to track accrued rewards per user
    mapping(address => uint256) public rewardBalances;
    // Mapping to track liquidity contributions per user for each liquidity pair.
    // The pair key is computed off-chain as keccak256(abi.encodePacked(token1, token2)).
    mapping(address => mapping(bytes32 => uint256)) public userLiquidity;

    event RewardsAllocated(address indexed user, uint256 rewardAmount);
    event RewardsClaimed(address indexed user, uint256 claimedAmount);
    event RewardPoolToppedUp(uint256 amount);
    event LiquidityAdded(address indexed user, bytes32 pairId, uint256 liquidityAmount);
    event LiquidityRemoved(address indexed user, bytes32 pairId, uint256 liquidityAmount);

    /**
     * @dev Constructor sets the ASC token address and the initial reward pool.
     * @param _ascToken The ASC token contract.
     * @param _rewardPool The amount of ASC pre-allocated for rewards (in 18 decimals).
     *
     * Note: The owner must transfer _rewardPool ASC tokens into this contract after deployment.
     */
    constructor(IERC20 _ascToken, uint256 _rewardPool) {
        require(address(_ascToken) != address(0), "Invalid token address");
        ascToken = _ascToken;
        rewardPool = _rewardPool;
    }

    /**
     * @dev Allocates rewards to a liquidity provider and tracks their liquidity deposit.
     * Only callable by the owner (or an authorized contract).
     * @param user The address of the liquidity provider.
     * @param pairId The unique identifier for the liquidity pair (computed off-chain).
     * @param reward The reward amount (in ASC with 18 decimals) to credit.
     * @param liquidityAmount The liquidity amount contributed (normalized to 18 decimals).
     */
    function allocateRewardsAndLiquidity(
        address user,
        bytes32 pairId,
        uint256 reward,
        uint256 liquidityAmount
    ) external onlyOwner {
        require(reward <= rewardPool, "Not enough reward pool");
        rewardBalances[user] += reward;
        rewardPool -= reward;
        userLiquidity[user][pairId] += liquidityAmount;
        emit RewardsAllocated(user, reward);
        emit LiquidityAdded(user, pairId, liquidityAmount);
    }

    /**
     * @dev Updates a user's tracked liquidity when they remove liquidity.
     * Only callable by the owner (or an authorized contract).
     * @param user The address of the liquidity provider.
     * @param pairId The unique identifier for the liquidity pair.
     * @param liquidityAmount The amount of liquidity to remove from the tracking.
     */
    function removeLiquidityReward(
        address user,
        bytes32 pairId,
        uint256 liquidityAmount
    ) external onlyOwner {
        require(userLiquidity[user][pairId] >= liquidityAmount, "Insufficient tracked liquidity");
        userLiquidity[user][pairId] -= liquidityAmount;
        emit LiquidityRemoved(user, pairId, liquidityAmount);
    }

    /**
     * @dev Allows a user to claim their accrued ASC rewards.
     * The tokens are transferred directly to the caller’s wallet.
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
     * The owner can call this after transferring additional ASC tokens to the contract.
     * @param amount The amount to add to the reward pool.
     */
    function topUpRewardPool(uint256 amount) external onlyOwner {
        rewardPool += amount;
        emit RewardPoolToppedUp(amount);
    }
}
