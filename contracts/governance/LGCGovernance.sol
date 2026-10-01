// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract LGCGovernance is ReentrancyGuard {
    using SafeERC20 for IERC20;

    string public constant VERSION = "1.0.0";

    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant MAX_ACTIONS = 20;

    IERC20 public immutable lgcToken;

    uint256 public immutable proposalThreshold;
    uint256 public immutable quorumBps;
    uint256 public immutable votingDelay;
    uint256 public immutable votingPeriod;
    uint256 public immutable timelockDelay;
    uint256 public immutable executionGracePeriod;

    uint256 public proposalCount;
    uint256 public totalVotingDeposited;

    enum ProposalState {
        Pending,
        Active,
        Canceled,
        Defeated,
        Succeeded,
        Queued,
        Expired,
        Executed
    }

    enum VoteType {
        Against,
        For,
        Abstain
    }

    struct Checkpoint {
        uint32 fromBlock;
        uint224 votes;
    }

    struct Proposal {
        address proposer;
        uint64 snapshotBlock;
        uint64 voteStart;
        uint64 voteEnd;
        uint64 eta;

        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;

        bool canceled;
        bool executed;

        bytes32 descriptionHash;
    }

    struct Receipt {
        bool hasVoted;
        VoteType support;
        uint256 votes;
    }

    mapping(address => uint256) public depositedBalance;
    mapping(address => address) public delegates;
    mapping(address => uint256) public delegatedPower;

    mapping(address => Checkpoint[]) private _checkpoints;
    Checkpoint[] private _totalCheckpoints;

    mapping(uint256 => Proposal) private _proposals;

    mapping(uint256 => mapping(address => Receipt)) private _receipts;

    mapping(uint256 => mapping(address => bool)) public hasVoted;

    mapping(uint256 => address[]) private _proposalTargets;
    mapping(uint256 => uint256[]) private _proposalValues;
    mapping(uint256 => bytes[]) private _proposalCalldatas;

    error ZeroAddress();
    error InvalidAmount();
    error InvalidQuorum();
    error InvalidParameters();

    error InvalidProposal();
    error InvalidProposalActions();
    error InvalidTarget();
    error ProtectedVotingToken();

    error ProposalNotFound();
    error ProposalNotPending();
    error ProposalNotActive();
    error ProposalAlreadyVoted();

    error ProposalAlreadyQueued();
    error ProposalNotQueued();
    error ProposalAlreadyExecuted();
    error ProposalAlreadyCanceled();

    error ProposalExpired();
    error ProposalNotSucceeded();

    error InsufficientVotingPower();
    error InsufficientProposalPower();

    error FutureLookup();

    error InvalidVote();
    error InvalidSupport();
    error NoVotingPower();

    error NotProposer();

    error TimelockNotExpired();
    error GracePeriodExpired();

    error EmptyDescription();
    error TooManyActions();

    event Deposited(
        address indexed account,
        uint256 amount,
        uint256 newBalance
    );

    event Withdrawn(
        address indexed account,
        uint256 amount,
        uint256 newBalance
    );

    event DelegateChanged(
        address indexed delegator,
        address indexed fromDelegate,
        address indexed toDelegate
    );

    event VotingPowerChanged(
        address indexed account,
        uint256 previousVotes,
        uint256 newVotes
    );

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        address[] targets,
        uint256[] values,
        bytes[] calldatas,
        uint256 voteStart,
        uint256 voteEnd,
        string description
    );

    event ProposalCanceled(uint256 indexed proposalId);

    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        VoteType support,
        uint256 votes
    );

    event ProposalQueued(
        uint256 indexed proposalId,
        uint256 eta
    );

    event ProposalExecuted(
        uint256 indexed proposalId
    );

    constructor(
        address token_,
        uint256 proposalThreshold_,
        uint256 quorumBps_,
        uint256 votingDelay_,
        uint256 votingPeriod_,
        uint256 timelockDelay_,
        uint256 executionGracePeriod_
    ) {
        if (token_ == address(0)) {
            revert ZeroAddress();
        }

        if (proposalThreshold_ == 0) {
            revert InvalidAmount();
        }

        if (
            quorumBps_ == 0 ||
            quorumBps_ > BPS_DENOMINATOR
        ) {
            revert InvalidQuorum();
        }

        if (
            votingPeriod_ == 0 ||
            executionGracePeriod_ == 0
        ) {
            revert InvalidParameters();
        }

        lgcToken = IERC20(token_);

        proposalThreshold = proposalThreshold_;
        quorumBps = quorumBps_;
        votingDelay = votingDelay_;
        votingPeriod = votingPeriod_;
        timelockDelay = timelockDelay_;
        executionGracePeriod = executionGracePeriod_;
    }

    receive() external payable {}

    function executionDelay() external view returns (uint256) {
        return timelockDelay;
    }

    // =============================================================
    // Voting deposits
    // =============================================================

    function deposit(uint256 amount) external nonReentrant {
        if (amount == 0) {
            revert InvalidAmount();
        }

        address account = msg.sender;

        address delegatee = delegates[account];

        if (delegatee == address(0)) {
            delegatee = account;
            delegates[account] = account;

            emit DelegateChanged(
                account,
                address(0),
                account
            );
        }

        lgcToken.safeTransferFrom(
            account,
            address(this),
            amount
        );

        depositedBalance[account] += amount;

        _moveVotingPower(
            address(0),
            delegatee,
            amount
        );

        _writeTotalCheckpoint(
            totalVotingDeposited + amount
        );

        totalVotingDeposited += amount;

        emit Deposited(
            account,
            amount,
            depositedBalance[account]
        );
    }

    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) {
            revert InvalidAmount();
        }

        address account = msg.sender;

        uint256 balance = depositedBalance[account];

        if (amount > balance) {
            revert InvalidAmount();
        }

        address delegatee = delegates[account];

        depositedBalance[account] = balance - amount;

        _moveVotingPower(
            delegatee,
            address(0),
            amount
        );

        totalVotingDeposited -= amount;

        _writeTotalCheckpoint(
            totalVotingDeposited
        );

        lgcToken.safeTransfer(
            account,
            amount
        );

        emit Withdrawn(
            account,
            amount,
            depositedBalance[account]
        );
    }

    // =============================================================
    // Delegation
    // =============================================================

    function delegate(address delegatee) external {
        if (delegatee == address(0)) {
            revert ZeroAddress();
        }

        address delegator = msg.sender;
        address currentDelegate = delegates[delegator];

        delegates[delegator] = delegatee;

        emit DelegateChanged(
            delegator,
            currentDelegate,
            delegatee
        );

        uint256 amount = depositedBalance[delegator];

        if (amount > 0) {
            _moveVotingPower(
                currentDelegate,
                delegatee,
                amount
            );
        }
    }

    // =============================================================
    // Voting power
    // =============================================================

    function getVotes(
        address account
    ) public view returns (uint256) {
        return delegatedPower[account];
    }

    function getPastVotes(
        address account,
        uint256 blockNumber
    ) public view returns (uint256) {
        if (blockNumber >= block.number) {
            revert FutureLookup();
        }

        return _getPastVotes(
            account,
            blockNumber
        );
    }

    function getPastTotalVotes(
        uint256 blockNumber
    ) public view returns (uint256) {
        if (blockNumber >= block.number) {
            revert FutureLookup();
        }

        return _lookupCheckpoint(
            _totalCheckpoints,
            blockNumber
        );
    }

    function getPastTotalDeposited(
        uint256 blockNumber
    ) external view returns (uint256) {
        return getPastTotalVotes(blockNumber);
    }

    function getVotingPower(
        address account
    ) external view returns (uint256) {
        return delegatedPower[account];
    }

    function getPastVotingPower(
        address account,
        uint256 blockNumber
    ) external view returns (uint256) {
        return getPastVotes(
            account,
            blockNumber
        );
    }

    // =============================================================
    // Proposals
    // =============================================================

    function propose(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas,
        string calldata description
    ) external returns (uint256 proposalId) {
        if (bytes(description).length == 0) {
            revert EmptyDescription();
        }

        _validateActions(
            targets,
            values,
            calldatas
        );

        if (block.number == 0) {
            revert InvalidProposal();
        }

        uint256 proposerVotes = getPastVotes(
            msg.sender,
            block.number - 1
        );

        if (proposerVotes < proposalThreshold) {
            revert InsufficientProposalPower();
        }

        proposalId = ++proposalCount;

        uint256 snapshotBlock = block.number;
        uint256 voteStart = snapshotBlock + votingDelay;
        uint256 voteEnd = voteStart + votingPeriod;

        Proposal storage proposal = _proposals[proposalId];

        proposal.proposer = msg.sender;
        proposal.snapshotBlock = uint64(snapshotBlock);
        proposal.voteStart = uint64(voteStart);
        proposal.voteEnd = uint64(voteEnd);
        proposal.descriptionHash = keccak256(
            bytes(description)
        );

        for (uint256 i = 0; i < targets.length; ++i) {
            _proposalTargets[proposalId].push(targets[i]);
            _proposalValues[proposalId].push(values[i]);
            _proposalCalldatas[proposalId].push(calldatas[i]);
        }

        emit ProposalCreated(
            proposalId,
            msg.sender,
            targets,
            values,
            calldatas,
            voteStart,
            voteEnd,
            description
        );
    }

    function proposalSnapshot(
        uint256 proposalId
    ) external view returns (uint256) {
        _requireProposal(proposalId);
        return _proposals[proposalId].snapshotBlock;
    }

    function proposalDeadline(
        uint256 proposalId
    ) external view returns (uint256) {
        _requireProposal(proposalId);
        return _proposals[proposalId].voteEnd;
    }

    function getProposal(
        uint256 proposalId
    )
        external
        view
        returns (
            address proposer,
            uint256 snapshotBlock,
            uint256 voteStart,
            uint256 voteEnd,
            uint256 eta,
            uint256 forVotes,
            uint256 againstVotes,
            uint256 abstainVotes,
            bool canceled,
            bool executed,
            bytes32 descriptionHash
        )
    {
        Proposal memory proposal = _getProposal(proposalId);

        return (
            proposal.proposer,
            proposal.snapshotBlock,
            proposal.voteStart,
            proposal.voteEnd,
            proposal.eta,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.abstainVotes,
            proposal.canceled,
            proposal.executed,
            proposal.descriptionHash
        );
    }

    function getProposalActions(
        uint256 proposalId
    )
        external
        view
        returns (
            address[] memory targets,
            uint256[] memory values,
            bytes[] memory calldatas
        )
    {
        _requireProposal(proposalId);

        return (
            _proposalTargets[proposalId],
            _proposalValues[proposalId],
            _proposalCalldatas[proposalId]
        );
    }

    // =============================================================
    // Proposal state
    // =============================================================

    function state(
        uint256 proposalId
    ) public view returns (ProposalState) {
        Proposal memory proposal = _getProposal(proposalId);

        if (proposal.canceled) {
            return ProposalState.Canceled;
        }

        if (proposal.executed) {
            return ProposalState.Executed;
        }

        if (block.number < proposal.voteStart) {
            return ProposalState.Pending;
        }

        if (block.number <= proposal.voteEnd) {
            return ProposalState.Active;
        }

        if (!_quorumReached(proposalId)) {
            return ProposalState.Defeated;
        }

        if (proposal.forVotes <= proposal.againstVotes) {
            return ProposalState.Defeated;
        }

        if (proposal.eta == 0) {
            return ProposalState.Succeeded;
        }

        if (
            block.timestamp >
            uint256(proposal.eta) +
            executionGracePeriod
        ) {
            return ProposalState.Expired;
        }

        return ProposalState.Queued;
    }

    // =============================================================
    // Voting
    // =============================================================

    function castVote(
        uint256 proposalId,
        uint8 support
    ) external returns (uint256 votes) {
        return _castVote(
            proposalId,
            msg.sender,
            support
        );
    }

    function castVoteWithReason(
        uint256 proposalId,
        uint8 support,
        string calldata
    ) external returns (uint256 votes) {
        return _castVote(
            proposalId,
            msg.sender,
            support
        );
    }

    function getReceipt(
        uint256 proposalId,
        address voter
    )
        external
        view
        returns (
            bool voted,
            VoteType support,
            uint256 votes
        )
    {
        Receipt memory receipt = _receipts[
            proposalId
        ][voter];

        return (
            receipt.hasVoted,
            receipt.support,
            receipt.votes
        );
    }

    function quorum(
        uint256 proposalId
    ) public view returns (uint256) {
        Proposal memory proposal = _getProposal(proposalId);

        return
            _lookupCheckpoint(
                _totalCheckpoints,
                proposal.snapshotBlock
            ) *
            quorumBps /
            BPS_DENOMINATOR;
    }

    // =============================================================
    // Cancellation
    // =============================================================

    function cancel(
        uint256 proposalId
    ) external {
        Proposal storage proposal = _requireProposalStorage(
            proposalId
        );

        if (msg.sender != proposal.proposer) {
            revert NotProposer();
        }

        ProposalState currentState = state(
            proposalId
        );

        if (
            currentState != ProposalState.Pending &&
            currentState != ProposalState.Active
        ) {
            revert ProposalNotPending();
        }

        if (proposal.canceled) {
            revert ProposalAlreadyCanceled();
        }

        proposal.canceled = true;

        emit ProposalCanceled(
            proposalId
        );
    }

    // =============================================================
    // Queue
    // =============================================================

    function queue(
        uint256 proposalId
    ) external returns (uint256 eta) {
        Proposal storage proposal = _requireProposalStorage(
            proposalId
        );

        if (proposal.eta != 0) {
            revert ProposalAlreadyQueued();
        }

        if (
            state(proposalId) !=
            ProposalState.Succeeded
        ) {
            revert ProposalNotSucceeded();
        }

        eta = block.timestamp + timelockDelay;

        proposal.eta = uint64(eta);

        emit ProposalQueued(
            proposalId,
            eta
        );
    }

    // =============================================================
    // Execution
    // =============================================================

    function execute(
        uint256 proposalId
    ) external payable nonReentrant {
        Proposal storage proposal = _requireProposalStorage(
            proposalId
        );

        if (proposal.executed) {
            revert ProposalAlreadyExecuted();
        }

        if (proposal.canceled) {
            revert ProposalAlreadyCanceled();
        }

        if (proposal.eta == 0) {
            revert ProposalNotQueued();
        }

        if (
            block.timestamp <
            uint256(proposal.eta)
        ) {
            revert TimelockNotExpired();
        }

        if (
            block.timestamp >
            uint256(proposal.eta) +
            executionGracePeriod
        ) {
            revert ProposalExpired();
        }

        proposal.executed = true;

        address[] storage targets =
            _proposalTargets[proposalId];

        uint256[] storage values =
            _proposalValues[proposalId];

        bytes[] storage calldatas =
            _proposalCalldatas[proposalId];

        for (uint256 i = 0; i < targets.length; ++i) {
            if (targets[i] == address(lgcToken)) {
                revert ProtectedVotingToken();
            }

            (bool success, bytes memory returndata) =
                targets[i].call{value: values[i]}(
                    calldatas[i]
                );

            if (!success) {
                assembly {
                    revert(
                        add(returndata, 32),
                        mload(returndata)
                    )
                }
            }
        }

        emit ProposalExecuted(
            proposalId
        );
    }

    // =============================================================
    // Internal voting
    // =============================================================

    function _castVote(
        uint256 proposalId,
        address voter,
        uint8 support
    ) internal returns (uint256 votes) {
        if (support > uint8(VoteType.Abstain)) {
            revert InvalidSupport();
        }

        Proposal memory proposal = _getProposal(
            proposalId
        );

        if (
            state(proposalId) !=
            ProposalState.Active
        ) {
            revert ProposalNotActive();
        }

        if (
            _receipts[proposalId][voter].hasVoted
        ) {
            revert ProposalAlreadyVoted();
        }

        votes = _getPastVotes(
            voter,
            proposal.snapshotBlock
        );

        if (votes == 0) {
            revert NoVotingPower();
        }

        VoteType voteType = VoteType(
            support
        );

        Receipt storage receipt =
            _receipts[proposalId][voter];

        receipt.hasVoted = true;
        receipt.support = voteType;
        receipt.votes = votes;

        hasVoted[proposalId][voter] = true;

        Proposal storage storedProposal =
            _proposals[proposalId];

        if (voteType == VoteType.For) {
            storedProposal.forVotes += votes;
        } else if (
            voteType == VoteType.Against
        ) {
            storedProposal.againstVotes += votes;
        } else {
            storedProposal.abstainVotes += votes;
        }

        emit VoteCast(
            voter,
            proposalId,
            voteType,
            votes
        );
    }

    function _quorumReached(
        uint256 proposalId
    ) internal view returns (bool) {
        Proposal memory proposal =
            _proposals[proposalId];

        uint256 totalVotes =
            proposal.forVotes +
            proposal.againstVotes +
            proposal.abstainVotes;

        return totalVotes >= quorum(
            proposalId
        );
    }

    // =============================================================
    // Internal checkpoints
    // =============================================================

    function _moveVotingPower(
        address from,
        address to,
        uint256 amount
    ) internal {
        if (amount == 0 || from == to) {
            return;
        }

        if (from != address(0)) {
            uint256 oldVotes =
                delegatedPower[from];

            uint256 newVotes =
                oldVotes - amount;

            delegatedPower[from] =
                newVotes;

            _writeCheckpoint(
                _checkpoints[from],
                newVotes
            );

            emit VotingPowerChanged(
                from,
                oldVotes,
                newVotes
            );
        }

        if (to != address(0)) {
            uint256 oldVotes =
                delegatedPower[to];

            uint256 newVotes =
                oldVotes + amount;

            delegatedPower[to] =
                newVotes;

            _writeCheckpoint(
                _checkpoints[to],
                newVotes
            );

            emit VotingPowerChanged(
                to,
                oldVotes,
                newVotes
            );
        }
    }

    function _writeCheckpoint(
        Checkpoint[] storage checkpoints,
        uint256 newVotes
    ) internal {
        uint256 length =
            checkpoints.length;

        if (
            length > 0 &&
            checkpoints[length - 1].fromBlock ==
            block.number
        ) {
            checkpoints[length - 1].votes =
                uint224(newVotes);
        } else {
            checkpoints.push(
                Checkpoint({
                    fromBlock: uint32(block.number),
                    votes: uint224(newVotes)
                })
            );
        }
    }

    function _writeTotalCheckpoint(
        uint256 newTotal
    ) internal {
        _writeCheckpoint(
            _totalCheckpoints,
            newTotal
        );
    }

    function _getPastVotes(
        address account,
        uint256 blockNumber
    ) internal view returns (uint256) {
        return _lookupCheckpoint(
            _checkpoints[account],
            blockNumber
        );
    }

    function _lookupCheckpoint(
        Checkpoint[] storage checkpoints,
        uint256 blockNumber
    ) internal view returns (uint256) {
        uint256 length =
            checkpoints.length;

        if (length == 0) {
            return 0;
        }

        if (
            checkpoints[length - 1].fromBlock <=
            blockNumber
        ) {
            return checkpoints[length - 1].votes;
        }

        if (
            checkpoints[0].fromBlock >
            blockNumber
        ) {
            return 0;
        }

        uint256 low = 0;
        uint256 high = length - 1;

        while (low < high) {
            uint256 mid =
                (low + high + 1) / 2;

            if (
                checkpoints[mid].fromBlock <=
                blockNumber
            ) {
                low = mid;
            } else {
                high = mid - 1;
            }
        }

        return checkpoints[low].votes;
    }

    // =============================================================
    // Validation
    // =============================================================

    function _validateActions(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas
    ) internal view {
        uint256 length =
            targets.length;

        if (length == 0) {
            revert InvalidProposalActions();
        }

        if (length > MAX_ACTIONS) {
            revert TooManyActions();
        }

        if (
            values.length != length ||
            calldatas.length != length
        ) {
            revert InvalidProposalActions();
        }

        for (uint256 i = 0; i < length; ++i) {
            if (targets[i] == address(0)) {
                revert ZeroAddress();
            }

            if (
                targets[i] ==
                address(lgcToken)
            ) {
                revert ProtectedVotingToken();
            }
        }
    }

    function _requireProposal(
        uint256 proposalId
    ) internal view returns (Proposal memory) {
        if (
            proposalId == 0 ||
            proposalId > proposalCount
        ) {
            revert ProposalNotFound();
        }

        return _proposals[proposalId];
    }

    function _getProposal(
        uint256 proposalId
    ) internal view returns (Proposal memory) {
        return _requireProposal(
            proposalId
        );
    }

    function _requireProposalStorage(
        uint256 proposalId
    ) internal view returns (Proposal storage) {
        if (
            proposalId == 0 ||
            proposalId > proposalCount
        ) {
            revert ProposalNotFound();
        }

        return _proposals[proposalId];
    }
}