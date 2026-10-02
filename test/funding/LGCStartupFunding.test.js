const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LGCStartupFunding", function () {
    let owner;
    let beneficiary;
    let beneficiary2;
    let treasury;
    let attacker;

    let token;
    let secondToken;
    let funding;

    const PROJECT_TOTAL = ethers.parseEther("1000");
    const MILESTONE_1 = ethers.parseEther("200");
    const MILESTONE_2 = ethers.parseEther("300");
    const MILESTONE_3 = ethers.parseEther("500");

    async function deployFixture() {
        [
            owner,
            beneficiary,
            beneficiary2,
            treasury,
            attacker
        ] = await ethers.getSigners();

        const MockERC20 =
            await ethers.getContractFactory("MockERC20");

        // Existing MockERC20 constructor takes no arguments
        // and mints 1,000,000 MOCK to the deployer.
        token = await MockERC20.deploy();
        await token.waitForDeployment();

        secondToken = await MockERC20.deploy();
        await secondToken.waitForDeployment();

        const LGCStartupFunding =
            await ethers.getContractFactory(
                "LGCStartupFunding"
            );

        funding = await LGCStartupFunding.deploy();
        await funding.waitForDeployment();
    }

    async function approveToken() {
        await funding.approveFundingToken(
            await token.getAddress()
        );
    }

    async function fundOwner(
        amount = ethers.parseEther("100000")
    ) {
        await token.approve(
            await funding.getAddress(),
            amount
        );
    }

    async function createDefaultProject() {
        await approveToken();
        await fundOwner();

        await funding.createProject(
            beneficiary.address,
            await token.getAddress(),
            PROJECT_TOTAL,
            [
                MILESTONE_1,
                MILESTONE_2,
                MILESTONE_3
            ]
        );

        return 1n;
    }

    describe("Deployment", function () {
        beforeEach(async function () {
            await deployFixture();
        });

        it("sets the deployer as owner", async function () {
            expect(
                await funding.owner()
            ).to.equal(owner.address);
        });

        it("uses the expected version", async function () {
            expect(
                await funding.VERSION()
            ).to.equal("1.0.0");
        });

        it("sets the expected maximum milestone count", async function () {
            expect(
                await funding.MAX_MILESTONES()
            ).to.equal(20n);
        });

        it("starts project IDs at one", async function () {
            expect(
                await funding.nextProjectId()
            ).to.equal(1n);
        });
    });

    describe("Funding token administration", function () {
        beforeEach(async function () {
            await deployFixture();
        });

        it("allows the owner to approve a funding token", async function () {
            const tokenAddress =
                await token.getAddress();

            await expect(
                funding.approveFundingToken(
                    tokenAddress
                )
            )
                .to.emit(
                    funding,
                    "FundingTokenApproved"
                )
                .withArgs(tokenAddress);

            expect(
                await funding.approvedFundingTokens(
                    tokenAddress
                )
            ).to.equal(true);
        });

        it("rejects token approval by a non-owner", async function () {
            await expect(
                funding
                    .connect(attacker)
                    .approveFundingToken(
                        await token.getAddress()
                    )
            )
                .to.be.revertedWithCustomError(
                    funding,
                    "OwnableUnauthorizedAccount"
                )
                .withArgs(attacker.address);
        });

        it("rejects the zero token address", async function () {
            await expect(
                funding.approveFundingToken(
                    ethers.ZeroAddress
                )
            ).to.be.revertedWithCustomError(
                funding,
                "ZeroAddress"
            );
        });

        it("rejects approving the same token twice", async function () {
            await approveToken();

            await expect(
                funding.approveFundingToken(
                    await token.getAddress()
                )
            ).to.be.revertedWithCustomError(
                funding,
                "TokenAlreadyApproved"
            );
        });

        it("allows the owner to disable a funding token", async function () {
            await approveToken();

            const tokenAddress =
                await token.getAddress();

            await expect(
                funding.disableFundingToken(
                    tokenAddress
                )
            )
                .to.emit(
                    funding,
                    "FundingTokenDisabled"
                )
                .withArgs(tokenAddress);

            expect(
                await funding.approvedFundingTokens(
                    tokenAddress
                )
            ).to.equal(false);
        });

        it("rejects disabling a token that is not approved", async function () {
            await expect(
                funding.disableFundingToken(
                    await token.getAddress()
                )
            ).to.be.revertedWithCustomError(
                funding,
                "TokenAlreadyDisabled"
            );
        });

        it("rejects disabling a token by a non-owner", async function () {
            await approveToken();

            await expect(
                funding
                    .connect(attacker)
                    .disableFundingToken(
                        await token.getAddress()
                    )
            )
                .to.be.revertedWithCustomError(
                    funding,
                    "OwnableUnauthorizedAccount"
                )
                .withArgs(attacker.address);
        });
    });

    describe("Project creation", function () {
        beforeEach(async function () {
            await deployFixture();
            await approveToken();
            await fundOwner();
        });

        it("creates and fully funds a project", async function () {
            const fundingAddress =
                await funding.getAddress();

            await expect(
                funding.createProject(
                    beneficiary.address,
                    await token.getAddress(),
                    PROJECT_TOTAL,
                    [
                        MILESTONE_1,
                        MILESTONE_2,
                        MILESTONE_3
                    ]
                )
            )
                .to.emit(
                    funding,
                    "ProjectCreated"
                )
                .withArgs(
                    1n,
                    beneficiary.address,
                    await token.getAddress(),
                    PROJECT_TOTAL,
                    3n
                );

            expect(
                await token.balanceOf(
                    fundingAddress
                )
            ).to.equal(PROJECT_TOTAL);
        });

        it("stores the project information", async function () {
            await funding.createProject(
                beneficiary.address,
                await token.getAddress(),
                PROJECT_TOTAL,
                [
                    MILESTONE_1,
                    MILESTONE_2,
                    MILESTONE_3
                ]
            );

            const project =
                await funding.getProject(1);

            expect(
                project.beneficiary
            ).to.equal(beneficiary.address);

            expect(
                project.fundingToken
            ).to.equal(
                await token.getAddress()
            );

            expect(
                project.totalApproved
            ).to.equal(PROJECT_TOTAL);

            expect(
                project.totalReleased
            ).to.equal(0n);

            expect(
                project.milestoneCount
            ).to.equal(3n);

            expect(
                project.createdAt
            ).to.be.gt(0n);

            // ProjectStatus.Active
            expect(
                project.status
            ).to.equal(0n);
        });

        it("stores each milestone", async function () {
            await funding.createProject(
                beneficiary.address,
                await token.getAddress(),
                PROJECT_TOTAL,
                [
                    MILESTONE_1,
                    MILESTONE_2,
                    MILESTONE_3
                ]
            );

            const first =
                await funding.getMilestone(1, 0);

            const second =
                await funding.getMilestone(1, 1);

            const third =
                await funding.getMilestone(1, 2);

            expect(first.amount).to.equal(
                MILESTONE_1
            );

            expect(second.amount).to.equal(
                MILESTONE_2
            );

            expect(third.amount).to.equal(
                MILESTONE_3
            );

            // MilestoneStatus.Pending
            expect(first.status).to.equal(0n);
            expect(second.status).to.equal(0n);
            expect(third.status).to.equal(0n);
        });

        it("increments project IDs", async function () {
            await funding.createProject(
                beneficiary.address,
                await token.getAddress(),
                PROJECT_TOTAL,
                [
                    MILESTONE_1,
                    MILESTONE_2,
                    MILESTONE_3
                ]
            );

            await funding.createProject(
                beneficiary2.address,
                await token.getAddress(),
                PROJECT_TOTAL,
                [
                    MILESTONE_1,
                    MILESTONE_2,
                    MILESTONE_3
                ]
            );

            expect(
                await funding.nextProjectId()
            ).to.equal(3n);

            const project2 =
                await funding.getProject(2);

            expect(
                project2.beneficiary
            ).to.equal(
                beneficiary2.address
            );
        });

        it("tracks reserved capital", async function () {
            await funding.createProject(
                beneficiary.address,
                await token.getAddress(),
                PROJECT_TOTAL,
                [
                    MILESTONE_1,
                    MILESTONE_2,
                    MILESTONE_3
                ]
            );

            expect(
                await funding.totalReservedByToken(
                    await token.getAddress()
                )
            ).to.equal(PROJECT_TOTAL);

            expect(
                await funding.protectedBalanceOf(
                    await token.getAddress()
                )
            ).to.equal(PROJECT_TOTAL);
        });

        it("rejects project creation by a non-owner", async function () {
            await expect(
                funding
                    .connect(attacker)
                    .createProject(
                        beneficiary.address,
                        await token.getAddress(),
                        PROJECT_TOTAL,
                        [
                            MILESTONE_1,
                            MILESTONE_2,
                            MILESTONE_3
                        ]
                    )
            )
                .to.be.revertedWithCustomError(
                    funding,
                    "OwnableUnauthorizedAccount"
                )
                .withArgs(attacker.address);
        });

        it("rejects a zero beneficiary", async function () {
            await expect(
                funding.createProject(
                    ethers.ZeroAddress,
                    await token.getAddress(),
                    PROJECT_TOTAL,
                    [
                        MILESTONE_1,
                        MILESTONE_2,
                        MILESTONE_3
                    ]
                )
            ).to.be.revertedWithCustomError(
                funding,
                "ZeroAddress"
            );
        });

        it("rejects a zero funding token", async function () {
            await expect(
                funding.createProject(
                    beneficiary.address,
                    ethers.ZeroAddress,
                    PROJECT_TOTAL,
                    [
                        MILESTONE_1,
                        MILESTONE_2,
                        MILESTONE_3
                    ]
                )
            ).to.be.revertedWithCustomError(
                funding,
                "ZeroAddress"
            );
        });

        it("rejects an unapproved funding token", async function () {
            await expect(
                funding.createProject(
                    beneficiary.address,
                    await secondToken.getAddress(),
                    PROJECT_TOTAL,
                    [
                        MILESTONE_1,
                        MILESTONE_2,
                        MILESTONE_3
                    ]
                )
            ).to.be.revertedWithCustomError(
                funding,
                "TokenNotApproved"
            );
        });

        it("rejects a zero total allocation", async function () {
            await expect(
                funding.createProject(
                    beneficiary.address,
                    await token.getAddress(),
                    0,
                    [1]
                )
            ).to.be.revertedWithCustomError(
                funding,
                "ZeroAmount"
            );
        });

        it("rejects an empty milestone list", async function () {
            await expect(
                funding.createProject(
                    beneficiary.address,
                    await token.getAddress(),
                    PROJECT_TOTAL,
                    []
                )
            ).to.be.revertedWithCustomError(
                funding,
                "InvalidMilestoneCount"
            );
        });

        it("rejects more than MAX_MILESTONES", async function () {
            const amounts =
                Array(21).fill(
                    ethers.parseEther("1")
                );

            await expect(
                funding.createProject(
                    beneficiary.address,
                    await token.getAddress(),
                    ethers.parseEther("21"),
                    amounts
                )
            ).to.be.revertedWithCustomError(
                funding,
                "InvalidMilestoneCount"
            );
        });

        it("rejects a zero-value milestone", async function () {
            await expect(
                funding.createProject(
                    beneficiary.address,
                    await token.getAddress(),
                    PROJECT_TOTAL,
                    [
                        MILESTONE_1,
                        0,
                        ethers.parseEther("800")
                    ]
                )
            ).to.be.revertedWithCustomError(
                funding,
                "InvalidMilestoneAmount"
            );
        });

        it("rejects milestone totals that do not equal the approved allocation", async function () {
            await expect(
                funding.createProject(
                    beneficiary.address,
                    await token.getAddress(),
                    PROJECT_TOTAL,
                    [
                        MILESTONE_1,
                        MILESTONE_2
                    ]
                )
            ).to.be.revertedWithCustomError(
                funding,
                "InvalidMilestoneAmount"
            );
        });

        it("rejects new projects after the funding token is disabled", async function () {
            await funding.disableFundingToken(
                await token.getAddress()
            );

            await expect(
                funding.createProject(
                    beneficiary.address,
                    await token.getAddress(),
                    PROJECT_TOTAL,
                    [
                        MILESTONE_1,
                        MILESTONE_2,
                        MILESTONE_3
                    ]
                )
            ).to.be.revertedWithCustomError(
                funding,
                "TokenNotApproved"
            );
        });
    });

    describe("Milestone approval", function () {
        beforeEach(async function () {
            await deployFixture();
            await createDefaultProject();
        });

        it("allows the owner to approve a pending milestone", async function () {
            await expect(
                funding.approveMilestone(
                    1,
                    0
                )
            )
                .to.emit(
                    funding,
                    "MilestoneApproved"
                )
                .withArgs(
                    1n,
                    0n,
                    MILESTONE_1
                );

            const milestone =
                await funding.getMilestone(
                    1,
                    0
                );

            // MilestoneStatus.Approved
            expect(
                milestone.status
            ).to.equal(1n);
        });

        it("rejects milestone approval by a non-owner", async function () {
            await expect(
                funding
                    .connect(attacker)
                    .approveMilestone(
                        1,
                        0
                    )
            )
                .to.be.revertedWithCustomError(
                    funding,
                    "OwnableUnauthorizedAccount"
                )
                .withArgs(attacker.address);
        });

        it("rejects approving the same milestone twice", async function () {
            await funding.approveMilestone(
                1,
                0
            );

            await expect(
                funding.approveMilestone(
                    1,
                    0
                )
            ).to.be.revertedWithCustomError(
                funding,
                "MilestoneNotPending"
            );
        });

        it("rejects an invalid milestone ID", async function () {
            await expect(
                funding.approveMilestone(
                    1,
                    3
                )
            ).to.be.revertedWithCustomError(
                funding,
                "MilestoneNotFound"
            );
        });

        it("rejects an unknown project", async function () {
            await expect(
                funding.approveMilestone(
                    999,
                    0
                )
            ).to.be.revertedWithCustomError(
                funding,
                "ProjectNotFound"
            );
        });
    });

    describe("Milestone release", function () {
        beforeEach(async function () {
            await deployFixture();
            await createDefaultProject();
        });

        it("releases an approved milestone to the beneficiary", async function () {
            await funding.approveMilestone(
                1,
                0
            );

            const before =
                await token.balanceOf(
                    beneficiary.address
                );

            await expect(
                funding.releaseMilestone(
                    1,
                    0
                )
            )
                .to.emit(
                    funding,
                    "MilestoneReleased"
                )
                .withArgs(
                    1n,
                    0n,
                    beneficiary.address,
                    await token.getAddress(),
                    MILESTONE_1
                );

            const after =
                await token.balanceOf(
                    beneficiary.address
                );

            expect(
                after - before
            ).to.equal(MILESTONE_1);
        });

        it("updates project accounting after release", async function () {
            await funding.approveMilestone(
                1,
                0
            );

            await funding.releaseMilestone(
                1,
                0
            );

            const project =
                await funding.getProject(1);

            expect(
                project.totalReleased
            ).to.equal(MILESTONE_1);

            expect(
                await funding.remainingAllocation(
                    1
                )
            ).to.equal(
                PROJECT_TOTAL -
                    MILESTONE_1
            );

            expect(
                await funding.totalReservedByToken(
                    await token.getAddress()
                )
            ).to.equal(
                PROJECT_TOTAL -
                    MILESTONE_1
            );
        });

        it("marks a released milestone correctly", async function () {
            await funding.approveMilestone(
                1,
                0
            );

            await funding.releaseMilestone(
                1,
                0
            );

            const milestone =
                await funding.getMilestone(
                    1,
                    0
                );

            // MilestoneStatus.Released
            expect(
                milestone.status
            ).to.equal(2n);
        });

        it("rejects releasing a pending milestone", async function () {
            await expect(
                funding.releaseMilestone(
                    1,
                    0
                )
            ).to.be.revertedWithCustomError(
                funding,
                "MilestoneNotApproved"
            );
        });

        it("rejects milestone release by a non-owner", async function () {
            await funding.approveMilestone(
                1,
                0
            );

            await expect(
                funding
                    .connect(attacker)
                    .releaseMilestone(
                        1,
                        0
                    )
            )
                .to.be.revertedWithCustomError(
                    funding,
                    "OwnableUnauthorizedAccount"
                )
                .withArgs(attacker.address);
        });

        it("prevents releasing the same milestone twice", async function () {
            await funding.approveMilestone(
                1,
                0
            );

            await funding.releaseMilestone(
                1,
                0
            );

            await expect(
                funding.releaseMilestone(
                    1,
                    0
                )
            ).to.be.revertedWithCustomError(
                funding,
                "MilestoneNotApproved"
            );
        });

        it("completes the project after all milestones are released", async function () {
            for (let i = 0; i < 3; i++) {
                await funding.approveMilestone(
                    1,
                    i
                );

                await funding.releaseMilestone(
                    1,
                    i
                );
            }

            const project =
                await funding.getProject(1);

            // ProjectStatus.Completed
            expect(
                project.status
            ).to.equal(1n);

            expect(
                project.totalReleased
            ).to.equal(PROJECT_TOTAL);

            expect(
                await funding.totalReservedByToken(
                    await token.getAddress()
                )
            ).to.equal(0n);

            expect(
                await funding.protectedBalanceOf(
                    await token.getAddress()
                )
            ).to.equal(0n);
        });

        it("emits ProjectCompleted after the final milestone", async function () {
            await funding.approveMilestone(
                1,
                0
            );

            await funding.releaseMilestone(
                1,
                0
            );

            await funding.approveMilestone(
                1,
                1
            );

            await funding.releaseMilestone(
                1,
                1
            );

            await funding.approveMilestone(
                1,
                2
            );

            await expect(
                funding.releaseMilestone(
                    1,
                    2
                )
            )
                .to.emit(
                    funding,
                    "ProjectCompleted"
                )
                .withArgs(
                    1n,
                    PROJECT_TOTAL
                );
        });
    });

    describe("Project cancellation", function () {
        beforeEach(async function () {
            await deployFixture();
            await createDefaultProject();
        });

        it("allows the owner to cancel an active project", async function () {
            await expect(
                funding.cancelProject(1)
            )
                .to.emit(
                    funding,
                    "ProjectCancelled"
                )
                .withArgs(
                    1n,
                    PROJECT_TOTAL
                );

            const project =
                await funding.getProject(1);

            // ProjectStatus.Cancelled
            expect(
                project.status
            ).to.equal(2n);
        });

        it("rejects cancellation by a non-owner", async function () {
            await expect(
                funding
                    .connect(attacker)
                    .cancelProject(1)
            )
                .to.be.revertedWithCustomError(
                    funding,
                    "OwnableUnauthorizedAccount"
                )
                .withArgs(attacker.address);
        });

        it("preserves already released capital when cancelling", async function () {
            await funding.approveMilestone(
                1,
                0
            );

            await funding.releaseMilestone(
                1,
                0
            );

            await funding.cancelProject(1);

            expect(
                await funding.cancelledRecoverable(
                    1
                )
            ).to.equal(
                PROJECT_TOTAL -
                    MILESTONE_1
            );

            expect(
                await funding.cancelledProtectedByToken(
                    await token.getAddress()
                )
            ).to.equal(
                PROJECT_TOTAL -
                    MILESTONE_1
            );
        });

        it("moves unreleased capital from active reserve to cancelled protection", async function () {
            await funding.cancelProject(1);

            expect(
                await funding.totalReservedByToken(
                    await token.getAddress()
                )
            ).to.equal(0n);

            expect(
                await funding.cancelledProtectedByToken(
                    await token.getAddress()
                )
            ).to.equal(PROJECT_TOTAL);

            expect(
                await funding.protectedBalanceOf(
                    await token.getAddress()
                )
            ).to.equal(PROJECT_TOTAL);
        });

        it("marks unreleased milestones as cancelled", async function () {
            await funding.approveMilestone(
                1,
                0
            );

            await funding.cancelProject(1);

            for (let i = 0; i < 3; i++) {
                const milestone =
                    await funding.getMilestone(
                        1,
                        i
                    );

                // MilestoneStatus.Cancelled
                expect(
                    milestone.status
                ).to.equal(3n);
            }
        });

        it("keeps already released milestones released", async function () {
            await funding.approveMilestone(
                1,
                0
            );

            await funding.releaseMilestone(
                1,
                0
            );

            await funding.cancelProject(1);

            const released =
                await funding.getMilestone(
                    1,
                    0
                );

            const pending =
                await funding.getMilestone(
                    1,
                    1
                );

            expect(
                released.status
            ).to.equal(2n);

            expect(
                pending.status
            ).to.equal(3n);
        });

        it("rejects approving milestones after cancellation", async function () {
            await funding.cancelProject(1);

            await expect(
                funding.approveMilestone(
                    1,
                    0
                )
            ).to.be.revertedWithCustomError(
                funding,
                "ProjectNotActive"
            );
        });

        it("rejects releasing milestones after cancellation", async function () {
            await funding.approveMilestone(
                1,
                0
            );

            await funding.cancelProject(1);

            await expect(
                funding.releaseMilestone(
                    1,
                    0
                )
            ).to.be.revertedWithCustomError(
                funding,
                "ProjectNotActive"
            );
        });

        it("rejects cancelling the same project twice", async function () {
            await funding.cancelProject(1);

            await expect(
                funding.cancelProject(1)
            ).to.be.revertedWithCustomError(
                funding,
                "ProjectAlreadyCancelled"
            );
        });

        it("rejects cancelling a completed project", async function () {
            for (let i = 0; i < 3; i++) {
                await funding.approveMilestone(
                    1,
                    i
                );

                await funding.releaseMilestone(
                    1,
                    i
                );
            }

            await expect(
                funding.cancelProject(1)
            ).to.be.revertedWithCustomError(
                funding,
                "ProjectAlreadyCompleted"
            );
        });
    });

    describe("Cancelled fund recovery", function () {
        beforeEach(async function () {
            await deployFixture();
            await createDefaultProject();
        });

        it("recovers cancelled funds to the selected recipient", async function () {
            await funding.cancelProject(1);

            const before =
                await token.balanceOf(
                    treasury.address
                );

            await expect(
                funding.recoverCancelledFunds(
                    1,
                    treasury.address
                )
            )
                .to.emit(
                    funding,
                    "CancelledFundsRecovered"
                )
                .withArgs(
                    1n,
                    treasury.address,
                    await token.getAddress(),
                    PROJECT_TOTAL
                );

            const after =
                await token.balanceOf(
                    treasury.address
                );

            expect(
                after - before
            ).to.equal(PROJECT_TOTAL);
        });

        it("clears cancelled protection after recovery", async function () {
            await funding.cancelProject(1);

            await funding.recoverCancelledFunds(
                1,
                treasury.address
            );

            expect(
                await funding.cancelledRecoverable(
                    1
                )
            ).to.equal(0n);

            expect(
                await funding.cancelledProtectedByToken(
                    await token.getAddress()
                )
            ).to.equal(0n);

            expect(
                await funding.protectedBalanceOf(
                    await token.getAddress()
                )
            ).to.equal(0n);
        });

        it("recovers only the unreleased amount after partial funding", async function () {
            await funding.approveMilestone(
                1,
                0
            );

            await funding.releaseMilestone(
                1,
                0
            );

            await funding.cancelProject(1);

            const expected =
                PROJECT_TOTAL -
                MILESTONE_1;

            const before =
                await token.balanceOf(
                    treasury.address
                );

            await funding.recoverCancelledFunds(
                1,
                treasury.address
            );

            const after =
                await token.balanceOf(
                    treasury.address
                );

            expect(
                after - before
            ).to.equal(expected);
        });

        it("rejects cancelled fund recovery by a non-owner", async function () {
            await funding.cancelProject(1);

            await expect(
                funding
                    .connect(attacker)
                    .recoverCancelledFunds(
                        1,
                        treasury.address
                    )
            )
                .to.be.revertedWithCustomError(
                    funding,
                    "OwnableUnauthorizedAccount"
                )
                .withArgs(attacker.address);
        });

        it("rejects recovery to the zero address", async function () {
            await funding.cancelProject(1);

            await expect(
                funding.recoverCancelledFunds(
                    1,
                    ethers.ZeroAddress
                )
            ).to.be.revertedWithCustomError(
                funding,
                "ZeroAddress"
            );
        });

        it("rejects recovery from an active project", async function () {
            await expect(
                funding.recoverCancelledFunds(
                    1,
                    treasury.address
                )
            ).to.be.revertedWithCustomError(
                funding,
                "ProjectNotActive"
            );
        });

        it("prevents recovering cancelled funds twice", async function () {
            await funding.cancelProject(1);

            await funding.recoverCancelledFunds(
                1,
                treasury.address
            );

            await expect(
                funding.recoverCancelledFunds(
                    1,
                    treasury.address
                )
            ).to.be.revertedWithCustomError(
                funding,
                "NoRecoverableFunds"
            );
        });
    });

    describe("Unreserved token recovery", function () {
        beforeEach(async function () {
            await deployFixture();
            await createDefaultProject();
        });

        it("allows recovery of genuine excess tokens", async function () {
            const excess =
                ethers.parseEther("100");

            // Direct transfer simulates tokens accidentally
            // sent to the funding contract.
            await token.transfer(
                await funding.getAddress(),
                excess
            );

            const before =
                await token.balanceOf(
                    treasury.address
                );

            await expect(
                funding.recoverUnreservedTokens(
                    await token.getAddress(),
                    treasury.address,
                    excess
                )
            )
                .to.emit(
                    funding,
                    "UnreservedTokensRecovered"
                )
                .withArgs(
                    await token.getAddress(),
                    treasury.address,
                    excess
                );

            const after =
                await token.balanceOf(
                    treasury.address
                );

            expect(
                after - before
            ).to.equal(excess);
        });

        it("cannot recover active project capital as excess", async function () {
            await expect(
                funding.recoverUnreservedTokens(
                    await token.getAddress(),
                    treasury.address,
                    1
                )
            ).to.be.revertedWithCustomError(
                funding,
                "InsufficientUnreservedBalance"
            );
        });

        it("cannot recover cancelled protected capital as excess", async function () {
            await funding.cancelProject(1);

            await expect(
                funding.recoverUnreservedTokens(
                    await token.getAddress(),
                    treasury.address,
                    1
                )
            ).to.be.revertedWithCustomError(
                funding,
                "InsufficientUnreservedBalance"
            );
        });

        it("can recover only excess above protected capital", async function () {
            const excess =
                ethers.parseEther("100");

            await token.transfer(
                await funding.getAddress(),
                excess
            );

            await expect(
                funding.recoverUnreservedTokens(
                    await token.getAddress(),
                    treasury.address,
                    excess + 1n
                )
            ).to.be.revertedWithCustomError(
                funding,
                "InsufficientUnreservedBalance"
            );

            await funding.recoverUnreservedTokens(
                await token.getAddress(),
                treasury.address,
                excess
            );

            expect(
                await token.balanceOf(
                    await funding.getAddress()
                )
            ).to.equal(PROJECT_TOTAL);
        });

        it("rejects unreserved recovery by a non-owner", async function () {
            await token.transfer(
                await funding.getAddress(),
                ethers.parseEther("10")
            );

            await expect(
                funding
                    .connect(attacker)
                    .recoverUnreservedTokens(
                        await token.getAddress(),
                        treasury.address,
                        ethers.parseEther("1")
                    )
            )
                .to.be.revertedWithCustomError(
                    funding,
                    "OwnableUnauthorizedAccount"
                )
                .withArgs(attacker.address);
        });

        it("rejects zero token address", async function () {
            await expect(
                funding.recoverUnreservedTokens(
                    ethers.ZeroAddress,
                    treasury.address,
                    1
                )
            ).to.be.revertedWithCustomError(
                funding,
                "ZeroAddress"
            );
        });

        it("rejects zero recipient address", async function () {
            await expect(
                funding.recoverUnreservedTokens(
                    await token.getAddress(),
                    ethers.ZeroAddress,
                    1
                )
            ).to.be.revertedWithCustomError(
                funding,
                "ZeroAddress"
            );
        });

        it("rejects zero recovery amount", async function () {
            await expect(
                funding.recoverUnreservedTokens(
                    await token.getAddress(),
                    treasury.address,
                    0
                )
            ).to.be.revertedWithCustomError(
                funding,
                "ZeroAmount"
            );
        });
    });

    describe("Multiple projects and accounting", function () {
        beforeEach(async function () {
            await deployFixture();
            await approveToken();
            await fundOwner();
        });

        it("keeps multiple project allocations independently accounted", async function () {
            await funding.createProject(
                beneficiary.address,
                await token.getAddress(),
                PROJECT_TOTAL,
                [
                    MILESTONE_1,
                    MILESTONE_2,
                    MILESTONE_3
                ]
            );

            await funding.createProject(
                beneficiary2.address,
                await token.getAddress(),
                PROJECT_TOTAL,
                [
                    MILESTONE_1,
                    MILESTONE_2,
                    MILESTONE_3
                ]
            );

            expect(
                await funding.totalReservedByToken(
                    await token.getAddress()
                )
            ).to.equal(
                PROJECT_TOTAL * 2n
            );

            await funding.approveMilestone(
                1,
                0
            );

            await funding.releaseMilestone(
                1,
                0
            );

            expect(
                await funding.totalReservedByToken(
                    await token.getAddress()
                )
            ).to.equal(
                PROJECT_TOTAL * 2n -
                    MILESTONE_1
            );

            const project2 =
                await funding.getProject(2);

            expect(
                project2.totalReleased
            ).to.equal(0n);
        });

        it("protects active and cancelled projects simultaneously", async function () {
            await funding.createProject(
                beneficiary.address,
                await token.getAddress(),
                PROJECT_TOTAL,
                [
                    MILESTONE_1,
                    MILESTONE_2,
                    MILESTONE_3
                ]
            );

            await funding.createProject(
                beneficiary2.address,
                await token.getAddress(),
                PROJECT_TOTAL,
                [
                    MILESTONE_1,
                    MILESTONE_2,
                    MILESTONE_3
                ]
            );

            await funding.cancelProject(1);

            expect(
                await funding.totalReservedByToken(
                    await token.getAddress()
                )
            ).to.equal(PROJECT_TOTAL);

            expect(
                await funding.cancelledProtectedByToken(
                    await token.getAddress()
                )
            ).to.equal(PROJECT_TOTAL);

            expect(
                await funding.protectedBalanceOf(
                    await token.getAddress()
                )
            ).to.equal(
                PROJECT_TOTAL * 2n
            );
        });

        it("maintains protection after recovering one cancelled project", async function () {
            await funding.createProject(
                beneficiary.address,
                await token.getAddress(),
                PROJECT_TOTAL,
                [
                    MILESTONE_1,
                    MILESTONE_2,
                    MILESTONE_3
                ]
            );

            await funding.createProject(
                beneficiary2.address,
                await token.getAddress(),
                PROJECT_TOTAL,
                [
                    MILESTONE_1,
                    MILESTONE_2,
                    MILESTONE_3
                ]
            );

            await funding.cancelProject(1);

            await funding.recoverCancelledFunds(
                1,
                treasury.address
            );

            expect(
                await funding.protectedBalanceOf(
                    await token.getAddress()
                )
            ).to.equal(PROJECT_TOTAL);

            expect(
                await token.balanceOf(
                    await funding.getAddress()
                )
            ).to.equal(PROJECT_TOTAL);
        });
    });

    describe("Disabled token behavior", function () {
        beforeEach(async function () {
            await deployFixture();
            await createDefaultProject();

            await funding.disableFundingToken(
                await token.getAddress()
            );
        });

        it("allows existing project milestones to continue after token disablement", async function () {
            await funding.approveMilestone(
                1,
                0
            );

            await funding.releaseMilestone(
                1,
                0
            );

            expect(
                await token.balanceOf(
                    beneficiary.address
                )
            ).to.equal(MILESTONE_1);
        });

        it("allows an existing project to be cancelled after token disablement", async function () {
            await funding.cancelProject(1);

            const project =
                await funding.getProject(1);

            expect(
                project.status
            ).to.equal(2n);
        });

        it("allows cancelled funds to be recovered after token disablement", async function () {
            await funding.cancelProject(1);

            await funding.recoverCancelledFunds(
                1,
                treasury.address
            );

            expect(
                await token.balanceOf(
                    treasury.address
                )
            ).to.equal(PROJECT_TOTAL);
        });
    });

    describe("Read validation", function () {
        beforeEach(async function () {
            await deployFixture();
            await createDefaultProject();
        });

        it("rejects reading an unknown project", async function () {
            await expect(
                funding.getProject(999)
            ).to.be.revertedWithCustomError(
                funding,
                "ProjectNotFound"
            );
        });

        it("rejects reading an invalid milestone", async function () {
            await expect(
                funding.getMilestone(
                    1,
                    999
                )
            ).to.be.revertedWithCustomError(
                funding,
                "MilestoneNotFound"
            );
        });

        it("reports the initial remaining allocation", async function () {
            expect(
                await funding.remainingAllocation(
                    1
                )
            ).to.equal(PROJECT_TOTAL);
        });
    });

    describe("Ownership transfer compatibility", function () {
        beforeEach(async function () {
            await deployFixture();
        });

        it("allows ownership to be transferred manually", async function () {
            await funding.transferOwnership(
                treasury.address
            );

            expect(
                await funding.owner()
            ).to.equal(
                treasury.address
            );
        });

        it("removes privileged access from the previous owner after transfer", async function () {
            await funding.transferOwnership(
                treasury.address
            );

            await expect(
                funding.approveFundingToken(
                    await token.getAddress()
                )
            )
                .to.be.revertedWithCustomError(
                    funding,
                    "OwnableUnauthorizedAccount"
                )
                .withArgs(owner.address);
        });

        it("gives privileged access to the new owner", async function () {
            await funding.transferOwnership(
                treasury.address
            );

            await funding
                .connect(treasury)
                .approveFundingToken(
                    await token.getAddress()
                );

            expect(
                await funding.approvedFundingTokens(
                    await token.getAddress()
                )
            ).to.equal(true);
        });
    });

    describe("Adversarial funding-token accounting", function () {
    beforeEach(async function () {
        await deployFixture();
    });

    it("rejects project creation when the funding token delivers less than the requested allocation", async function () {
        const FeeToken =
            await ethers.getContractFactory(
                "FeeOnTransferMockERC20"
            );

        const feeToken =
            await FeeToken.deploy();

        await feeToken.waitForDeployment();

        const feeTokenAddress =
            await feeToken.getAddress();

        const fundingAddress =
            await funding.getAddress();

        await funding.approveFundingToken(
            feeTokenAddress
        );

        await feeToken.approve(
            fundingAddress,
            PROJECT_TOTAL
        );

        /*
         * PROJECT_TOTAL is 1,000 tokens.
         *
         * The adversarial token charges a 10% fee,
         * so the funding contract would actually
         * receive only 900 tokens.
         *
         * A secure funding contract must not accept
         * the project while recording 1,000 tokens
         * as protected capital.
         */
          await expect(
    funding.createProject(
        beneficiary.address,
        feeTokenAddress,
        PROJECT_TOTAL,
        [
            MILESTONE_1,
            MILESTONE_2,
            MILESTONE_3
        ]
    )
)
    .to.be.revertedWithCustomError(
        funding,
        "FundingAmountMismatch"
    );

        /*
         * Because project creation must revert,
         * every state change must also roll back.
         */
        expect(
            await funding.nextProjectId()
        ).to.equal(1n);

        expect(
            await funding.totalReservedByToken(
                feeTokenAddress
            )
        ).to.equal(0n);

        expect(
            await funding.protectedBalanceOf(
                feeTokenAddress
            )
        ).to.equal(0n);

        expect(
            await feeToken.balanceOf(
                fundingAddress
            )
        ).to.equal(0n);

        await expect(
            funding.getProject(1)
        ).to.be.revertedWithCustomError(
            funding,
            "ProjectNotFound"
        );
    });
});

     it("prevents ownership renunciation", async function () {
    await deployFixture();

    await expect(
        funding.renounceOwnership()
    ).to.be.revertedWithCustomError(
        funding,
        "OwnershipRenunciationDisabled"
    );

    expect(
        await funding.owner()
    ).to.equal(owner.address);
});
});