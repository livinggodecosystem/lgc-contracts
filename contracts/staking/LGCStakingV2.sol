// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Living God Coin Staking
/// @author Living God Ecosystem
/// @notice Stake Living God Coin and earn rewards.
/// @dev Experimental V2: independent security and economic review required before public activation.

contract LGCStakingV2 is Ownable, Pausable, ReentrancyGuard {

    using SafeERC20 for IERC20;

    /// -----------------------------------------------------------------------
    /// Version
    /// -----------------------------------------------------------------------

    string public constant VERSION = "2.0.0";

    uint256 public immutable deployedAt;

    IERC20 public immutable lgcToken;


            /// -----------------------------------------------------------------------
    /// Staking Structure
    /// -----------------------------------------------------------------------


      struct StakingPool {
    uint256 id;
    bytes32 name;
    uint256 annualRewardRate;
    uint64 lockDuration;
    bool active;
}

    struct StakeInfo {
    uint256 id;
    uint256 poolId;
    address staker;
    uint256 amount;
    uint64 startTime;
    uint64 lastClaimTime;
    bool active;
    // Immutable position APR snapshot; later administrative changes apply to new stakes.
    uint256 rewardRateBps;
}

struct RewardPoolStats {
    uint256 rewardPool;
    uint256 totalRewardsFunded;
    uint256 totalRewardsPaid;
    uint256 totalStaked;
    uint256 totalStakePositions;
    uint256  activeStakers;
    uint256 totalPools;
}


        /// -----------------------------------------------------------------------
    /// Storage
    /// -----------------------------------------------------------------------

    uint256 public totalStaked;

    uint256 public totalRewardsPaid;

    uint256 public activeStakers;

    /// @notice Total rewards ever funded into the protocol.
    uint256 public totalRewardsFunded;

    uint256 public totalStakePositions;

    uint256 public rewardPool;

    uint256 public annualRewardRate = 1000;

    mapping(uint256 => StakeInfo) public stakes;

    mapping(address => uint256[]) public userStakeIds;

    mapping(address => uint256) public userTotalStaked;

    // Reward obligations captured when principal is withdrawn without reward liquidity.
    mapping(address => uint256) public unpaidRewards;
    uint256 public totalUnpaidRewards;

    // Each position accrues for at most one year; the maximum reward is reserved
    // when it opens. Commitments include active unearned rewards and exited debt.
    uint256 public constant REWARD_EARNING_DURATION = 365 days;
    uint256 private constant REWARD_DENOMINATOR = REWARD_EARNING_DURATION * 10_000;
    uint256 public totalRewardCommitments;
    mapping(uint256 => uint256) public remainingPositionCommitment;

    /// @notice Permanent closeout begins with the first owner recovery of unused rewards.
    bool public stakingClosed;
    uint256 public totalRewardsRecovered;
    event DeferredRewardRecorded(uint256 indexed stakeId, address indexed staker, uint256 amount);
    event DeferredRewardClaimed(address indexed staker, uint256 amount);
    event UnusedRewardFundsRecovered(address indexed owner, uint256 amount);


    mapping(uint256 => StakingPool) public stakingPools;

    mapping(bytes32 => bool) public poolNameExists;


uint256 public totalPools;

        /// -----------------------------------------------------------------------
    /// Custom Errors
    /// -----------------------------------------------------------------------

    error InvalidToken();
    error InvalidAmount();
    error InvalidRewardRate();
    error StakeNotFound();
    error StakeInactive();
    error NotStakeOwner();
    error NothingToClaim();
    error InsufficientRewardPool();
    error InvalidPool();
    error StakeStillLocked();
    error PoolInactive();
    error PoolAlreadyInDesiredState();
    error RewardRateUnchanged();
    error PoolAlreadyExists();
    error TokenTransferMismatch();
    error LockExceedsRewardTerm();
    error StakingPermanentlyClosed();
    error OutstandingStakingObligations();


        /// -----------------------------------------------------------------------
    /// Events
    /// -----------------------------------------------------------------------

    event Staked(
        uint256 indexed stakeId,
        address indexed staker,
        uint256 amount
    );

    event Unstaked(
        uint256 indexed stakeId,
        address indexed staker,
        uint256 amount
    );

    event RewardsClaimed(
        uint256 indexed stakeId,
        address indexed staker,
        uint256 reward
    );

    event RewardPoolFunded(
        uint256 amount
    );

    event RewardRateUpdated(
        uint256 oldRate,
        uint256 newRate
    );

    event StakingPaused(address indexed account);

    event StakingUnpaused(address indexed account);

    event PoolCreated(
    uint256 indexed poolId,
    bytes32 name,
    uint256 rewardRate,
    uint64 lockDuration
);

    event PoolStatusUpdated(
    uint256 indexed poolId,
    bool active
);

event PoolRewardRateUpdated(
    uint256 indexed poolId,
    uint256 oldRate,
    uint256 newRate
);

    /// -----------------------------------------------------------------------
    /// Constructor
    /// -----------------------------------------------------------------------

    constructor(
        address initialOwner,
        IERC20 token
    )
        Ownable(initialOwner)
    {
        if (address(token) == address(0))
    revert InvalidToken();

        lgcToken = token;

        stakingPools[0] = StakingPool({
    id: 0,
    name: bytes32("FLEXIBLE"),
    annualRewardRate: annualRewardRate,
    lockDuration: 0,
    active: true
});

poolNameExists[bytes32("FLEXIBLE")] = true;

emit PoolCreated(
    0,
    bytes32("FLEXIBLE"),
    annualRewardRate,
    0
);

stakingPools[1] = StakingPool({
    id: 1,
    name: bytes32("SILVER"),
    annualRewardRate: 1200,
    lockDuration: 30 days,
    active: true
});

poolNameExists[bytes32("SILVER")] = true;

emit PoolCreated(
    1,
    bytes32("SILVER"),
    1200,
    30 days
);

stakingPools[2] = StakingPool({
    id: 2,
    name: bytes32("GOLD"),
    annualRewardRate: 1500,
    lockDuration: 90 days,
    active: true
});

poolNameExists[bytes32("GOLD")] = true;

emit PoolCreated(
    2,
    bytes32("GOLD"),
    1500,
    90 days
);

stakingPools[3] = StakingPool({
    id: 3,
    name: bytes32("PLATINUM"),
    annualRewardRate: 1800,
    lockDuration: 180 days,
    active: true
});

poolNameExists[bytes32("PLATINUM")] = true;

emit PoolCreated(
    3,
    bytes32("PLATINUM"),
    1800,
    180 days
);

stakingPools[4] = StakingPool({
    id: 4,
    name: bytes32("DIAMOND"),
    annualRewardRate: 2000,
    lockDuration: 365 days,
    active: true
});

poolNameExists[bytes32("DIAMOND")] = true;

emit PoolCreated(
    4,
    bytes32("DIAMOND"),
    2000,
    365 days
);

totalPools = 5;

deployedAt = block.timestamp;
    }


    /// @notice Creates a new staking pool.
function createPool(
    bytes32 name,
   uint256 rewardRate,
    uint64 lockDuration
)
    external
    onlyOwner
{
    uint256 poolId = totalPools;

    if (rewardRate == 0 || rewardRate > 10_000)
    revert InvalidRewardRate();

    if (lockDuration > REWARD_EARNING_DURATION)
    revert LockExceedsRewardTerm();

    if (name == bytes32(0))
    revert InvalidPool();

     if (poolNameExists[name])
    revert PoolAlreadyExists();

    poolNameExists[name] = true;

    stakingPools[poolId] = StakingPool({
        id: poolId,
        name: name,
        annualRewardRate: rewardRate,
        lockDuration: lockDuration,
        active: true
    });

    totalPools++;

    emit PoolCreated(
        poolId,
        name,
        rewardRate,
        lockDuration
    );
}

/// @notice Returns a staking pool.
function getPool(
    uint256 poolId
)
    public
    view
    returns (StakingPool memory)
{
    if (poolId >= totalPools)
        revert InvalidPool();

    return stakingPools[poolId];
}

/// @notice Returns complete information about a staking pool.
function getPoolInfo(
    uint256 poolId
)
    public
    view
    returns (
        bytes32 name,
        uint256 rewardRate,
        uint64 lockDuration,
        bool active
    )
{
    if (!poolExists(poolId))
        revert InvalidPool();

    StakingPool storage pool =
        stakingPools[poolId];

    return (
        pool.name,
        pool.annualRewardRate,
        pool.lockDuration,
        pool.active
    );
}

/// @notice Returns the total number of staking pools.
function getPoolCount()
    public
    view
    returns (uint256)
{
    return totalPools;
}


/// @notice Returns whether a staking pool is valid.
function poolExists(
    uint256 poolId
)
    public
    view
    returns (bool)
{
    return poolId < totalPools;
}

function getPoolName(
    uint256 poolId
)
    public
    view
    returns (string memory)
{
    if (!poolExists(poolId))
        revert InvalidPool();

    return string(
        abi.encodePacked(
            stakingPools[poolId].name
        )
    );
}

/// @notice True when the pool remains sufficient for every accepted reward promise.
/// @dev Includes future unearned rewards of active positions and exited debt.
function rewardPoolHealthy() public view returns (bool) {
    return rewardPool >= totalRewardCommitments && rewardPool > 0;
}

/// @notice Conservative active liability: ALL remaining promised active rewards,
/// including unearned future amounts. This is NOT current accrued reward debt.
function pendingActiveRewardLiability() public view returns (uint256) {
    return totalRewardCommitments - totalUnpaidRewards;
}

/// @notice Report reserved obligations; retained function name for V2 tooling.
/// @dev estimatedActiveDebt includes future unearned rewards, not only accrual.
function accruedRewardCoverage() external view returns (
    uint256 fundedRewards,
    uint256 recordedDeferredDebt,
    uint256 estimatedActiveDebt,
    uint256 totalAccruedDebt,
    uint256 fundingShortfall
) {
    fundedRewards = rewardPool;
    recordedDeferredDebt = totalUnpaidRewards;
    estimatedActiveDebt = pendingActiveRewardLiability();
    totalAccruedDebt = totalRewardCommitments;
    fundingShortfall = totalRewardCommitments > fundedRewards
        ? totalRewardCommitments - fundedRewards : 0;
}

/// @notice Full reward-commitment coverage, including FUTURE promised interest.
function rewardCommitmentCoverage() external view returns (
    uint256 funded, uint256 committed, uint256 availableForNewStakes, uint256 shortfall
) {
    funded = rewardPool;
    committed = totalRewardCommitments;
    availableForNewStakes = funded > committed ? funded - committed : 0;
    shortfall = committed > funded ? committed - funded : 0;
}

/// @notice Reports recorded deferred-reward coverage (excludes live accrual).
/// @return fundedRewards Reward liquidity recorded in rewardPool.
/// @return recordedDebt Rewards already deferred on exited positions.
/// @return fundingShortfall Amount needed to cover that recorded debt.
function deferredRewardCoverage()
    external
    view
    returns (uint256 fundedRewards, uint256 recordedDebt, uint256 fundingShortfall)
{
    fundedRewards = rewardPool;
    recordedDebt = totalUnpaidRewards;
    fundingShortfall = recordedDebt > fundedRewards
        ? recordedDebt - fundedRewards
        : 0;
}


/// @notice Returns the annual reward rate of a staking pool.
/// @param poolId Pool ID.
/// @return Annual reward rate in basis points.
/// @notice Returns the reward rate for a staking pool.

function getPoolRewardRate(
    uint256 poolId
)
    public
    view
    returns (uint256)
{
    if (!poolExists(poolId))
        revert InvalidPool();

    return stakingPools[poolId].annualRewardRate;
}

/// @notice Returns whether a stake has completed its lock period.
function isStakeUnlocked(
    uint256 stakeId
)
    public
    view
    returns (bool)
{
    StakeInfo storage userStake = stakes[stakeId];

    if (!userStake.active)
        return false;

    uint64 lockDuration =
        stakingPools[userStake.poolId].lockDuration;

    return
        block.timestamp >=
        uint256(userStake.startTime) + lockDuration;
}


    /// @notice Pauses all staking operations.
function pause()
    external
    onlyOwner
{
    _pause();

    emit StakingPaused(msg.sender);
}

/// @notice Resumes all staking operations.
function unpause()
    external
    onlyOwner
{
    _unpause();

    emit StakingUnpaused(msg.sender);
}
function updatePoolRewardRate(
    uint256 poolId,
    uint256 newRate
)
    external
    onlyOwner
{
    if (!poolExists(poolId))
        revert InvalidPool();

    if (newRate == 0 || newRate > 10_000)
        revert InvalidRewardRate();

    if (
        stakingPools[poolId].annualRewardRate
            == newRate
    )
        revert RewardRateUnchanged();

    uint256 oldRate =
        stakingPools[poolId]
            .annualRewardRate;

    stakingPools[poolId]
        .annualRewardRate = newRate;
    if (poolId == 0) {
        annualRewardRate = newRate;
        emit RewardRateUpdated(oldRate, newRate);
    }

    emit PoolRewardRateUpdated(
        poolId,
        oldRate,
        newRate
    );
}
        /// -----------------------------------------------------------------------
    /// Owner Functions
    /// -----------------------------------------------------------------------

    /// @notice Funds the staking reward pool.
    /// @param amount Amount of LGC to add.
    function fundRewardPool(
        uint256 amount
    )
        external
        onlyOwner
    {
        if (stakingClosed) revert StakingPermanentlyClosed();
        if (amount == 0)
            revert InvalidAmount();

        uint256 balanceBefore = lgcToken.balanceOf(address(this));
        lgcToken.safeTransferFrom(msg.sender, address(this), amount);
        if (lgcToken.balanceOf(address(this)) - balanceBefore != amount)
            revert TokenTransferMismatch();

        rewardPool += amount;
       totalRewardsFunded += amount;

        emit RewardPoolFunded(amount);
    }

        /// @notice Updates the annual reward rate.
    /// @param newRate Annual reward rate in basis points.
    function setAnnualRewardRate(
    uint256 newRate
)
    external
    onlyOwner
{
    if (newRate == 0 || newRate > 10_000)
        revert InvalidRewardRate();

    if (annualRewardRate == newRate)
        revert RewardRateUnchanged();

    uint256 oldRate =
        annualRewardRate;

    annualRewardRate = newRate;
    stakingPools[0].annualRewardRate = newRate;

    emit PoolRewardRateUpdated(0, oldRate, newRate);
    emit RewardRateUpdated(
        oldRate,
        newRate
    );
}


/// @notice Enables or disables a staking pool.
/// @param poolId Pool ID.
/// @param active New pool status.
function setPoolActive(
    uint256 poolId,
    bool active
)
    external
    onlyOwner
{
    if (!poolExists(poolId))
        revert InvalidPool();

    if (stakingPools[poolId].active == active)
        revert PoolAlreadyInDesiredState();

    stakingPools[poolId].active = active;

    emit PoolStatusUpdated(
        poolId,
        active
    );
}

    /// @notice During FINAL closeout, return only UNUSED accounted reward funding.
    /// @dev The first successful recovery permanently blocks new stakes and funding.
    ///      Outstanding principal, active commitments, or deferred rewards prevent recovery.
    ///      Rewards are sent ONLY to msg.sender (the authorized owner), never an arbitrary recipient.
    ///      Direct unsolicited token transfers are NOT part of the recoverable rewardPool.
    ///      Owner transfer and renunciation functionality are intentionally unchanged.
    /// @param amount Amount of uncommitted LGC funding to return to the owner.
    function recoverUnusedRewardFunds(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (
            totalStaked != 0 ||
            activeStakers != 0 ||
            totalRewardCommitments != 0 ||
            totalUnpaidRewards != 0
        ) revert OutstandingStakingObligations();
        if (amount > rewardPool || lgcToken.balanceOf(address(this)) < rewardPool)
            revert InsufficientRewardPool();

        // Effects before interaction; the first recovery permanently closes staking.
        stakingClosed = true;
        rewardPool -= amount;
        totalRewardsRecovered += amount;
        lgcToken.safeTransfer(msg.sender, amount);
        emit UnusedRewardFundsRecovered(msg.sender, amount);
    }

    /// -----------------------------------------------------------------------
    /// View Functions
    /// -----------------------------------------------------------------------

    function getRewardPool()
        public
        view
        returns (uint256)
    {
        return rewardPool;
    }

    function getTotalStaked()
        public
        view
        returns (uint256)
    {
        return totalStaked;
    }

    function getUserStakeCount(
        address user
    )
        public
        view
        returns (uint256)
    {
        return userStakeIds[user].length;
    }

    function getUserStakeIds(
        address user
    )
        external
        view
        returns (uint256[] memory)
    {
        return userStakeIds[user];
    }


    /// @notice Returns overall staking statistics.
function getRewardPoolStats()
    external
    view
    returns (RewardPoolStats memory)
{
    return RewardPoolStats({
    rewardPool: rewardPool,
    totalRewardsFunded: totalRewardsFunded,
    totalRewardsPaid: totalRewardsPaid,
    totalStaked: totalStaked,
    totalStakePositions: totalStakePositions,
    activeStakers: activeStakers,
    totalPools: totalPools
});
}

/// @notice Returns the total amount of tokens currently staked
/// by summing all active staking positions.
/// @dev Intended for testing, verification and future audits.
function calculateTotalActiveStake()
    public
    view
    returns (uint256 total)
{
    uint256 length = totalStakePositions;

    for (uint256 i = 0; i < length; i++) {
    StakeInfo storage userStake = stakes[i];

if (userStake.active) {
    total += userStake.amount;
}
    }
}

    /// -----------------------------------------------------------------------
    /// Staking Functions
    /// -----------------------------------------------------------------------

    /// @notice Stake LGC tokens.
    /// @param amount Amount of LGC to stake.
    function _stake(
    uint256 poolId,
    uint256 amount
)
    internal
{
        if (stakingClosed) revert StakingPermanentlyClosed();
        if (!poolExists(poolId))
    revert InvalidPool();

    if (!stakingPools[poolId].active)
    revert PoolInactive();

        if (amount == 0)
            revert InvalidAmount();

        uint256 balanceBefore = lgcToken.balanceOf(address(this));
        lgcToken.safeTransferFrom(msg.sender, address(this), amount);
        if (lgcToken.balanceOf(address(this)) - balanceBefore != amount)
            revert TokenTransferMismatch();

        uint256 stakeRate = stakingPools[poolId].annualRewardRate;
        // Maximum 365-day simple-interest entitlement for this position.
        // Existing promises and newly accepted promises must be fully funded.
        uint256 maxReward = (amount * stakeRate) / 10_000;
        if (rewardPool < totalRewardCommitments ||
            rewardPool - totalRewardCommitments < maxReward)
            revert InsufficientRewardPool();
        totalRewardCommitments += maxReward;

        uint256 stakeId = totalStakePositions;
       uint64 currentTime = uint64(block.timestamp);

    remainingPositionCommitment[stakeId] = maxReward;
    stakes[stakeId] = StakeInfo({
    id: stakeId,
    poolId: poolId,
    staker: msg.sender,
    amount: amount,
    startTime: currentTime,
    lastClaimTime: currentTime,
    active: true,
    rewardRateBps: stakeRate

});

        userStakeIds[msg.sender].push(stakeId);

        totalStakePositions++;

        if (userTotalStaked[msg.sender] == 0) {
            activeStakers += 1;
        }

        totalStaked += amount;
        userTotalStaked[msg.sender] += amount;

        emit Staked(
            stakeId,
            msg.sender,
            amount
        );
    }

    /// @notice Stakes LGC into a selected staking pool.
function stake(
    uint256 amount
)
    external
    whenNotPaused
    nonReentrant
{
    _stake(0, amount);

}

/// @notice Stakes into the default Flexible Pool.
function stakeInPool(
    uint256 poolId,
    uint256 amount
)
    external
    whenNotPaused
    nonReentrant
{
    _stake(poolId, amount);
}

        /// @notice Calculates pending staking rewards.
    /// @param stakeId The staking position ID.
    function calculateRewards(
        uint256 stakeId
    )
        public
        view
        returns (uint256)
    {
        StakeInfo storage userStake =
            stakes[stakeId];

        if (!userStake.active)
            revert StakeInactive();

        uint256 rewardEnd = uint256(userStake.startTime) + REWARD_EARNING_DURATION;
        uint256 effectiveTime = block.timestamp < rewardEnd
            ? block.timestamp : rewardEnd;
        if (effectiveTime <= uint256(userStake.lastClaimTime)) return 0;
        uint256 stakingDuration = effectiveTime - uint256(userStake.lastClaimTime);

       uint256 rewardRate = userStake.rewardRateBps;

uint256 reward =
    (
        userStake.amount *
        rewardRate *
        stakingDuration
    )
    /
    (365 days * 10_000);

        return reward;
    }

        /// @notice Returns a staking position.
    function getStake(
    uint256 stakeId
)
    external
    view
    returns (StakeInfo memory)
{
    if (stakeId >= totalStakePositions)
        revert StakeNotFound();

    return stakes[stakeId];
}

        /// @notice Claims accumulated staking rewards.
    /// @param stakeId The staking position ID.
    /// @notice Internal reward claim logic.
   function _claimRewards(
    uint256 stakeId
)
    internal
{
    StakeInfo storage userStake =
        stakes[stakeId];

    if (!userStake.active)
        revert StakeInactive();

    if (userStake.staker != msg.sender)
        revert NotStakeOwner();

    uint256 reward =
        calculateRewards(stakeId);

    if (reward == 0)
        revert NothingToClaim();

    // Each position draws only from its own pre-funded entitlement.
    if (rewardPool < totalRewardCommitments ||
        remainingPositionCommitment[stakeId] < reward)
        revert InsufficientRewardPool();
    remainingPositionCommitment[stakeId] -= reward;
    totalRewardCommitments -= reward;

    uint64 currentTime =
    uint64(block.timestamp);

   userStake.lastClaimTime =
    currentTime;

    rewardPool -= reward;

    totalRewardsPaid += reward;

    lgcToken.safeTransfer(
        msg.sender,
        reward
    );

    emit RewardsClaimed(
        stakeId,
        msg.sender,
        reward
    );
}

/// @notice Claims accumulated staking rewards.
function claimRewards(
    uint256 stakeId
)
    external
    whenNotPaused
    nonReentrant
{
    _claimRewards(stakeId);
}

        /// @notice Returns unlocked principal; any accrued rewards become separately claimable debt.
    /// @param stakeId The staking position ID.
    function unstake(uint256 stakeId) external whenNotPaused nonReentrant {
        _unstake(stakeId);
    }

    /// @notice Exit an unlocked position while paused, without paying rewards.
    /// @dev Honors the original lock and records rewards as deferred debt.
    function emergencyUnstake(uint256 stakeId) external whenPaused nonReentrant {
        _unstake(stakeId);
    }

    function _unstake(uint256 stakeId) internal {
        StakeInfo storage userStake =
            stakes[stakeId];

        if (!userStake.active)
            revert StakeInactive();

        if (userStake.staker != msg.sender)
            revert NotStakeOwner();

        if (!isStakeUnlocked(stakeId))
    revert StakeStillLocked();

        // Automatically claim any pending rewards
        // Calculate once, before closing the position. Principal never depends on reward liquidity.
        uint256 accrued = calculateRewards(stakeId);
        // Release unearned future rewards, but retain the earned debt reserve
        // when the principal is returned, even while the pool is paused.
        uint256 reserved = remainingPositionCommitment[stakeId];
        if (reserved < accrued) revert InsufficientRewardPool();
        totalRewardCommitments -= (reserved - accrued);
        remainingPositionCommitment[stakeId] = 0;
        if (accrued != 0) {
            unpaidRewards[msg.sender] += accrued;
            totalUnpaidRewards += accrued;
            emit DeferredRewardRecorded(stakeId, msg.sender, accrued);
        }

        uint256 amount =
            userStake.amount;

        totalStaked -= amount;
        userTotalStaked[msg.sender] -= amount;

        if (userTotalStaked[msg.sender] == 0) {
            activeStakers -= 1;
        }

        userStake.amount = 0;
        userStake.active = false;

        lgcToken.safeTransfer(
            msg.sender,
            amount
        );

        emit Unstaked(
            stakeId,
            msg.sender,
            amount
        );
    }

    /// @notice Claim recorded deferred rewards when ALL currently accrued debts are funded.
    /// @dev Covers deferred and active accrued obligations; future accrual is not guaranteed.
    function claimDeferredRewards() external whenNotPaused nonReentrant {
        uint256 owed = unpaidRewards[msg.sender];
        if (owed == 0) revert NothingToClaim();

        // Recorded debt is part of totalRewardCommitments and remains reserved.
        if (rewardPool < totalRewardCommitments) revert InsufficientRewardPool();

        // Effects first, transfer last; other participants' reserves remain untouched.
        unpaidRewards[msg.sender] = 0;
        totalUnpaidRewards -= owed;
        totalRewardCommitments -= owed;
        rewardPool -= owed;
        totalRewardsPaid += owed;

        lgcToken.safeTransfer(msg.sender, owed);
        emit DeferredRewardClaimed(msg.sender, owed);
    }


        /// @notice Returns pending rewards for a stake.
    /// @param stakeId The staking position ID.
    function pendingRewards(
        uint256 stakeId
    )
        external
        view
        returns (uint256)
    {
        return calculateRewards(stakeId);
    }

   function stakeUnlockTime(
    uint256 stakeId
)
    public
    view
    returns (uint256)
{
    StakeInfo storage userStake =
        stakes[stakeId];

    if (!userStake.active)
        revert StakeInactive();

    return
        uint256(userStake.startTime)
        +
        stakingPools[userStake.poolId]
            .lockDuration;
}

function remainingLockTime(
    uint256 stakeId
)
    public
    view
    returns (uint256)
{
    uint256 unlockTime =
        stakeUnlockTime(stakeId);

    if (block.timestamp >= unlockTime)
        return 0;

    return unlockTime - block.timestamp;
}

function contractBalance()
    public
    view
    returns (uint256)
{
    return lgcToken.balanceOf(address(this));
}
}