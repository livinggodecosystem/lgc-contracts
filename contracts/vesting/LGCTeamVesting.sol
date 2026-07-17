// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {LGCLaunchRegistry} from "../launch/LGCLaunchRegistry.sol";

contract LGCTeamVesting is
    Ownable,
    Pausable,
    ReentrancyGuard
{
    using SafeERC20 for IERC20;

    //-------------------------------------------------
    // Version
    //-------------------------------------------------

    string public constant VERSION = "1.0.0";

    //-------------------------------------------------
    // Immutable
    //-------------------------------------------------

    uint256 public immutable deployedAt;

    IERC20 public immutable lgcToken;

    LGCLaunchRegistry public immutable launchRegistry;

    //-------------------------------------------------
    // Team Wallet
    //-------------------------------------------------

    address public immutable teamWallet;

        error InvalidOwner();
    error InvalidToken();
    error InvalidRegistry();
    error InvalidWallet();
    error InvalidBeneficiary();
    error InvalidAmount();
    error BeneficiaryExists();
    error BeneficiaryNotFound();
    error NothingToClaim();
    error LaunchNotActive();

        event TeamMemberAdded(
        address indexed beneficiary,
        uint256 allocation
    );

    event TeamMemberRemoved(
        address indexed beneficiary
    );

    event TeamFunded(
        address indexed sender,
        uint256 amount
    );

    event TokensClaimed(
        address indexed beneficiary,
        uint256 amount
    );

        struct TeamMember {

        uint256 allocation;

        uint256 released;

        bool exists;
    }

    //-------------------------------------------------
// Vesting Constants
//-------------------------------------------------

uint256 public constant CLIFF = 180 days;

uint256 public constant FULL_VESTING = 730 days;



        mapping(address => TeamMember)
        public teamMembers;

    uint256 public totalAllocated;

    uint256 public totalReleased;


        constructor(

        address initialOwner,

        IERC20 tokenAddress,

        LGCLaunchRegistry registry,

        address teamWalletAddress

    )
        Ownable(initialOwner)
    {

        if (initialOwner == address(0))
            revert InvalidOwner();

        if (address(tokenAddress) == address(0))
            revert InvalidToken();

        if (address(registry) == address(0))
            revert InvalidRegistry();

        if (teamWalletAddress == address(0))
            revert InvalidWallet();

        lgcToken = tokenAddress;

        launchRegistry = registry;

        teamWallet = teamWalletAddress;

        deployedAt = block.timestamp;
    }

    //-------------------------------------------------
// Team Management
//-------------------------------------------------

/// @notice Adds a new team member allocation.
/// @param beneficiary Wallet receiving vested tokens.
/// @param allocation Total LGC allocation for this member.
function addTeamMember(
    address beneficiary,
    uint256 allocation
)
    external
    onlyOwner
{
    if (beneficiary == address(0))
        revert InvalidBeneficiary();

    if (allocation == 0)
        revert InvalidAmount();

    if (teamMembers[beneficiary].exists)
        revert BeneficiaryExists();

    teamMembers[beneficiary] = TeamMember({
        allocation: allocation,
        released: 0,
        exists: true
    });

    totalAllocated += allocation;

    emit TeamMemberAdded(
        beneficiary,
        allocation
    );
}

/// @notice Removes a team member before any tokens are claimed.
function removeTeamMember(
    address beneficiary
)
    external
    onlyOwner
{
    TeamMember storage member =
        teamMembers[beneficiary];

    if (!member.exists)
        revert BeneficiaryNotFound();

    if (member.released > 0)
        revert InvalidAmount();

    totalAllocated -= member.allocation;

    delete teamMembers[beneficiary];

    emit TeamMemberRemoved(
        beneficiary
    );
}


function vestedAmount(
    address beneficiary
)
    public
    view
    returns (uint256)
{
    TeamMember memory member =
        teamMembers[beneficiary];

    if (!member.exists)
        return 0;

    if (!launchRegistry.isLaunchActive())
        return 0;

    uint256 launchTime =
        launchRegistry.ecosystemLaunchTime();

    if (
        block.timestamp <
        launchTime + CLIFF
    )
        return 0;

    if (
        block.timestamp <
        launchTime + FULL_VESTING
    )
    {
        return
            (member.allocation * 30) / 100;
    }

    return member.allocation;
}


/// @notice Returns claimable tokens for a beneficiary.
function claimableAmount(
    address beneficiary
)
    public
    view
    returns (uint256)
{
    TeamMember memory member =
        teamMembers[beneficiary];

    if (!member.exists)
        return 0;

    uint256 vested =
        vestedAmount(beneficiary);

    if (vested <= member.released)
        return 0;

    return vested - member.released;
}



/// @notice Returns complete information about a team member.
function teamMemberInfo(
    address beneficiary
)
    external
    view
    returns (
        uint256 allocation,
        uint256 released,
        uint256 vested,
        uint256 claimable,
        bool exists
    )
{
    TeamMember memory member =
        teamMembers[beneficiary];

    return (
        member.allocation,
        member.released,
        vestedAmount(beneficiary),
        claimableAmount(beneficiary),
        member.exists
    );
}

//-------------------------------------------------
// Funding
//-------------------------------------------------

function fundTeamVesting(
    uint256 amount
)
    external
    onlyOwner
    nonReentrant
{
    if (amount == 0)
        revert InvalidAmount();

    lgcToken.safeTransferFrom(
        msg.sender,
        address(this),
        amount
    );

    emit TeamFunded(
        msg.sender,
        amount
    );
}


//-------------------------------------------------
// Claim
//-------------------------------------------------

function claim()
    external
    whenNotPaused
    nonReentrant
{
    TeamMember storage member =
        teamMembers[msg.sender];

    if (!member.exists)
        revert BeneficiaryNotFound();

    if (!launchRegistry.isLaunchActive())
    revert LaunchNotActive();

    uint256 launchTime =
    launchRegistry.ecosystemLaunchTime();

    uint256 vested;

    // -----------------------------------------
    // Before 6 months
    // -----------------------------------------

    if (
        block.timestamp <
        launchTime + 180 days
    ) {
        vested = 0;
    }

    // -----------------------------------------
    // 6 months → 2 years
    // Unlock 30%
    // -----------------------------------------

    else if (
        block.timestamp <
        launchTime + 730 days
    ) {
        vested =
            (member.allocation * 30) / 100;
    }

    // -----------------------------------------
    // After 2 years
    // Unlock 100%
    // -----------------------------------------

    else {
        vested = member.allocation;
    }

    uint256 claimable =
        vested - member.released;

    if (claimable == 0)
        revert NothingToClaim();

    member.released += claimable;

    totalReleased += claimable;

    lgcToken.safeTransfer(
        msg.sender,
        claimable
    );

    emit TokensClaimed(
        msg.sender,
        claimable
    );
}

//-------------------------------------------------
// Emergency
//-------------------------------------------------

function pause()
    external
    onlyOwner
{
    _pause();
}

function unpause()
    external
    onlyOwner
{
    _unpause();
}

}