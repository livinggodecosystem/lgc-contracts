// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Living God Coin Vesting
/// @author Living God Ecosystem
/// @notice Secure vesting contract for Living God Coin.
/// @dev Supports multiple beneficiaries, cliff periods, and linear vesting schedules.

contract LGCVesting is Ownable, ReentrancyGuard{
    using SafeERC20 for IERC20;

    /// -----------------------------------------------------------------------
    /// Version Information
    /// -----------------------------------------------------------------------

    string public constant VERSION = "1.2.0";

    uint256 public immutable deployedAt;

    IERC20 public immutable lgcToken;

    /// -----------------------------------------------------------------------
    /// Vesting Structures
    /// -----------------------------------------------------------------------

    struct VestingSchedule {
        uint256 id;
        address beneficiary;
        uint256 totalAmount;
        uint256 releasedAmount;
        uint64 startTime;
        uint64 cliffDuration;
        uint64 vestingDuration;
        bool revoked;
        bool initialized;
    }

    /// -----------------------------------------------------------------------
    /// Storage
    /// -----------------------------------------------------------------------

    uint256 public totalSchedules;

    uint256 public totalLocked;

    uint256 public totalReleased;

    mapping(uint256 => VestingSchedule) public vestingSchedules;

    mapping(address => uint256[]) public beneficiarySchedules;

    /// -----------------------------------------------------------------------
    /// Custom Errors
    /// -----------------------------------------------------------------------

    error InvalidToken();
    error InvalidBeneficiary();
    error InvalidAmount();
    error InvalidDuration();
    error InvalidCliff();
    error ScheduleNotFound();
    error NothingToRelease();
    error ScheduleNotRevocable();
    error NotBeneficiary();
    error ScheduleAlreadyRevoked();
    error CannotRecoverLGC();
    error InvalidStartTime();
    error InsufficientVestingBalance();

    /// -----------------------------------------------------------------------
    /// Events
    /// -----------------------------------------------------------------------

    event VestingScheduleCreated(
        uint256 indexed scheduleId,
        address indexed beneficiary,
        uint256 amount
    );

    event TokensReleased(
        uint256 indexed scheduleId,
        address indexed beneficiary,
        uint256 amount
    );

    event ScheduleRevoked(
    uint256 indexed scheduleId,
    uint256 unreleasedAmount
);

event EmergencyTokenRecovered(
    address indexed token,
    address indexed to,
    uint256 amount
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
        deployedAt = block.timestamp;
    }

    /// -----------------------------------------------------------------------
    /// Schedule Creation
    /// -----------------------------------------------------------------------

    function createVestingSchedule(
        address beneficiary,
        uint256 amount,
        uint64 startTime,
        uint64 cliffDuration,
        uint64 vestingDuration
    )
        external
        onlyOwner
    {

        if (totalLocked + amount > lgcToken.balanceOf(address(this)))
    revert InsufficientVestingBalance();

        if (beneficiary == address(0))
            revert InvalidBeneficiary();
            
        if (amount == 0)
            revert InvalidAmount();

        if (startTime < block.timestamp)
    revert InvalidStartTime();

        if (vestingDuration == 0)
            revert InvalidDuration();

        if (cliffDuration > vestingDuration)
            revert InvalidCliff();

        uint256 scheduleId = totalSchedules;

        vestingSchedules[scheduleId] = VestingSchedule({
            id: scheduleId,
            beneficiary: beneficiary,
            totalAmount: amount,
            releasedAmount: 0,
            startTime: startTime,
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            revoked: false,
            initialized: true
        });

        beneficiarySchedules[beneficiary].push(scheduleId);

        totalLocked += amount;

        totalSchedules++;

        emit VestingScheduleCreated(
            scheduleId,
            beneficiary,
            amount
        );
    }
    
    /// @notice Returns the amount of tokens that have vested for a schedule.
/// @param scheduleId The vesting schedule ID.
/// @return vestedAmount Amount of vested tokens.
function calculateVestedAmount(
    uint256 scheduleId
)
    public
    view
    returns (uint256 vestedAmount)
{
    VestingSchedule storage schedule = vestingSchedules[scheduleId];

    if (!schedule.initialized)
        revert ScheduleNotFound();

    if (schedule.revoked)
        return schedule.releasedAmount;

    uint256 cliffEnd =
        uint256(schedule.startTime) +
        uint256(schedule.cliffDuration);

    if (block.timestamp < cliffEnd)
        return 0;

    uint256 vestingEnd =
        uint256(schedule.startTime) +
        uint256(schedule.vestingDuration);

    if (block.timestamp >= vestingEnd)
        return schedule.totalAmount;

    uint256 elapsed =
        block.timestamp -
        uint256(schedule.startTime);

    vestedAmount =
        (schedule.totalAmount * elapsed) /
        uint256(schedule.vestingDuration);
}

/// @notice Returns the amount of tokens currently claimable.
/// @param scheduleId The vesting schedule ID.
/// @return claimableAmount Amount of claimable tokens.
function calculateReleasableAmount(
    uint256 scheduleId
)
    public
    view
    returns (uint256 claimableAmount)
{
    VestingSchedule storage schedule =
        vestingSchedules[scheduleId];

    uint256 vested =
        calculateVestedAmount(scheduleId);

    claimableAmount =
        vested -
        schedule.releasedAmount;
}


/// @notice Releases vested tokens to the beneficiary.
/// @param scheduleId The vesting schedule ID.
function releaseTokens(
    uint256 scheduleId
)
    external
    nonReentrant
{
    VestingSchedule storage schedule =
        vestingSchedules[scheduleId];

    if (!schedule.initialized)
        revert ScheduleNotFound();

    if (msg.sender != schedule.beneficiary)
        revert NotBeneficiary();

    uint256 claimable =
        calculateReleasableAmount(scheduleId);

    if (claimable == 0)
        revert NothingToRelease();

    schedule.releasedAmount += claimable;

    totalLocked -= claimable;
    totalReleased += claimable;

    lgcToken.safeTransfer(
        schedule.beneficiary,
        claimable
    );

    emit TokensReleased(
        scheduleId,
        schedule.beneficiary,
        claimable
    );
}

/// @notice Revokes a vesting schedule.
/// @param scheduleId The vesting schedule ID.
function revokeSchedule(
    uint256 scheduleId
)
    external
    onlyOwner
{
    VestingSchedule storage schedule =
        vestingSchedules[scheduleId];

    if (!schedule.initialized)
        revert ScheduleNotFound();

    if (schedule.revoked)
        revert ScheduleAlreadyRevoked();

    if (schedule.releasedAmount == schedule.totalAmount)
    revert ScheduleNotRevocable();    

    uint256 vested =
        calculateVestedAmount(scheduleId);

    uint256 unreleased =
        schedule.totalAmount - vested;

    schedule.revoked = true;

    if (unreleased > 0) {
        totalLocked -= unreleased;
    }

    emit ScheduleRevoked(
        scheduleId,
        unreleased
    );
}

/// @notice Allows the owner to recover tokens accidentally sent to this contract.
/// @dev The Living God Coin token itself cannot be recovered.

function recoverERC20(
    IERC20 token,
    address to,
    uint256 amount
)
    external
    nonReentrant
    onlyOwner
{
    if (address(token) == address(0))
        revert InvalidToken();

    if (address(token) == address(lgcToken))
    revert CannotRecoverLGC();

    if (to == address(0))
        revert InvalidBeneficiary();

    if (amount == 0)
        revert InvalidAmount();

    token.safeTransfer(to, amount);

    emit EmergencyTokenRecovered(
        address(token),
        to,
        amount
    );
}

    /// -----------------------------------------------------------------------
    /// View Functions
    /// -----------------------------------------------------------------------

/// @notice Returns whether a vesting schedule has been revoked.
function isRevoked(
    uint256 scheduleId
)
    public
    view
    returns (bool)
{
    VestingSchedule storage schedule =
        vestingSchedules[scheduleId];

    if (!schedule.initialized)
        revert ScheduleNotFound();

    return schedule.revoked;
}

/// @notice Returns true if a vesting schedule has fully vested.
function isFullyVested(
    uint256 scheduleId
)
    public
    view
    returns (bool)
{
    VestingSchedule storage schedule =
        vestingSchedules[scheduleId];

    if (!schedule.initialized)
        revert ScheduleNotFound();

    return block.timestamp >=
        uint256(schedule.startTime) +
        uint256(schedule.vestingDuration);
}

/// @notice Returns the remaining unreleased tokens for a schedule.
function remainingAllocation(
    uint256 scheduleId
)
    public
    view
    returns (uint256)
{
    VestingSchedule storage schedule =
        vestingSchedules[scheduleId];

    if (!schedule.initialized)
        revert ScheduleNotFound();

    return schedule.totalAmount -
        schedule.releasedAmount;
}

/// @notice Returns the total tokens released for a schedule.
function releasedAmount(
    uint256 scheduleId
)
    public
    view
    returns (uint256)
{
    VestingSchedule storage schedule =
        vestingSchedules[scheduleId];

    if (!schedule.initialized)
        revert ScheduleNotFound();

    return schedule.releasedAmount;
}

/// @notice Returns vesting progress in basis points (10000 = 100%).
function vestingProgress(
    uint256 scheduleId
)
    public
    view
    returns (uint256)
{
    VestingSchedule storage schedule =
        vestingSchedules[scheduleId];

    if (!schedule.initialized)
        revert ScheduleNotFound();

    if (schedule.totalAmount == 0)
        return 0;

    return
        (calculateVestedAmount(scheduleId) * 10000) /
        schedule.totalAmount;
}

    /// @notice Returns a vesting schedule.
    function getSchedule(
        uint256 scheduleId
    )
        public
        view
        returns (VestingSchedule memory)
    {
        VestingSchedule memory schedule = vestingSchedules[scheduleId];

        if (!schedule.initialized)
            revert ScheduleNotFound();

        return schedule;
    }

    /// @notice Returns the number of schedules owned by a beneficiary.
    function getBeneficiaryScheduleCount(
        address beneficiary
    )
        public
        view
        returns (uint256)
    {
        return beneficiarySchedules[beneficiary].length;
    }

    /// @notice Returns every schedule ID belonging to a beneficiary.
    function getBeneficiaryScheduleIds(
        address beneficiary
    )
        public
        view
        returns (uint256[] memory)
    {
        return beneficiarySchedules[beneficiary];
    }

    /// @notice Returns the total vested amount.
    function totalVested()
        public
        view
        returns (uint256)
    {
        return totalLocked;
    }

    /// @notice Returns the total released amount.
    function totalClaimed()
        public
        view
        returns (uint256)
    {
        return totalReleased;
    }

    /// @notice Returns the remaining locked amount.
    /// @notice Returns the remaining locked amount.
function totalRemainingLocked()
    public
    view
    returns (uint256)
{
    return totalLocked;
}

/// @notice Returns the total amount vested so far.
function totalCurrentlyVested()
    public
    view
    returns (uint256 vested)
{
    for (uint256 i = 0; i < totalSchedules; i++) {
        vested += calculateVestedAmount(i);
    }
}

function beneficiaryHasSchedules(
    address beneficiary
)
    public
    view
    returns (bool)
{
    return beneficiarySchedules[beneficiary].length > 0;
}

function remainingClaimable(
    uint256 scheduleId
)
    public
    view
    returns (uint256)
{
    return calculateReleasableAmount(scheduleId);
}
}