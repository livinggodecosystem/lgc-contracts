// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title Living God Coin Treasury
/// @author Living God Ecosystem
/// @notice Manages the treasury allocations for the Living God Ecosystem.
/// @dev Holds LGC tokens and distributes them according to approved allocations.

contract LGCTreasury is Ownable, Pausable  {

    using SafeERC20 for IERC20;

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

/// @notice Ensures a wallet address is valid.
modifier validAddress(address newWallet) {
    require(newWallet != address(0), "Invalid wallet");
    _;
}

/// @notice Pause the treasury in case of emergency.
function pause()
    external
    onlyOwner
{
    _pause();
}

/// @notice Resume treasury operations.
function unpause()
    external
    onlyOwner
{
    _unpause();
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

        require(address(tokenAddress) != address(0), "Invalid token");

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

    /// @notice Distributes Ecosystem Treasury tokens.
/// @param amount Amount of LGC to distribute.
function distributeEcosystem(uint256 amount)
    external
    onlyOwner
     whenNotPaused
{
    require(
        ecosystemDistributed + amount <= ECOSYSTEM_ALLOCATION,
        "Ecosystem allocation exceeded"
    );

    require(
        lgcToken.balanceOf(address(this)) >= amount,
        "Insufficient treasury balance"
    );

    ecosystemDistributed += amount;

    lgcToken.safeTransfer(ecosystemWallet, amount);

    emit TokensDistributed(
        "Ecosystem",
        ecosystemWallet,
        amount
    );

   
}

/// @notice Distributes Community Rewards tokens.
/// @param amount Amount of LGC to distribute.
function distributeCommunity(uint256 amount)
    external
    onlyOwner
     whenNotPaused
{
    require(
        communityDistributed + amount <= COMMUNITY_ALLOCATION,
        "Community allocation exceeded"
    );

    require(
        lgcToken.balanceOf(address(this)) >= amount,
        "Insufficient treasury balance"
    );

    communityDistributed += amount;

    lgcToken.safeTransfer(communityWallet, amount);

    emit TokensDistributed(
        "Community",
        communityWallet,
        amount
    );
   
}

/// @notice Distributes Liquidity tokens.
/// @param amount Amount of LGC to distribute.
function distributeLiquidity(uint256 amount)
    external
    onlyOwner
     whenNotPaused
{
    require(
        liquidityDistributed + amount <= LIQUIDITY_ALLOCATION,
        "Liquidity allocation exceeded"
    );

    require(
        lgcToken.balanceOf(address(this)) >= amount,
        "Insufficient treasury balance"
    );

    liquidityDistributed += amount;

    lgcToken.safeTransfer(liquidityWallet, amount);

    emit TokensDistributed(
        "Liquidity",
        liquidityWallet,
        amount
    );

   
}

/// @notice Distributes Development tokens.
/// @param amount Amount of LGC to distribute.
function distributeDevelopment(uint256 amount)
    external
    onlyOwner
     whenNotPaused
{
    require(
        developmentDistributed + amount <= DEVELOPMENT_ALLOCATION,
        "Development allocation exceeded"
    );

    require(
        lgcToken.balanceOf(address(this)) >= amount,
        "Insufficient treasury balance"
    );

    developmentDistributed += amount;

    lgcToken.safeTransfer(developmentWallet, amount);

    emit TokensDistributed(
        "Development",
        developmentWallet,
        amount
    );

    
}

/// @notice Distributes Strategic Reserve tokens.
/// @param amount Amount of LGC to distribute.
function distributeReserve(uint256 amount)
    external
    onlyOwner
     whenNotPaused
{
    require(
        reserveDistributed + amount <= RESERVE_ALLOCATION,
        "Reserve allocation exceeded"
    );

    require(
        lgcToken.balanceOf(address(this)) >= amount,
        "Insufficient treasury balance"
    );

    reserveDistributed += amount;

    lgcToken.safeTransfer(reserveWallet, amount);

    emit TokensDistributed(
        "Reserve",
        reserveWallet,
        amount
    );

  
}

/// @notice Distributes Founding Team tokens.
/// @param amount Amount of LGC to distribute.
function distributeTeam(uint256 amount)
    external
    onlyOwner
     whenNotPaused
{
    require(
        teamDistributed + amount <= TEAM_ALLOCATION,
        "Team allocation exceeded"
    );

    require(
        lgcToken.balanceOf(address(this)) >= amount,
        "Insufficient treasury balance"
    );

    teamDistributed += amount;

    lgcToken.safeTransfer(teamWallet, amount);

    emit TokensDistributed(
        "Team",
        teamWallet,
        amount
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

/// @notice Returns remaining Ecosystem allocation.
function ecosystemRemaining()
    public
    view
    returns (uint256)
{
    return ECOSYSTEM_ALLOCATION - ecosystemDistributed;
}

/// @notice Returns remaining Community allocation.
function communityRemaining()
    public
    view
    returns (uint256)
{
    return COMMUNITY_ALLOCATION - communityDistributed;
}

/// @notice Returns remaining Liquidity allocation.
function liquidityRemaining()
    public
    view
    returns (uint256)
{
    return LIQUIDITY_ALLOCATION - liquidityDistributed;
}

/// @notice Returns remaining Development allocation.
function developmentRemaining()
    public
    view
    returns (uint256)
{
    return DEVELOPMENT_ALLOCATION - developmentDistributed;
}

/// @notice Returns remaining Reserve allocation.
function reserveRemaining()
    public
    view
    returns (uint256)
{
    return RESERVE_ALLOCATION - reserveDistributed;
}

/// @notice Returns remaining Team allocation.
function teamRemaining()
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
{
    require(
        address(token) != address(lgcToken),
        "Cannot recover LGC"
    );

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
}