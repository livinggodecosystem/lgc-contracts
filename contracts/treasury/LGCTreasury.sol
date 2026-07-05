// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Living God Coin Treasury
/// @author Living God Ecosystem
/// @notice Manages the treasury allocations for the Living God Ecosystem.
/// @dev Holds LGC tokens and distributes them according to approved allocations.

contract LGCTreasury is Ownable, Pausable, ReentrancyGuard {

    using SafeERC20 for IERC20;

    /// @notice Treasury allocation categories.
enum AllocationType {
    Ecosystem,
    Community,
    Liquidity,
    Development,
    Reserve,
    Team
}


/// @notice Complete allocation information.
struct AllocationInfo {
    uint256 allocated;
    uint256 distributed;
    uint256 remaining;
    uint256 progress;
    bool exhausted;
}

    /// @notice Living God Coin token contract
    IERC20 public immutable lgcToken;

        /// -----------------------------------------------------------------------
    /// Treasury Allocations
    /// -----------------------------------------------------------------------


    uint256 public constant ECOSYSTEM_ALLOCATION = 4_500_000 * 10 ** 18;
    uint256 public constant COMMUNITY_ALLOCATION = 3_000_000 * 10 ** 18;
    uint256 public constant LIQUIDITY_ALLOCATION = 2_250_000 * 10 ** 18;
    uint256 public constant DEVELOPMENT_ALLOCATION = 2_250_000 * 10 ** 18;
    uint256 public constant RESERVE_ALLOCATION = 1_500_000 * 10 ** 18;
    uint256 public constant TEAM_ALLOCATION = 1_500_000 * 10 ** 18;

    /// @notice Ecosystem Treasury wallet
    address public ecosystemWallet;

    /// @notice Community Rewards wallet
    address public communityWallet;

    /// @notice Liquidity wallet
    address public liquidityWallet;

    /// @notice Development wallet
    address public developmentWallet;

    /// @notice Strategic Reserve wallet
    address public reserveWallet;

    /// @notice Founding Team wallet
    address public teamWallet;

       /// -----------------------------------------------------------------------
    /// Allocation Tracking
    /// -----------------------------------------------------------------------

    uint256 public ecosystemDistributed;
    uint256 public communityDistributed;
    uint256 public liquidityDistributed;
    uint256 public developmentDistributed;
    uint256 public reserveDistributed;
    uint256 public teamDistributed;

       /// -----------------------------------------------------------------------
    /// Events
    /// -----------------------------------------------------------------------

    event TokensDistributed(
        string indexed category,
        address indexed recipient,
        uint256 amount
    );

    event WalletUpdated(
    string indexed category,
    address indexed oldWallet,
    address indexed newWallet
);

    event RecoveredToken(
    address indexed token,
    address indexed recipient,
    uint256 amount
);

event TreasuryPaused(
    address indexed account
);

event TreasuryUnpaused(
    address indexed account
);

/// -----------------------------------------------------------------------
/// Custom Errors
/// -----------------------------------------------------------------------

error InvalidWallet();
error InvalidToken();
error InsufficientTreasuryBalance();
error EcosystemAllocationExceeded();
error CommunityAllocationExceeded();
error LiquidityAllocationExceeded();
error DevelopmentAllocationExceeded();
error ReserveAllocationExceeded();
error TeamAllocationExceeded();
error CannotRecoverLGC();
error InvalidAllocation();

/// @notice Ensures a wallet address is valid.
modifier validAddress(address newWallet) {
    if (newWallet == address(0))
        revert InvalidWallet();

    _;
}

/// @notice Pause the treasury in case of emergency.
function pause()
    external
    onlyOwner
{
    _pause();

    emit TreasuryPaused(msg.sender);
}

/// @notice Resume treasury operations.
function unpause()
    external
    onlyOwner
{
    _unpause();

    emit TreasuryUnpaused(msg.sender);
}

    constructor(
        address initialOwner,
        IERC20 tokenAddress,
        address _ecosystemWallet,
        address _communityWallet,
        address _liquidityWallet,
        address _developmentWallet,
        address _reserveWallet,
        address _teamWallet
    ) Ownable(initialOwner) {

        if (address(tokenAddress) == address(0))
    revert InvalidToken();

        lgcToken = tokenAddress;

        ecosystemWallet = _ecosystemWallet;
        communityWallet = _communityWallet;
        liquidityWallet = _liquidityWallet;
        developmentWallet = _developmentWallet;
        reserveWallet = _reserveWallet;
        teamWallet = _teamWallet;
    }

    /// @notice Updates the Ecosystem Treasury wallet.
function updateEcosystemWallet(address newWallet)
    external
    onlyOwner
    validAddress(newWallet)
{
    address oldWallet = ecosystemWallet;

    ecosystemWallet = newWallet;

    emit WalletUpdated(
        "Ecosystem",
        oldWallet,
        newWallet
    );
}

/// @notice Updates the Community Rewards wallet.
function updateCommunityWallet(address newWallet)
    external
    onlyOwner
    validAddress(newWallet)
{
    address oldWallet = communityWallet;

    communityWallet = newWallet;

    emit WalletUpdated(
        "Community",
        oldWallet,
        newWallet
    );
}
/// @notice Updates the Liquidity wallet.
function updateLiquidityWallet(address newWallet)
    external
    onlyOwner
    validAddress(newWallet)
{
    address oldWallet = liquidityWallet;

    liquidityWallet = newWallet;

    emit WalletUpdated(
        "Liquidity",
        oldWallet,
        newWallet
    );
}

/// @notice Updates the Development wallet.
function updateDevelopmentWallet(address newWallet)
    external
    onlyOwner
    validAddress(newWallet)
{
    address oldWallet = developmentWallet;

    developmentWallet = newWallet;

    emit WalletUpdated(
        "Development",
        oldWallet,
        newWallet
    );
}

/// @notice Updates the Strategic Reserve wallet.
function updateReserveWallet(address newWallet)
    external
    onlyOwner
    validAddress(newWallet)
{
    address oldWallet = reserveWallet;

    reserveWallet = newWallet;

    emit WalletUpdated(
        "Reserve",
        oldWallet,
        newWallet
    );
}

/// @notice Updates the Founding Team wallet.
function updateTeamWallet(address newWallet)
    external
    onlyOwner
    validAddress(newWallet)
{
    address oldWallet = teamWallet;

    teamWallet = newWallet;

    emit WalletUpdated(
        "Team",
        oldWallet,
        newWallet
    );
}

/// @notice Returns the display name for an allocation type.
function _allocationName(
    AllocationType allocationType
)
    internal
    pure
    returns (string memory)
{
    if (allocationType == AllocationType.Ecosystem)
        return "Ecosystem";

    if (allocationType == AllocationType.Community)
        return "Community";

    if (allocationType == AllocationType.Liquidity)
        return "Liquidity";

    if (allocationType == AllocationType.Development)
        return "Development";

    if (allocationType == AllocationType.Reserve)
        return "Reserve";

    return "Team";
}

/// @notice Internal helper for token distribution.
function _distribute(
    uint256 amount,
    uint256 distributed,
    uint256 allocation,
    address recipient,
    AllocationType allocationType
)
    internal
    returns (uint256)
{
   if (distributed + amount > allocation) {

    if (allocationType == AllocationType.Ecosystem)
        revert EcosystemAllocationExceeded();

    if (allocationType == AllocationType.Community)
        revert CommunityAllocationExceeded();

    if (allocationType == AllocationType.Liquidity)
        revert LiquidityAllocationExceeded();

    if (allocationType == AllocationType.Development)
        revert DevelopmentAllocationExceeded();

    if (allocationType == AllocationType.Reserve)
        revert ReserveAllocationExceeded();

    revert TeamAllocationExceeded();
}
    if (lgcToken.balanceOf(address(this)) < amount)
        revert InsufficientTreasuryBalance();

    lgcToken.safeTransfer(
        recipient,
        amount
    );

    emit TokensDistributed(
    _allocationName(allocationType),
    recipient,
    amount
);

    return distributed + amount;
}

    /// @notice Distributes Ecosystem Treasury tokens.
/// @param amount Amount of LGC to distribute.
/// @notice Distributes Ecosystem Treasury tokens.
function distributeEcosystem(uint256 amount)
    external
    onlyOwner
    whenNotPaused
    nonReentrant
{
    ecosystemDistributed = _distribute(
        amount,
        ecosystemDistributed,
        ECOSYSTEM_ALLOCATION,
        ecosystemWallet,
        AllocationType.Ecosystem
    );
}

/// @notice Distributes Community Rewards tokens.
/// @param amount Amount of LGC to distribute.
function distributeCommunity(uint256 amount)
    external
    onlyOwner
     whenNotPaused
     nonReentrant
{
   communityDistributed = _distribute(
    amount,
    communityDistributed,
    COMMUNITY_ALLOCATION,
    communityWallet,
    AllocationType.Community
);
   
}

/// @notice Distributes Liquidity tokens.
/// @param amount Amount of LGC to distribute.
function distributeLiquidity(uint256 amount)
    external
    onlyOwner
     whenNotPaused
     nonReentrant
{
   liquidityDistributed = _distribute(
    amount,
    liquidityDistributed,
    LIQUIDITY_ALLOCATION,
    liquidityWallet,
    AllocationType.Liquidity
);

   
}

/// @notice Distributes Development tokens.
/// @param amount Amount of LGC to distribute.
function distributeDevelopment(uint256 amount)
    external
    onlyOwner
     whenNotPaused
     nonReentrant
{
   developmentDistributed = _distribute(
    amount,
    developmentDistributed,
    DEVELOPMENT_ALLOCATION,
    developmentWallet,
    AllocationType.Development
);
   
}

/// @notice Distributes Strategic Reserve tokens.
/// @param amount Amount of LGC to distribute.
function distributeReserve(uint256 amount)
    external
    onlyOwner
     whenNotPaused
     nonReentrant
{
   reserveDistributed = _distribute(
    amount,
    reserveDistributed,
    RESERVE_ALLOCATION,
    reserveWallet,
    AllocationType.Reserve
);

}

/// @notice Distributes Founding Team tokens.
/// @param amount Amount of LGC to distribute.
function distributeTeam(uint256 amount)
    external
    onlyOwner
     whenNotPaused
     nonReentrant
{
    teamDistributed = _distribute(
    amount,
    teamDistributed,
    TEAM_ALLOCATION,
    teamWallet,
    AllocationType.Team
);
    
}

/// @notice Returns the remaining Ecosystem allocation.
function remainingEcosystemAllocation()
    public
    view
    returns (uint256)
{
    return ECOSYSTEM_ALLOCATION - ecosystemDistributed;
}

/// @notice Returns the remaining Community allocation.
function remainingCommunityAllocation()
    public
    view
    returns (uint256)
{
    return COMMUNITY_ALLOCATION - communityDistributed;
}

/// @notice Returns the remaining Liquidity allocation.
function remainingLiquidityAllocation()
    public
    view
    returns (uint256)
{
    return LIQUIDITY_ALLOCATION - liquidityDistributed;
}

/// @notice Returns the remaining Development allocation.
function remainingDevelopmentAllocation()
    public
    view
    returns (uint256)
{
    return DEVELOPMENT_ALLOCATION - developmentDistributed;
}

/// @notice Returns the remaining Reserve allocation.
function remainingReserveAllocation()
    public
    view
    returns (uint256)
{
    return RESERVE_ALLOCATION - reserveDistributed;
}

/// @notice Returns the remaining Team allocation.
function remainingTeamAllocation()
    public
    view
    returns (uint256)
{
    return TEAM_ALLOCATION - teamDistributed;
}


/// @notice Returns the current LGC balance held by the treasury.
function treasuryBalance()
    public
    view
    returns (uint256)
{
    return lgcToken.balanceOf(address(this));
}

/// @notice Recovers ERC20 tokens accidentally sent to the treasury.
/// @dev Living God Coin itself cannot be recovered.
/// @param token ERC20 token address.
/// @param recipient Recipient of recovered tokens.
/// @param amount Amount to recover.
function recoverERC20(
    IERC20 token,
    address recipient,
    uint256 amount
   
)
    external
    onlyOwner
    validAddress(recipient)
     nonReentrant
{
    if (address(token) == address(lgcToken))
    revert CannotRecoverLGC();

    token.safeTransfer(
        recipient,
        amount
    );

    emit RecoveredToken(
        address(token),
        recipient,
        amount
    );
}

/// -----------------------------------------------------------------------
/// Dashboard Functions
/// -----------------------------------------------------------------------



/// @notice Returns the total amount distributed across all allocations.
function totalDistributed()
    public
    view
    returns (uint256)
{
    return
        ecosystemDistributed +
        communityDistributed +
        liquidityDistributed +
        developmentDistributed +
        reserveDistributed +
        teamDistributed;
}

/// @notice Returns the total remaining allocation.
function totalRemainingAllocation()
    public
    view
    returns (uint256)
{
    return
        remainingEcosystemAllocation() +
        remainingCommunityAllocation() +
        remainingLiquidityAllocation() +
        remainingDevelopmentAllocation() +
        remainingReserveAllocation() +
        remainingTeamAllocation();
}

/// @notice Returns the percentage of Ecosystem allocation distributed.
function ecosystemProgress()
    public
    view
    returns (uint256)
{
    return (ecosystemDistributed * 100) / ECOSYSTEM_ALLOCATION;
}

/// @notice Returns the percentage of Community allocation distributed.
function communityProgress()
    public
    view
    returns (uint256)
{
    return (communityDistributed * 100) / COMMUNITY_ALLOCATION;
}

/// @notice Returns the percentage of Liquidity allocation distributed.
function liquidityProgress()
    public
    view
    returns (uint256)
{
    return (liquidityDistributed * 100) / LIQUIDITY_ALLOCATION;
}

/// @notice Returns the percentage of Development allocation distributed.
function developmentProgress()
    public
    view
    returns (uint256)
{
    return (developmentDistributed * 100) / DEVELOPMENT_ALLOCATION;
}

/// @notice Returns the percentage of Reserve allocation distributed.
function reserveProgress()
    public
    view
    returns (uint256)
{
    return (reserveDistributed * 100) / RESERVE_ALLOCATION;
}

/// @notice Returns the percentage of Team allocation distributed.
function teamProgress()
    public
    view
    returns (uint256)
{
    return (teamDistributed * 100) / TEAM_ALLOCATION;
}



/// @notice Returns the total treasury allocation.
function totalAllocation()
    public
    pure
    returns (uint256)
{
    return
        ECOSYSTEM_ALLOCATION +
        COMMUNITY_ALLOCATION +
        LIQUIDITY_ALLOCATION +
        DEVELOPMENT_ALLOCATION +
        RESERVE_ALLOCATION +
        TEAM_ALLOCATION;
}

function distributionPercentage()
    public
    view
    returns (uint256)
{
    return (totalDistributed() * 100) / totalAllocation();
}

/// @notice Returns whether the treasury still holds LGC.
function hasTreasuryBalance()
    public
    view
    returns (bool)
{
    return treasuryBalance() > 0;
}

/// @notice Returns all distributed amounts.
function distributedAmounts()
    public
    view
    returns (
        uint256 ecosystem,
        uint256 community,
        uint256 liquidity,
        uint256 development,
        uint256 reserve,
        uint256 team
    )
{
    return (
        ecosystemDistributed,
        communityDistributed,
        liquidityDistributed,
        developmentDistributed,
        reserveDistributed,
        teamDistributed
    );
}

/// @notice Returns all remaining allocations.
function remainingAllocations()
    public
    view
    returns (
        uint256 ecosystem,
        uint256 community,
        uint256 liquidity,
        uint256 development,
        uint256 reserve,
        uint256 team
    )
{
    return (
        remainingEcosystemAllocation(),
        remainingCommunityAllocation(),
        remainingLiquidityAllocation(),
        remainingDevelopmentAllocation(),
        remainingReserveAllocation(),
        remainingTeamAllocation()
    );
}

/// @notice Returns all allocation progress percentages.
function allocationProgress()
    public
    view
    returns (
        uint256 ecosystem,
        uint256 community,
        uint256 liquidity,
        uint256 development,
        uint256 reserve,
        uint256 team,
        uint256 treasury
    )
{
    return (
        ecosystemProgress(),
        communityProgress(),
        liquidityProgress(),
        developmentProgress(),
        reserveProgress(),
        teamProgress(),
        treasuryProgress()
    );
}

/// @notice Returns the percentage of the total treasury allocation distributed.
function treasuryProgress()
    public
    view
    returns (uint256)
{
    return (totalDistributed() * 100) / totalAllocation();
}

/// @notice Returns whether every allocation has been fully distributed.
function isTreasuryFullyDistributed()
    public
    view
    returns (bool)
{
    return totalRemainingAllocation() == 0;
}

/// @notice Returns a treasury dashboard summary.
function treasuryStatistics()
    public
    view
    returns (
        uint256 balance,
        uint256 distributed,
        uint256 remaining,
        uint256 allocation,
        uint256 progress
    )
{
    return (
        treasuryBalance(),
        totalDistributed(),
        totalRemainingAllocation(),
        totalAllocation(),
        treasuryProgress()
    );
}

/// @notice Returns whether an allocation has been fully distributed.
function isAllocationExhausted(
    AllocationType allocation
)
    public
    view
    returns (bool)
{
    (, , , , bool exhausted) =
        getAllocationInfo(allocation);

    return exhausted;
}
/// @notice Returns complete information about a treasury allocation.
function getAllocationInfo(
    AllocationType allocation
)
    public
    view
    returns (
        uint256 allocated,
        uint256 distributed,
        uint256 remaining,
        uint256 progress,
        bool exhausted
    )
{
    
       
    if (allocation == AllocationType.Ecosystem) {
        allocated = ECOSYSTEM_ALLOCATION;
        distributed = ecosystemDistributed;
    } else if (allocation == AllocationType.Community) {
        allocated = COMMUNITY_ALLOCATION;
        distributed = communityDistributed;
    } else if (allocation == AllocationType.Liquidity) {
        allocated = LIQUIDITY_ALLOCATION;
        distributed = liquidityDistributed;
    } else if (allocation == AllocationType.Development) {
        allocated = DEVELOPMENT_ALLOCATION;
        distributed = developmentDistributed;
    } else if (allocation == AllocationType.Reserve) {
        allocated = RESERVE_ALLOCATION;
        distributed = reserveDistributed;
    } else if (allocation == AllocationType.Team) {
    allocated = TEAM_ALLOCATION;
    distributed = teamDistributed;
} else {
    revert InvalidAllocation();
}

    remaining = allocated - distributed;
    progress = (distributed * 100) / allocated;
    exhausted = (remaining == 0);
}

/// @notice Returns complete treasury dashboard statistics.
function getTreasuryDashboard()
    public
    view
    returns (
        uint256 treasury,
        uint256 totalAllocation_,
        uint256 distributed,
        uint256 remaining,
        uint256 progress,
        bool fullyDistributed
    )
{
    treasury = treasuryBalance();
    totalAllocation_ = totalAllocation();
    distributed = totalDistributed();
    remaining = totalRemainingAllocation();
    progress = distributionPercentage();
    fullyDistributed = isTreasuryFullyDistributed();
}

/// @notice Returns information for every treasury allocation.
function getAllAllocations()
    public
    view
    returns (
        AllocationInfo memory ecosystem,
        AllocationInfo memory community,
        AllocationInfo memory liquidity,
        AllocationInfo memory development,
        AllocationInfo memory reserve,
        AllocationInfo memory team
    )
{
    (
        ecosystem.allocated,
        ecosystem.distributed,
        ecosystem.remaining,
        ecosystem.progress,
        ecosystem.exhausted
    ) = getAllocationInfo(AllocationType.Ecosystem);

    (
        community.allocated,
        community.distributed,
        community.remaining,
        community.progress,
        community.exhausted
    ) = getAllocationInfo(AllocationType.Community);

    (
        liquidity.allocated,
        liquidity.distributed,
        liquidity.remaining,
        liquidity.progress,
        liquidity.exhausted
    ) = getAllocationInfo(AllocationType.Liquidity);

    (
        development.allocated,
        development.distributed,
        development.remaining,
        development.progress,
        development.exhausted
    ) = getAllocationInfo(AllocationType.Development);

    (
        reserve.allocated,
        reserve.distributed,
        reserve.remaining,
        reserve.progress,
        reserve.exhausted
    ) = getAllocationInfo(AllocationType.Reserve);

    (
        team.allocated,
        team.distributed,
        team.remaining,
        team.progress,
        team.exhausted
    ) = getAllocationInfo(AllocationType.Team);
}
}