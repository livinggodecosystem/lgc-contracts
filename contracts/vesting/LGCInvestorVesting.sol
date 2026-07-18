// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {LGCLaunchRegistry} from "../launch/LGCLaunchRegistry.sol";

contract LGCInvestorVesting is
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
    // Errors
    //-------------------------------------------------

    error InvalidOwner();
    error InvalidToken();
    error InvalidRegistry();
    error InvalidBeneficiary();
    error InvalidAmount();
    error InvalidDuration();
    error InvalidCliff();
    error BeneficiaryExists();
    error BeneficiaryNotFound();
    error NothingToClaim();
    error LaunchNotActive();
    error AlreadyRevoked();
    error InvestorAlreadyRevoked();
    error InvestorNotRevocable();
    error CannotRecoverLGC();
    error InsufficientETHBalance();

    //-------------------------------------------------
    // Events
    //-------------------------------------------------

    event InvestorAdded(
        address indexed beneficiary,
        uint256 allocation
    );

    event InvestorRemoved(
        address indexed beneficiary
    );

    event InvestorFunded(
        address indexed sender,
        uint256 amount
    );

    event TokensClaimed(
        address indexed beneficiary,
        uint256 amount
    );

    event InvestorRevoked(
        address indexed beneficiary
    );

    event RecoveredToken(
    address indexed token,
    address indexed recipient,
    uint256 amount
    );

   event RecoveredETH(
    address indexed recipient,
    uint256 amount
    );
    

    //-------------------------------------------------
    // Investor Structure
    //-------------------------------------------------

    struct Investor {

        uint256 allocation;

        uint256 released;

        uint256 cliff;

        uint256 duration;

        bool revocable;

        bool revoked;

        bool exists;

    }

    //-------------------------------------------------
    // Storage
    //-------------------------------------------------

    mapping(address => Investor)
        public investors;

    uint256 public totalAllocated;

    uint256 public totalReleased;

    //-------------------------------------------------
    // Constructor
    //-------------------------------------------------

    constructor(

        address initialOwner,

        IERC20 tokenAddress,

        LGCLaunchRegistry registry

    )
        Ownable(initialOwner)
    {

        if (initialOwner == address(0))
            revert InvalidOwner();

        if (address(tokenAddress) == address(0))
            revert InvalidToken();

        if (address(registry) == address(0))
            revert InvalidRegistry();

        lgcToken = tokenAddress;

        launchRegistry = registry;

        deployedAt = block.timestamp;
    }
    //-------------------------------------------------
// Investor Management
//-------------------------------------------------

/// @notice Adds a new investor vesting agreement.
function addInvestor(

    address beneficiary,

    uint256 allocation,

    uint256 cliff,

    uint256 duration,

    bool revocable

)
    external
    onlyOwner
{

    if (beneficiary == address(0))
        revert InvalidBeneficiary();

    if (allocation == 0)
        revert InvalidAmount();

    if (duration == 0)
        revert InvalidDuration();

    if (cliff > duration)
        revert InvalidCliff();

    if (investors[beneficiary].exists)
        revert BeneficiaryExists();

    investors[beneficiary] = Investor({

        allocation: allocation,

        released: 0,

        cliff: cliff,

        duration: duration,

        revocable: revocable,

        revoked: false,

        exists: true

    });

    totalAllocated += allocation;

    emit InvestorAdded(
        beneficiary,
        allocation
    );

}

/// @notice Removes an investor before any tokens are claimed.
function removeInvestor(

    address beneficiary

)
    external
    onlyOwner
{

    Investor storage investor =
        investors[beneficiary];

    if (!investor.exists)
        revert BeneficiaryNotFound();

    if (investor.released > 0)
        revert InvalidAmount();

    totalAllocated -= investor.allocation;

    delete investors[beneficiary];

    emit InvestorRemoved(
        beneficiary
    );

}

//-------------------------------------------------
// Funding
//-------------------------------------------------

function fundInvestorVesting(
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

    emit InvestorFunded(

        msg.sender,

        amount

    );

}

//-------------------------------------------------
// Vesting Calculation
//-------------------------------------------------

function vestedAmount(
    address beneficiary
)
    public
    view
    returns (uint256)
{
    Investor memory investor =
        investors[beneficiary];

    if (!investor.exists)
        return 0;

    if (!launchRegistry.launchActivated())
        return 0;

    if (investor.revoked)
        return investor.released;

    uint256 launchTime =
        launchRegistry.officialLaunchTime();

    uint256 elapsed =
        block.timestamp - launchTime;

    //-------------------------------------
    // Before Cliff
    //-------------------------------------

    if (elapsed < investor.cliff)
        return 0;

    //-------------------------------------
    // Fully Vested
    //-------------------------------------

    if (elapsed >= investor.duration)
        return investor.allocation;

    //-------------------------------------
    // Linear Vesting
    //-------------------------------------

    return
        (investor.allocation * elapsed)
        / investor.duration;
}

//-------------------------------------------------
// Dashboard
//-------------------------------------------------

function claimableAmount(
    address beneficiary
)
    public
    view
    returns (uint256)
{
    Investor memory investor =
        investors[beneficiary];

    if (!investor.exists)
        return 0;

    uint256 vested =
        vestedAmount(beneficiary);

    if (vested <= investor.released)
        return 0;

    return vested - investor.released;
}

function remainingAllocation(
    address beneficiary
)
    public
    view
    returns (uint256)
{
    Investor memory investor =
        investors[beneficiary];

    if (!investor.exists)
        return 0;

    return
        investor.allocation -
        investor.released;
}


function vestingProgress(
    address beneficiary
)
    public
    view
    returns (uint256)
{
    Investor memory investor =
        investors[beneficiary];

    if (!investor.exists)
        return 0;

    if (investor.allocation == 0)
        return 0;

    return
        (investor.released * 100)
        / investor.allocation;
}


function getInvestorInfo(
    address beneficiary
)
    external
    view
    returns (

        uint256 allocation,

        uint256 released,

        uint256 vested,

        uint256 claimable,

        bool revoked,

        bool revocable,

        bool exists

    )
{
    Investor memory investor =
        investors[beneficiary];

    return (

        investor.allocation,

        investor.released,

        vestedAmount(beneficiary),

        claimableAmount(beneficiary),

        investor.revoked,

        investor.revocable,

        investor.exists

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
    Investor storage investor =
        investors[msg.sender];

    if (!investor.exists)
        revert BeneficiaryNotFound();

    if (!launchRegistry.isLaunchActive())
        revert LaunchNotActive();

    uint256 vested =
        vestedAmount(msg.sender);

    uint256 claimable =
        vested - investor.released;

    if (claimable == 0)
        revert NothingToClaim();

    investor.released += claimable;

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
// Revocation
//-------------------------------------------------

function revokeInvestor(
    address beneficiary
)
    external
    onlyOwner
{
    Investor storage investor =
        investors[beneficiary];

    if (!investor.exists)
        revert BeneficiaryNotFound();

    if (!investor.revocable)
        revert InvestorNotRevocable();

    if (investor.revoked)
        revert InvestorAlreadyRevoked();

    investor.revoked = true;

    emit InvestorRevoked(
        beneficiary
    );
}

//-------------------------------------------------
// Pause Control
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

//-------------------------------------------------
// Recovery
//-------------------------------------------------

function recoverERC20(
    address token,
    address recipient,
    uint256 amount
)
    external
    onlyOwner
{
    if (token == address(lgcToken))
        revert CannotRecoverLGC();

    IERC20(token).safeTransfer(
        recipient,
        amount
    );

    emit RecoveredToken(
        token,
        recipient,
        amount
    );
}

function recoverETH(
    address payable recipient,
    uint256 amount
)
    external
    onlyOwner
{
    if (
        address(this).balance < amount
    )
        revert InsufficientETHBalance();

    (bool success,) =
        recipient.call{value: amount}("");

    require(success);

    emit RecoveredETH(
        recipient,
        amount
    );
}

receive() external payable {}



}