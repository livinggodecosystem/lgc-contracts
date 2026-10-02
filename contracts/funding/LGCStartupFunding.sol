// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LGCStartupFunding
 * @notice Milestone-based startup funding infrastructure for the
 *         Living God Ecosystem.
 *
 * @dev
 * The deployer is the initial owner.
 *
 * Ownership can later be transferred manually to the LGC governance
 * contract when the ecosystem and community are ready.
 *
 * The contract supports approved ERC-20/BEP-20 funding assets.
 *
 * Each startup project is fully funded when it is created. The project's
 * allocation is then protected inside this contract and released only
 * through approved milestones.
 */
contract LGCStartupFunding is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    string public constant VERSION = "1.0.0";

    uint256 public constant MAX_MILESTONES = 20;

    enum ProjectStatus {
        Active,
        Completed,
        Cancelled
    }

    enum MilestoneStatus {
        Pending,
        Approved,
        Released,
        Cancelled
    }

    struct Project {
        address beneficiary;
        address fundingToken;
        uint256 totalApproved;
        uint256 totalReleased;
        uint256 milestoneCount;
        uint256 createdAt;
        ProjectStatus status;
    }

    struct Milestone {
        uint256 amount;
        MilestoneStatus status;
    }

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error ZeroAddress();
    error ZeroAmount();

    error TokenNotApproved();
    error TokenAlreadyApproved();
    error TokenAlreadyDisabled();

    error InvalidMilestoneCount();
    error InvalidMilestoneAmount();

    error ProjectNotFound();
    error ProjectNotActive();
    error ProjectAlreadyCompleted();
    error ProjectAlreadyCancelled();

    error MilestoneNotFound();
    error MilestoneNotPending();
    error MilestoneNotApproved();

    error NoRecoverableFunds();
    error InsufficientUnreservedBalance();
    error FundingAmountMismatch();
    error OwnershipRenunciationDisabled();

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event FundingTokenApproved(
        address indexed token
    );

    event FundingTokenDisabled(
        address indexed token
    );

    event ProjectCreated(
        uint256 indexed projectId,
        address indexed beneficiary,
        address indexed fundingToken,
        uint256 totalApproved,
        uint256 milestoneCount
    );

    event MilestoneApproved(
        uint256 indexed projectId,
        uint256 indexed milestoneId,
        uint256 amount
    );

    event MilestoneReleased(
        uint256 indexed projectId,
        uint256 indexed milestoneId,
        address indexed beneficiary,
        address fundingToken,
        uint256 amount
    );

    event ProjectCompleted(
        uint256 indexed projectId,
        uint256 totalReleased
    );

    event ProjectCancelled(
        uint256 indexed projectId,
        uint256 unreleasedAmount
    );

    event CancelledFundsRecovered(
        uint256 indexed projectId,
        address indexed recipient,
        address indexed fundingToken,
        uint256 amount
    );

    event UnreservedTokensRecovered(
        address indexed token,
        address indexed recipient,
        uint256 amount
    );

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    uint256 public nextProjectId = 1;

    /**
     * @notice Tokens permitted for creation of new startup projects.
     *
     * Disabling a token prevents new projects from using it.
     * Existing projects using that token remain operational.
     */
    mapping(address => bool) public approvedFundingTokens;

    /**
     * @dev Project ID => Project.
     */
    mapping(uint256 => Project) private _projects;

    /**
     * @dev Project ID => milestone ID => Milestone.
     */
    mapping(uint256 => mapping(uint256 => Milestone))
        private _milestones;

    /**
     * @notice Capital reserved for active projects, grouped by token.
     *
     * This amount decreases when:
     * - a milestone is released; or
     * - a project is cancelled.
     */
    mapping(address => uint256) public totalReservedByToken;

    /**
     * @notice Unreleased amount recoverable from a cancelled project.
     */
    mapping(uint256 => uint256) public cancelledRecoverable;

    /**
     * @dev Cancelled-project capital that remains protected inside
     *      this contract until explicitly recovered.
     *
     * This prevents recoverUnreservedTokens() from treating cancelled
     * startup capital as accidental/excess tokens.
     */
    mapping(address => uint256) private _cancelledProtectedByToken;

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    constructor() Ownable(msg.sender) {}

    /**
 * @notice Ownership renunciation is permanently disabled.
 *
 * @dev
 * This contract may custody protected startup capital.
 * Renouncing ownership could permanently lock milestone
 * releases and recovery operations.
 *
 * Ownership should instead be transferred deliberately
 * to the LGC governance contract when the ecosystem
 * is ready for governance control.
 */
function renounceOwnership()
    public
    override
    onlyOwner
{
    revert OwnershipRenunciationDisabled();
}

    // ---------------------------------------------------------------------
    // Funding token administration
    // ---------------------------------------------------------------------

    /**
     * @notice Approves an ERC-20/BEP-20 token for future startup funding.
     */
    function approveFundingToken(
        address token
    ) external onlyOwner {
        if (token == address(0)) {
            revert ZeroAddress();
        }

        if (approvedFundingTokens[token]) {
            revert TokenAlreadyApproved();
        }

        approvedFundingTokens[token] = true;

        emit FundingTokenApproved(token);
    }

    /**
     * @notice Prevents a token from being used for new projects.
     *
     * @dev Existing projects using the token remain operational.
     */
    function disableFundingToken(
        address token
    ) external onlyOwner {
        if (token == address(0)) {
            revert ZeroAddress();
        }

        if (!approvedFundingTokens[token]) {
            revert TokenAlreadyDisabled();
        }

        approvedFundingTokens[token] = false;

        emit FundingTokenDisabled(token);
    }

    // ---------------------------------------------------------------------
    // Project creation
    // ---------------------------------------------------------------------

    /**
     * @notice Creates and fully funds a startup project.
     *
     * @param beneficiary Startup wallet receiving milestone releases.
     * @param fundingToken Approved ERC-20/BEP-20 funding token.
     * @param totalApproved Total capital approved for the project.
     * @param milestoneAmounts Capital allocated to each milestone.
     *
     * @dev
     * The milestone amounts must sum exactly to totalApproved.
     *
     * The full project allocation is transferred from the owner into
     * this contract during project creation.
     */
    function createProject(
        address beneficiary,
        address fundingToken,
        uint256 totalApproved,
        uint256[] calldata milestoneAmounts
    )
        external
        onlyOwner
        nonReentrant
        returns (uint256 projectId)
    {
        if (beneficiary == address(0)) {
            revert ZeroAddress();
        }

        if (fundingToken == address(0)) {
            revert ZeroAddress();
        }

        if (!approvedFundingTokens[fundingToken]) {
            revert TokenNotApproved();
        }

        if (totalApproved == 0) {
            revert ZeroAmount();
        }

        uint256 milestoneCount = milestoneAmounts.length;

        if (
            milestoneCount == 0 ||
            milestoneCount > MAX_MILESTONES
        ) {
            revert InvalidMilestoneCount();
        }

        uint256 calculatedTotal;

        projectId = nextProjectId;

        nextProjectId = projectId + 1;

        for (uint256 i = 0; i < milestoneCount; ++i) {
            uint256 amount = milestoneAmounts[i];

            if (amount == 0) {
                revert InvalidMilestoneAmount();
            }

            calculatedTotal += amount;

            _milestones[projectId][i] = Milestone({
                amount: amount,
                status: MilestoneStatus.Pending
            });
        }

        if (calculatedTotal != totalApproved) {
            revert InvalidMilestoneAmount();
        }

        _projects[projectId] = Project({
            beneficiary: beneficiary,
            fundingToken: fundingToken,
            totalApproved: totalApproved,
            totalReleased: 0,
            milestoneCount: milestoneCount,
            createdAt: block.timestamp,
            status: ProjectStatus.Active
        });

         IERC20 fundingAsset = IERC20(fundingToken);

uint256 balanceBefore =
    fundingAsset.balanceOf(address(this));

fundingAsset.safeTransferFrom(
    msg.sender,
    address(this),
    totalApproved
);

uint256 balanceAfter =
    fundingAsset.balanceOf(address(this));

if (
    balanceAfter < balanceBefore ||
    balanceAfter - balanceBefore != totalApproved
) {
    revert FundingAmountMismatch();
}

totalReservedByToken[fundingToken] +=
    totalApproved;

emit ProjectCreated(
            projectId,
            beneficiary,
            fundingToken,
            totalApproved,
            milestoneCount
        );
    }

    // ---------------------------------------------------------------------
    // Milestone approval
    // ---------------------------------------------------------------------

    /**
     * @notice Approves a milestone for release.
     *
     * @dev
     * Initially the deployer controls this operation.
     *
     * If ownership is eventually transferred to governance,
     * governance becomes the authority controlling milestone approval.
     */
    function approveMilestone(
        uint256 projectId,
        uint256 milestoneId
    ) external onlyOwner {
        Project storage project =
            _requireProject(projectId);

        if (project.status != ProjectStatus.Active) {
            revert ProjectNotActive();
        }

        Milestone storage milestone =
            _requireMilestone(
                projectId,
                milestoneId,
                project.milestoneCount
            );

        if (
            milestone.status != MilestoneStatus.Pending
        ) {
            revert MilestoneNotPending();
        }

        milestone.status = MilestoneStatus.Approved;

        emit MilestoneApproved(
            projectId,
            milestoneId,
            milestone.amount
        );
    }

    // ---------------------------------------------------------------------
    // Milestone release
    // ---------------------------------------------------------------------

    /**
     * @notice Releases an approved milestone to the startup beneficiary.
     *
     * @dev
     * Checks-effects-interactions is followed before the external
     * token transfer.
     */
    function releaseMilestone(
        uint256 projectId,
        uint256 milestoneId
    )
        external
        onlyOwner
        nonReentrant
    {
        Project storage project =
            _requireProject(projectId);

        if (project.status != ProjectStatus.Active) {
            revert ProjectNotActive();
        }

        Milestone storage milestone =
            _requireMilestone(
                projectId,
                milestoneId,
                project.milestoneCount
            );

        if (
            milestone.status != MilestoneStatus.Approved
        ) {
            revert MilestoneNotApproved();
        }

        uint256 amount = milestone.amount;

        // Effects
        milestone.status = MilestoneStatus.Released;

        project.totalReleased += amount;

        totalReservedByToken[
            project.fundingToken
        ] -= amount;

        // Interaction
        IERC20(project.fundingToken).safeTransfer(
            project.beneficiary,
            amount
        );

        emit MilestoneReleased(
            projectId,
            milestoneId,
            project.beneficiary,
            project.fundingToken,
            amount
        );

        if (
            project.totalReleased ==
            project.totalApproved
        ) {
            project.status = ProjectStatus.Completed;

            emit ProjectCompleted(
                projectId,
                project.totalReleased
            );
        }
    }

    // ---------------------------------------------------------------------
    // Project cancellation
    // ---------------------------------------------------------------------

    /**
     * @notice Cancels an unfinished startup project.
     *
     * @dev
     * Funds already released to the startup remain part of the historical
     * accounting and cannot be recovered through this contract.
     *
     * Only the unreleased allocation becomes recoverable.
     */
    function cancelProject(
        uint256 projectId
    ) external onlyOwner {
        Project storage project =
            _requireProject(projectId);

        if (
            project.status == ProjectStatus.Completed
        ) {
            revert ProjectAlreadyCompleted();
        }

        if (
            project.status == ProjectStatus.Cancelled
        ) {
            revert ProjectAlreadyCancelled();
        }

        uint256 unreleased =
            project.totalApproved -
            project.totalReleased;

        project.status = ProjectStatus.Cancelled;

        cancelledRecoverable[projectId] =
            unreleased;

        /*
         * Remove the project's unreleased capital from the active-project
         * reserve.
         */
        totalReservedByToken[
            project.fundingToken
        ] -= unreleased;

        /*
         * The capital remains physically inside this contract.
         *
         * Therefore it moves into the cancelled-project protected pool
         * until recoverCancelledFunds() explicitly transfers it.
         */
        _increaseCancelledProtection(
            project.fundingToken,
            unreleased
        );

        /*
         * Any milestone that has not already been released becomes
         * permanently cancelled.
         */
        for (
            uint256 i = 0;
            i < project.milestoneCount;
            ++i
        ) {
            Milestone storage milestone =
                _milestones[projectId][i];

            if (
                milestone.status ==
                    MilestoneStatus.Pending ||
                milestone.status ==
                    MilestoneStatus.Approved
            ) {
                milestone.status =
                    MilestoneStatus.Cancelled;
            }
        }

        emit ProjectCancelled(
            projectId,
            unreleased
        );
    }

    // ---------------------------------------------------------------------
    // Cancelled-fund recovery
    // ---------------------------------------------------------------------

    /**
     * @notice Recovers the unreleased allocation of a cancelled project.
     *
     * @param projectId Cancelled project.
     * @param recipient Destination wallet, normally the ecosystem treasury.
     *
     * @dev
     * Initially the deployer selects the recipient.
     *
     * If ownership is later transferred to governance, governance will
     * control this operation.
     */
    function recoverCancelledFunds(
        uint256 projectId,
        address recipient
    )
        external
        onlyOwner
        nonReentrant
    {
        if (recipient == address(0)) {
            revert ZeroAddress();
        }

        Project storage project =
            _requireProject(projectId);

        if (
            project.status != ProjectStatus.Cancelled
        ) {
            revert ProjectNotActive();
        }

        uint256 amount =
            cancelledRecoverable[projectId];

        if (amount == 0) {
            revert NoRecoverableFunds();
        }

        // Effects
        cancelledRecoverable[projectId] = 0;

        _decreaseCancelledProtection(
            project.fundingToken,
            amount
        );

        // Interaction
        IERC20(project.fundingToken).safeTransfer(
            recipient,
            amount
        );

        emit CancelledFundsRecovered(
            projectId,
            recipient,
            project.fundingToken,
            amount
        );
    }

    // ---------------------------------------------------------------------
    // Accidental/excess token recovery
    // ---------------------------------------------------------------------

    /**
     * @notice Recovers tokens that are not reserved for startup projects.
     *
     * @dev
     * This function cannot withdraw:
     *
     * 1. capital reserved for active startup projects; or
     * 2. unreleased capital belonging to cancelled projects that has
     *    not yet been explicitly recovered.
     *
     * It is intended for tokens accidentally transferred directly to
     * this contract or other genuine excess balances.
     */
    function recoverUnreservedTokens(
        address token,
        address recipient,
        uint256 amount
    )
        external
        onlyOwner
        nonReentrant
    {
        if (
            token == address(0) ||
            recipient == address(0)
        ) {
            revert ZeroAddress();
        }

        if (amount == 0) {
            revert ZeroAmount();
        }

        uint256 balance =
            IERC20(token).balanceOf(address(this));

        uint256 protectedBalance =
            totalReservedByToken[token] +
            _cancelledProtectedByToken[token];

        /*
         * The first condition protects against inconsistent token
         * balances, including unusual token behavior.
         *
         * The second condition prevents withdrawal of protected capital.
         */
        if (
            balance < protectedBalance ||
            amount > balance - protectedBalance
        ) {
            revert InsufficientUnreservedBalance();
        }

        IERC20(token).safeTransfer(
            recipient,
            amount
        );

        emit UnreservedTokensRecovered(
            token,
            recipient,
            amount
        );
    }

    // ---------------------------------------------------------------------
    // Read functions
    // ---------------------------------------------------------------------

    /**
     * @notice Returns the primary information for a project.
     */
    function getProject(
        uint256 projectId
    )
        external
        view
        returns (Project memory)
    {
        Project storage project =
            _requireProject(projectId);

        return project;
    }

    /**
     * @notice Returns information for one project milestone.
     */
    function getMilestone(
        uint256 projectId,
        uint256 milestoneId
    )
        external
        view
        returns (Milestone memory)
    {
        Project storage project =
            _requireProject(projectId);

        Milestone storage milestone =
            _requireMilestone(
                projectId,
                milestoneId,
                project.milestoneCount
            );

        return milestone;
    }

    /**
     * @notice Returns the amount of project capital that has not yet
     *         been released to the startup.
     */
    function remainingAllocation(
        uint256 projectId
    )
        external
        view
        returns (uint256)
    {
        Project storage project =
            _requireProject(projectId);

        return
            project.totalApproved -
            project.totalReleased;
    }

    /**
     * @notice Returns cancelled-project capital currently protected
     *         for a funding token.
     */
    function cancelledProtectedByToken(
        address token
    )
        external
        view
        returns (uint256)
    {
        return _cancelledProtectedByToken[token];
    }

    /**
     * @notice Returns the total amount that must remain protected inside
     *         this contract for a funding token.
     *
     * @dev Includes both active-project reserves and cancelled-project
     *      funds awaiting recovery.
     */
    function protectedBalanceOf(
        address token
    )
        external
        view
        returns (uint256)
    {
        return
            totalReservedByToken[token] +
            _cancelledProtectedByToken[token];
    }

    // ---------------------------------------------------------------------
    // Internal validation
    // ---------------------------------------------------------------------

    function _requireProject(
        uint256 projectId
    )
        internal
        view
        returns (Project storage project)
    {
        project = _projects[projectId];

        if (project.beneficiary == address(0)) {
            revert ProjectNotFound();
        }
    }

    function _requireMilestone(
        uint256 projectId,
        uint256 milestoneId,
        uint256 milestoneCount
    )
        internal
        view
        returns (Milestone storage milestone)
    {
        if (milestoneId >= milestoneCount) {
            revert MilestoneNotFound();
        }

        milestone =
            _milestones[projectId][milestoneId];
    }

    // ---------------------------------------------------------------------
    // Internal cancelled-capital accounting
    // ---------------------------------------------------------------------

    function _increaseCancelledProtection(
        address token,
        uint256 amount
    ) internal {
        _cancelledProtectedByToken[token] += amount;
    }

    function _decreaseCancelledProtection(
        address token,
        uint256 amount
    ) internal {
        _cancelledProtectedByToken[token] -= amount;
    }
}