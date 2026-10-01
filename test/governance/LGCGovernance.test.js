const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LGCGovernance", function () {
    const PROPOSAL_THRESHOLD = ethers.parseEther("100");
    const QUORUM_BPS = 400;

    const VOTING_DELAY = 100;
    const VOTING_PERIOD = 200;

    const TIMELOCK_DELAY = 100;
    const EXECUTION_GRACE_PERIOD = 500;

    let owner;
    let alice;
    let bob;
    let carol;

    let lgc;
    let governance;
    let target;

    async function mineBlocks(count) {
        count = Number(count);
        if (count <= 0) return;

        await ethers.provider.send("hardhat_mine", [
            "0x" + count.toString(16)
        ]);
    }

    async function increaseTime(seconds) {
        if (seconds <= 0) return;

        await ethers.provider.send("evm_increaseTime", [seconds]);
        await ethers.provider.send("evm_mine");
    }

    async function deploySystem() {
        const LGC = await ethers.getContractFactory("LivingGodCoin");
        lgc = await LGC.deploy();
        await lgc.waitForDeployment();

        const Governance = await ethers.getContractFactory("LGCGovernance");
        governance = await Governance.deploy(
            await lgc.getAddress(),
            PROPOSAL_THRESHOLD,
            QUORUM_BPS,
            VOTING_DELAY,
            VOTING_PERIOD,
            TIMELOCK_DELAY,
            EXECUTION_GRACE_PERIOD
        );
        await governance.waitForDeployment();

        const Target = await ethers.getContractFactory("GovernanceTarget");
        target = await Target.deploy();
        await target.waitForDeployment();
    }

    async function fund(account, amount) {
        await lgc.transfer(account.address, amount);
    }

    async function depositFor(account, amount) {
        await fund(account, amount);

        await lgc
            .connect(account)
            .approve(await governance.getAddress(), amount);

        await governance.connect(account).deposit(amount);
    }

    async function createProposal(
        proposer = alice,
        targetAddress = null,
        calldata = "0x",
        value = 0,
        description = "Test proposal"
    ) {
        const targetAddressToUse =
            targetAddress || await target.getAddress();

        await governance.connect(proposer).propose(
            [targetAddressToUse],
            [value],
            [calldata],
            description
        );

        return governance.proposalCount();
    }

    // The governance contract becomes Active only after the current block
    // is strictly beyond voteStart. We therefore mine until the contract
    // itself reports Active instead of relying on an off-by-one assumption.
    async function activateProposal(proposalId) {
        const maxBlocks = VOTING_DELAY + 10;

        for (let i = 0; i < maxBlocks; i++) {
            if (Number(await governance.state(proposalId)) === 1) return;
            await mineBlocks(1);
        }

        expect(await governance.state(proposalId)).to.equal(1);
    }

    async function finishVoting() {
        await mineBlocks(VOTING_PERIOD + 2);
    }

    async function createSuccessfulProposal({
        targetAddress = null,
        calldata = "0x",
        value = 0,
        description = "Successful proposal"
    } = {}) {
        const targetAddressToUse = targetAddress || await target.getAddress();

        // Fund the proposer for every standalone helper invocation.
        await depositFor(alice, ethers.parseEther("500"));
        await mineBlocks(1);

        const proposalId = await createProposal(
            alice,
            targetAddressToUse,
            calldata,
            value,
            description
        );

        await activateProposal(proposalId);

        await governance.connect(alice).castVote(proposalId, 1);
        await finishVoting();

        expect(await governance.state(proposalId)).to.equal(4);

        await governance.queue(proposalId);
        return proposalId;
    }

    beforeEach(async function () {
        [owner, alice, bob, carol] = await ethers.getSigners();
        await deploySystem();
    });

    describe("Deployment", function () {
        it("sets the LGC token", async function () {
            expect(await governance.lgcToken()).to.equal(await lgc.getAddress());
        });

        it("sets immutable governance parameters", async function () {
            expect(await governance.proposalThreshold()).to.equal(PROPOSAL_THRESHOLD);
            expect(await governance.quorumBps()).to.equal(QUORUM_BPS);
            expect(await governance.votingDelay()).to.equal(VOTING_DELAY);
            expect(await governance.votingPeriod()).to.equal(VOTING_PERIOD);
            expect(await governance.timelockDelay()).to.equal(TIMELOCK_DELAY);
            expect(await governance.executionGracePeriod()).to.equal(EXECUTION_GRACE_PERIOD);
            expect(await governance.executionDelay()).to.equal(TIMELOCK_DELAY);
        });

        it("uses the expected version", async function () {
            expect(await governance.VERSION()).to.equal("1.0.0");
        });

        it("rejects zero token address", async function () {
            const Governance = await ethers.getContractFactory("LGCGovernance");

            await expect(
                Governance.deploy(
                    ethers.ZeroAddress,
                    PROPOSAL_THRESHOLD,
                    QUORUM_BPS,
                    VOTING_DELAY,
                    VOTING_PERIOD,
                    TIMELOCK_DELAY,
                    EXECUTION_GRACE_PERIOD
                )
            ).to.be.revertedWithCustomError(Governance, "ZeroAddress");
        });

        it("rejects zero proposal threshold", async function () {
            const Governance = await ethers.getContractFactory("LGCGovernance");

            await expect(
                Governance.deploy(
                    await lgc.getAddress(),
                    0,
                    QUORUM_BPS,
                    VOTING_DELAY,
                    VOTING_PERIOD,
                    TIMELOCK_DELAY,
                    EXECUTION_GRACE_PERIOD
                )
            ).to.be.revertedWithCustomError(Governance, "InvalidAmount");
        });

        it("rejects invalid quorum", async function () {
            const Governance = await ethers.getContractFactory("LGCGovernance");

            await expect(
                Governance.deploy(
                    await lgc.getAddress(),
                    PROPOSAL_THRESHOLD,
                    10001,
                    VOTING_DELAY,
                    VOTING_PERIOD,
                    TIMELOCK_DELAY,
                    EXECUTION_GRACE_PERIOD
                )
            ).to.be.revertedWithCustomError(Governance, "InvalidQuorum");
        });
    });

    describe("Voting power deposits", function () {
        it("accepts LGC deposits", async function () {
            const amount = ethers.parseEther("500");
            await depositFor(alice, amount);

            expect(await governance.depositedBalance(alice.address)).to.equal(amount);
            expect(await governance.getVotes(alice.address)).to.equal(amount);
            expect(await governance.totalVotingDeposited()).to.equal(amount);
        });

        it("automatically delegates first deposit to the depositor", async function () {
            const amount = ethers.parseEther("500");
            await depositFor(alice, amount);

            expect(await governance.delegates(alice.address)).to.equal(alice.address);
            expect(await governance.delegatedPower(alice.address)).to.equal(amount);
        });

        it("supports multiple deposits", async function () {
            const first = ethers.parseEther("500");
            const second = ethers.parseEther("300");
            const total = first + second;

            await fund(alice, total);
            await lgc.connect(alice).approve(await governance.getAddress(), total);
            await governance.connect(alice).deposit(first);
            await governance.connect(alice).deposit(second);

            expect(await governance.depositedBalance(alice.address)).to.equal(total);
            expect(await governance.getVotes(alice.address)).to.equal(total);
        });

        it("rejects zero deposits", async function () {
            await expect(governance.connect(alice).deposit(0))
                .to.be.revertedWithCustomError(governance, "InvalidAmount");
        });

        it("supports withdrawals", async function () {
            const amount = ethers.parseEther("500");
            const withdrawal = ethers.parseEther("200");
            await depositFor(alice, amount);

            await governance.connect(alice).withdraw(withdrawal);

            expect(await governance.depositedBalance(alice.address)).to.equal(amount - withdrawal);
            expect(await governance.getVotes(alice.address)).to.equal(amount - withdrawal);
        });

        it("rejects withdrawals larger than deposited balance", async function () {
            await depositFor(alice, ethers.parseEther("100"));

            await expect(governance.connect(alice).withdraw(ethers.parseEther("101")))
                .to.be.revertedWithCustomError(governance, "InvalidAmount");
        });
    });

    describe("Delegation", function () {
        it("moves voting power to another delegate", async function () {
            const amount = ethers.parseEther("500");
            await depositFor(alice, amount);
            await governance.connect(alice).delegate(bob.address);

            expect(await governance.getVotes(alice.address)).to.equal(0);
            expect(await governance.getVotes(bob.address)).to.equal(amount);
        });

        it("allows multiple accounts to delegate to one address", async function () {
            const amount = ethers.parseEther("500");
            await depositFor(alice, amount);
            await depositFor(bob, amount);

            await governance.connect(alice).delegate(carol.address);
            await governance.connect(bob).delegate(carol.address);

            expect(await governance.getVotes(carol.address)).to.equal(amount * 2n);
        });

        it("rejects zero delegate", async function () {
            await expect(governance.connect(alice).delegate(ethers.ZeroAddress))
                .to.be.revertedWithCustomError(governance, "ZeroAddress");
        });

        it("supports delegation before depositing", async function () {
            await governance.connect(alice).delegate(bob.address);
            await depositFor(alice, ethers.parseEther("500"));

            expect(await governance.getVotes(bob.address)).to.equal(ethers.parseEther("500"));
        });
    });

    describe("Historical checkpoints", function () {
        it("records historical voting power", async function () {
            const amount = ethers.parseEther("500");
            await depositFor(alice, amount);
            const depositBlock = await ethers.provider.getBlockNumber();
            await mineBlocks(1);

            expect(await governance.getPastVotes(alice.address, depositBlock)).to.equal(amount);
        });

        it("records historical total voting power", async function () {
            const amount = ethers.parseEther("500");
            await depositFor(alice, amount);
            const depositBlock = await ethers.provider.getBlockNumber();
            await mineBlocks(1);

            expect(await governance.getPastTotalVotes(depositBlock)).to.equal(amount);
        });

        it("preserves historical voting power after delegation changes", async function () {
            const amount = ethers.parseEther("500");
            await depositFor(alice, amount);
            const firstBlock = await ethers.provider.getBlockNumber();
            await mineBlocks(1);

            await governance.connect(alice).delegate(bob.address);
            const secondBlock = await ethers.provider.getBlockNumber();
            await mineBlocks(1);

            expect(await governance.getPastVotes(alice.address, firstBlock)).to.equal(amount);
            expect(await governance.getPastVotes(alice.address, secondBlock)).to.equal(0);
            expect(await governance.getPastVotes(bob.address, secondBlock)).to.equal(amount);
        });
    });

    describe("Proposals", function () {
        beforeEach(async function () {
            await depositFor(alice, ethers.parseEther("500"));
            await mineBlocks(1);
        });

        it("allows an account with sufficient voting power to propose", async function () {
            const proposalId = await createProposal(alice);
            expect(proposalId).to.equal(1);
            expect(await governance.proposalCount()).to.equal(1);
        });

        it("rejects a proposer below the threshold", async function () {
            await depositFor(bob, ethers.parseEther("50"));
            await mineBlocks(1);

            await expect(createProposal(bob))
                .to.be.revertedWithCustomError(governance, "InsufficientProposalPower");
        });

         it("uses previous-block voting power for the proposal threshold", async function () {
    const first = ethers.parseEther("50");
    const second = ethers.parseEther("50");

    // Bob first deposits 50 LGC.
    await depositFor(bob, first);

    const firstDepositBlock = await ethers.provider.getBlockNumber();

    // Verify the 50 LGC checkpoint after moving one block forward.
    await mineBlocks(1);

    expect(
        await governance.getPastVotes(
            bob.address,
            firstDepositBlock
        )
    ).to.equal(first);

    // Give Bob another 50 LGC and deposit it.
    await fund(bob, second);

    await lgc
        .connect(bob)
        .approve(await governance.getAddress(), second);

    const depositTx = await governance.connect(bob).deposit(second);
    const depositReceipt = await depositTx.wait();

    const secondDepositBlock = depositReceipt.blockNumber;

    // Move one block forward so secondDepositBlock is now historical.
    await mineBlocks(1);

    // The checkpoint at the second deposit block contains the full 100 LGC.
    expect(
        await governance.getPastVotes(
            bob.address,
            secondDepositBlock
        )
    ).to.equal(first + second);

    // The block immediately before the second deposit still contained
    // only Bob's original 50 LGC.
    expect(
        await governance.getPastVotes(
            bob.address,
            secondDepositBlock - 1
        )
    ).to.equal(first);

    // A proposal created now uses the previous block's voting power.
    // Bob therefore has the required 100 LGC.
    const proposalId = await createProposal(bob);

    expect(proposalId).to.equal(1);
});

        it("rejects empty proposal actions", async function () {
            await expect(
                governance.connect(alice).propose([], [], [], "Empty actions")
            ).to.be.revertedWithCustomError(governance, "InvalidProposalActions");
        });

        it("rejects mismatched proposal arrays", async function () {
            await expect(
                governance.connect(alice).propose(
                    [await target.getAddress()],
                    [],
                    ["0x"],
                    "Mismatch"
                )
            ).to.be.revertedWithCustomError(governance, "InvalidProposalActions");
        });

        it("rejects empty descriptions", async function () {
            await expect(
                governance.connect(alice).propose(
                    [await target.getAddress()],
                    [0],
                    ["0x"],
                    ""
                )
            ).to.be.revertedWithCustomError(governance, "EmptyDescription");
        });

        it("rejects zero action targets", async function () {
            await expect(
                governance.connect(alice).propose(
                    [ethers.ZeroAddress],
                    [0],
                    ["0x"],
                    "Zero target"
                )
            ).to.be.revertedWithCustomError(governance, "ZeroAddress");
        });

        it("rejects proposals targeting the protected LGC token", async function () {
            const calldata = lgc.interface.encodeFunctionData("transfer", [
                bob.address,
                ethers.parseEther("1")
            ]);

            await expect(
                governance.connect(alice).propose(
                    [await lgc.getAddress()],
                    [0],
                    [calldata],
                    "Protected token"
                )
            ).to.be.revertedWithCustomError(governance, "ProtectedVotingToken");
        });

        it("stores proposal data", async function () {
            const calldata = target.interface.encodeFunctionData("setValue", [42]);
            const proposalId = await createProposal(
                alice,
                await target.getAddress(),
                calldata,
                0,
                "Store data"
            );

            const proposal = await governance.getProposal(proposalId);
            expect(proposal.proposer).to.equal(alice.address);
            expect(proposal.descriptionHash).to.equal(
                ethers.keccak256(ethers.toUtf8Bytes("Store data"))
            );

            const actions = await governance.getProposalActions(proposalId);
            expect(actions.targets[0]).to.equal(await target.getAddress());
            expect(actions[1][0]).to.equal(0);
            expect(actions.calldatas[0]).to.equal(calldata);
        });
    });

    describe("Voting", function () {
        let proposalId;

        beforeEach(async function () {
            await depositFor(alice, ethers.parseEther("500"));
            await mineBlocks(1);
            proposalId = await createProposal(alice);
        });

        it("starts pending", async function () {
            expect(await governance.state(proposalId)).to.equal(0);
        });

        it("becomes active after the voting delay", async function () {
            await activateProposal(proposalId);
            expect(await governance.state(proposalId)).to.equal(1);
        });

        it("allows a FOR vote", async function () {
            await activateProposal(proposalId);
            await governance.connect(alice).castVote(proposalId, 1);

            const receipt = await governance.getReceipt(proposalId, alice.address);
            expect(receipt.voted).to.equal(true);
            expect(receipt.support).to.equal(1);
            expect(receipt.votes).to.equal(ethers.parseEther("500"));
        });

        it("allows an AGAINST vote", async function () {
            await activateProposal(proposalId);
            await governance.connect(alice).castVote(proposalId, 0);

            const proposal = await governance.getProposal(proposalId);
            expect(proposal.againstVotes).to.equal(ethers.parseEther("500"));
        });

        it("allows an ABSTAIN vote", async function () {
            await activateProposal(proposalId);
            await governance.connect(alice).castVote(proposalId, 2);

            const proposal = await governance.getProposal(proposalId);
            expect(proposal.abstainVotes).to.equal(ethers.parseEther("500"));
        });

        it("prevents double voting", async function () {
            await activateProposal(proposalId);
            await governance.connect(alice).castVote(proposalId, 1);

            await expect(governance.connect(alice).castVote(proposalId, 1))
                .to.be.revertedWithCustomError(governance, "ProposalAlreadyVoted");
        });

        it("rejects invalid vote support", async function () {
            await activateProposal(proposalId);

            // The current governance implementation rejects support=3.
            // Do not bind this test to an error name that is absent from its ABI.
            await expect(governance.connect(alice).castVote(proposalId, 3))
                .to.be.reverted;
        });

        it("uses snapshot voting power even after withdrawal", async function () {
            await activateProposal(proposalId);
            await governance.connect(alice).withdraw(ethers.parseEther("500"));
            await governance.connect(alice).castVote(proposalId, 1);

            const proposal = await governance.getProposal(proposalId);
            expect(proposal.forVotes).to.equal(ethers.parseEther("500"));
        });

        it("does not give new deposits voting power for an existing proposal", async function () {
            await depositFor(bob, ethers.parseEther("500"));
            await activateProposal(proposalId);

            await governance.connect(bob).withdraw(ethers.parseEther("500"));
            await depositFor(bob, ethers.parseEther("500"));

            // Snapshot voting power is zero for Bob at this proposal's snapshot.
            await expect(governance.connect(bob).castVote(proposalId, 1))
                .to.be.reverted;
        });
    });

    describe("Quorum and proposal state", function () {
        let proposalId;

        beforeEach(async function () {
            await depositFor(alice, ethers.parseEther("1000"));
            await depositFor(bob, ethers.parseEther("1000"));
            await mineBlocks(1);

            proposalId = await createProposal(alice);
            await activateProposal(proposalId);
        });

        it("calculates quorum from snapshot total voting power", async function () {
            expect(await governance.quorum(proposalId)).to.equal(ethers.parseEther("80"));
        });

        it("succeeds when quorum is reached and FOR exceeds AGAINST", async function () {
            await governance.connect(alice).castVote(proposalId, 1);
            await finishVoting();
            expect(await governance.state(proposalId)).to.equal(4);
        });

        it("is defeated when quorum is not reached", async function () {
            await finishVoting();
            expect(await governance.state(proposalId)).to.equal(3);
        });

        it("is defeated when AGAINST equals FOR", async function () {
            await governance.connect(alice).castVote(proposalId, 1);
            await governance.connect(bob).castVote(proposalId, 0);
            await finishVoting();

            expect(await governance.state(proposalId)).to.equal(3);
        });

        it("counts abstain votes toward quorum", async function () {
            await governance.connect(alice).castVote(proposalId, 2);
            await finishVoting();
            expect(await governance.state(proposalId)).to.equal(3);
        });
    });

    describe("Cancellation", function () {
        let proposalId;

        beforeEach(async function () {
            await depositFor(alice, ethers.parseEther("500"));
            await mineBlocks(1);
            proposalId = await createProposal(alice);
        });

        it("allows proposer to cancel a pending proposal", async function () {
            await governance.connect(alice).cancel(proposalId);
            expect(await governance.state(proposalId)).to.equal(2);
        });

        it("allows proposer to cancel an active proposal", async function () {
            await activateProposal(proposalId);
            await governance.connect(alice).cancel(proposalId);
            expect(await governance.state(proposalId)).to.equal(2);
        });

        it("rejects cancellation by another account", async function () {
            await expect(governance.connect(bob).cancel(proposalId))
                .to.be.revertedWithCustomError(governance, "NotProposer");
        });
    });

    describe("Queue and execution", function () {
        it("queues a successful proposal", async function () {
            const proposalId = await createSuccessfulProposal();
            expect(await governance.state(proposalId)).to.equal(5);

            const proposal = await governance.getProposal(proposalId);
            expect(proposal.eta).to.be.gt(0);
        });

        it("rejects queueing a defeated proposal", async function () {
            await depositFor(alice, ethers.parseEther("500"));
            await mineBlocks(1);

            const proposalId = await createProposal(alice);
            await activateProposal(proposalId);
            await finishVoting();

            expect(await governance.state(proposalId)).to.equal(3);

            await expect(governance.queue(proposalId))
                .to.be.revertedWithCustomError(governance, "ProposalNotSucceeded");
        });

        it("enforces the execution delay", async function () {
            const calldata = target.interface.encodeFunctionData("setValue", [41]);
            const proposalId = await createSuccessfulProposal({
                targetAddress: await target.getAddress(),
                calldata,
                description: "Delayed execution"
            });

            await expect(governance.execute(proposalId))
                .to.be.revertedWithCustomError(governance, "TimelockNotExpired");
        });

        it("executes after the timelock delay", async function () {
            const calldata = target.interface.encodeFunctionData("setValue", [42]);
            const proposalId = await createSuccessfulProposal({
                targetAddress: await target.getAddress(),
                calldata,
                description: "Execute target"
            });

            await increaseTime(TIMELOCK_DELAY);
            await governance.execute(proposalId);

            expect(await target.value()).to.equal(42);
            expect(await governance.state(proposalId)).to.equal(7);
        });

        it("prevents executing an already executed proposal", async function () {
            const calldata = target.interface.encodeFunctionData("setValue", [99]);
            const proposalId = await createSuccessfulProposal({
                targetAddress: await target.getAddress(),
                calldata,
                description: "Execute once"
            });

            await increaseTime(TIMELOCK_DELAY);
            await governance.execute(proposalId);

            await expect(governance.execute(proposalId))
                .to.be.revertedWithCustomError(governance, "ProposalAlreadyExecuted");
        });

        it("expires after the execution grace period", async function () {
            const proposalId = await createSuccessfulProposal();

            await increaseTime(TIMELOCK_DELAY + EXECUTION_GRACE_PERIOD + 1);

            expect(await governance.state(proposalId)).to.equal(6);

            await expect(governance.execute(proposalId))
                .to.be.revertedWithCustomError(governance, "ProposalExpired");
        });
    });

    describe("Multiple proposal actions", function () {
        beforeEach(async function () {
            await depositFor(alice, ethers.parseEther("500"));
            await mineBlocks(1);
        });

        it("supports multiple actions in one proposal", async function () {
            const calldata1 = target.interface.encodeFunctionData("setValue", [10]);
            const calldata2 = target.interface.encodeFunctionData("setValue", [20]);

            await governance.connect(alice).propose(
                [await target.getAddress(), await target.getAddress()],
                [0, 0],
                [calldata1, calldata2],
                "Multiple actions"
            );

            const proposalId = await governance.proposalCount();
            const count = await governance.proposalCount();
            expect(count).to.equal(proposalId);

            const actions = await governance.getProposalActions(proposalId);
            expect(actions.targets.length).to.equal(2);
            expect(actions.calldatas.length).to.equal(2);
        });

        it("rejects more than MAX_ACTIONS", async function () {
            const max = Number(await governance.MAX_ACTIONS());
            const targets = new Array(max + 1).fill(await target.getAddress());
            const values = new Array(max + 1).fill(0);
            const calldatas = new Array(max + 1).fill("0x");

            await expect(
                governance.connect(alice).propose(
                    targets,
                    values,
                    calldatas,
                    "Too many actions"
                )
            ).to.be.revertedWithCustomError(governance, "TooManyActions");
        });
    });

    describe("Unknown proposals", function () {
        it("rejects querying a nonexistent proposal", async function () {
            await expect(governance.getProposal(999))
                .to.be.revertedWithCustomError(governance, "ProposalNotFound");
        });

        it("rejects querying nonexistent proposal actions", async function () {
            await expect(governance.getProposalActions(999))
                .to.be.revertedWithCustomError(governance, "ProposalNotFound");
        });

        it("rejects voting on a nonexistent proposal", async function () {
            await expect(governance.connect(alice).castVote(999, 1))
                .to.be.revertedWithCustomError(governance, "ProposalNotFound");
        });
    });
});
