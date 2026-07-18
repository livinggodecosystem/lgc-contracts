const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LGCInvestorVesting", function () {

    let owner;
    let beneficiary;
    let investor;

    let lgc;
    let registry;
    let vesting;

    beforeEach(async function () {

        [owner, beneficiary, investor] =
            await ethers.getSigners();

        //-----------------------------------
        // Deploy LGC
        //-----------------------------------

        const LivingGodCoin =
            await ethers.getContractFactory("LivingGodCoin");

        lgc = await LivingGodCoin.deploy();

        await lgc.waitForDeployment();

        //-----------------------------------
        // Deploy Launch Registry
        //-----------------------------------

        const LaunchRegistry =
            await ethers.getContractFactory("LGCLaunchRegistry");

        registry =
            await LaunchRegistry.deploy(
                owner.address
            );

        await registry.waitForDeployment();

        //-----------------------------------
        // Deploy Investor Vesting
        //-----------------------------------

        const InvestorVesting =
            await ethers.getContractFactory("LGCInvestorVesting");

        vesting =
            await InvestorVesting.deploy(

                owner.address,

                await lgc.getAddress(),

                await registry.getAddress()

            );

        await vesting.waitForDeployment();

    });

    it("Should deploy correctly", async function () {

    expect(
        await vesting.VERSION()
    ).to.equal("1.0.0");

});


it("Should store the LGC token", async function () {

    expect(
        await vesting.lgcToken()
    ).to.equal(
        await lgc.getAddress()
    );

});

it("Should store the Launch Registry", async function () {

    expect(
        await vesting.launchRegistry()
    ).to.equal(
        await registry.getAddress()
    );

});

it("Should store deployment timestamp", async function () {

    expect(
        await vesting.deployedAt()
    ).to.be.gt(0);

});

it("Should start with zero allocated tokens", async function () {

    expect(
        await vesting.totalAllocated()
    ).to.equal(0);

});


it("Should start with zero released tokens", async function () {

    expect(
        await vesting.totalReleased()
    ).to.equal(0);

});

it("Should add an investor", async function () {

    const allocation =
        ethers.parseEther("500000");

    await vesting.addInvestor(

        beneficiary.address,

        allocation,

        180 * 24 * 60 * 60,

        730 * 24 * 60 * 60,

        true

    );

    const investor =
        await vesting.investors(
            beneficiary.address
        );

    expect(investor.allocation)
        .to.equal(allocation);

    expect(investor.exists)
        .to.equal(true);

});


it("Should increase totalAllocated", async function () {

    const allocation =
        ethers.parseEther("500000");

    await vesting.addInvestor(

        beneficiary.address,

        allocation,

        180 * 24 * 60 * 60,

        730 * 24 * 60 * 60,

        true

    );

    expect(
        await vesting.totalAllocated()
    ).to.equal(allocation);

});


it("Should reject zero beneficiary", async function () {

    await expect(

        vesting.addInvestor(

            ethers.ZeroAddress,

            ethers.parseEther("500000"),

            180 * 24 * 60 * 60,

            730 * 24 * 60 * 60,

            true

        )

    ).to.be.revertedWithCustomError(

        vesting,

        "InvalidBeneficiary"

    );

});


it("Should reject zero allocation", async function () {

    await expect(

        vesting.addInvestor(

            beneficiary.address,

            0,

            180 * 24 * 60 * 60,

            730 * 24 * 60 * 60,

            true

        )

    ).to.be.revertedWithCustomError(

        vesting,

        "InvalidAmount"

    );

});

it("Should reject zero duration", async function () {

    await expect(

        vesting.addInvestor(

            beneficiary.address,

            ethers.parseEther("500000"),

            0,

            0,

            true

        )

    ).to.be.revertedWithCustomError(

        vesting,

        "InvalidDuration"

    );

});

it("Should reject cliff greater than duration", async function () {

    await expect(

        vesting.addInvestor(

            beneficiary.address,

            ethers.parseEther("500000"),

            800 * 24 * 60 * 60,

            730 * 24 * 60 * 60,

            true

        )

    ).to.be.revertedWithCustomError(

        vesting,

        "InvalidCliff"

    );

});

it("Should reject duplicate investor", async function () {

    const allocation =
        ethers.parseEther("500000");

    await vesting.addInvestor(

        beneficiary.address,

        allocation,

        180 * 24 * 60 * 60,

        730 * 24 * 60 * 60,

        true

    );

    await expect(

        vesting.addInvestor(

            beneficiary.address,

            allocation,

            180 * 24 * 60 * 60,

            730 * 24 * 60 * 60,

            true

        )

    ).to.be.revertedWithCustomError(

        vesting,

        "BeneficiaryExists"

    );

});


it("Should remove an investor", async function () {

    const allocation =
        ethers.parseEther("500000");

    await vesting.addInvestor(

        beneficiary.address,

        allocation,

        180 * 24 * 60 * 60,

        730 * 24 * 60 * 60,

        true

    );

    await vesting.removeInvestor(
        beneficiary.address
    );

    const investor =
        await vesting.investors(
            beneficiary.address
        );

    expect(investor.exists)
        .to.equal(false);

});


it("Should reduce totalAllocated", async function () {

    const allocation =
        ethers.parseEther("500000");

    await vesting.addInvestor(

        beneficiary.address,

        allocation,

        180 * 24 * 60 * 60,

        730 * 24 * 60 * 60,

        true

    );

    await vesting.removeInvestor(
        beneficiary.address
    );

    expect(
        await vesting.totalAllocated()
    ).to.equal(0);

});

it("Should reject removing unknown investor", async function () {

    await expect(

        vesting.removeInvestor(
            beneficiary.address
        )

    ).to.be.revertedWithCustomError(

        vesting,

        "BeneficiaryNotFound"

    );

});


it("Should allow owner to fund Investor Vesting", async function () {

    const amount =
        ethers.parseEther("1000000");

    await lgc.approve(
        vesting.target,
        amount
    );

    await vesting.fundInvestorVesting(
        amount
    );

    expect(
        await lgc.balanceOf(
            vesting.target
        )
    ).to.equal(amount);

});

it("Should reject zero funding", async function () {

    await expect(

        vesting.fundInvestorVesting(0)

    ).to.be.revertedWithCustomError(

        vesting,

        "InvalidAmount"

    );

});

it("Should not allow non-owner to fund Investor Vesting", async function () {

    const amount =
        ethers.parseEther("1000000");

    await lgc.transfer(
        beneficiary.address,
        amount
    );

    await lgc
        .connect(beneficiary)
        .approve(
            vesting.target,
            amount
        );

    await expect(

        vesting
            .connect(beneficiary)
            .fundInvestorVesting(amount)

    ).to.be.reverted;

});

it("Should increase Investor Vesting balance after funding", async function () {

    const amount =
        ethers.parseEther("250000");

    await lgc.approve(
        vesting.target,
        amount
    );

    await vesting.fundInvestorVesting(
        amount
    );

    expect(
        await lgc.balanceOf(
            vesting.target
        )
    ).to.equal(amount);

});

it("Should return zero vested amount for unknown investor", async function () {

    expect(

        await vesting.vestedAmount(
            beneficiary.address
        )

    ).to.equal(0);

});

it("Should return zero vested amount before launch", async function () {

    const allocation =
        ethers.parseEther("500000");

    await vesting.addInvestor(

        beneficiary.address,

        allocation,

        180 * 24 * 60 * 60,

        730 * 24 * 60 * 60,

        true

    );

    expect(

        await vesting.vestedAmount(
            beneficiary.address
        )

    ).to.equal(0);

});

it("Should activate ecosystem launch", async function () {

    await registry.activateLaunch();

    expect(

        await registry.launchActivated()

    ).to.equal(true);

});

it("Should return zero vested amount before cliff", async function () {

    const allocation =
        ethers.parseEther("500000");

    await vesting.addInvestor(

        beneficiary.address,

        allocation,

        180 * 24 * 60 * 60,

        730 * 24 * 60 * 60,

        true

    );

    await registry.activateLaunch();

    await ethers.provider.send(
        "evm_increaseTime",
        [90 * 24 * 60 * 60]
    );

    await ethers.provider.send(
        "evm_mine"
    );

    expect(

        await vesting.vestedAmount(
            beneficiary.address
        )

    ).to.equal(0);

});

it("Should vest linearly after cliff", async function () {

    const allocation =
        ethers.parseEther("500000");

    await vesting.addInvestor(

        beneficiary.address,

        allocation,

        180 * 24 * 60 * 60,

        730 * 24 * 60 * 60,

        true

    );

    await registry.activateLaunch();

    await ethers.provider.send(
        "evm_increaseTime",
        [365 * 24 * 60 * 60]
    );

    await ethers.provider.send(
        "evm_mine"
    );

    const vested =
        await vesting.vestedAmount(
            beneficiary.address
        );

    expect(vested)
        .to.be.gt(0);

    expect(vested)
        .to.be.lt(allocation);

});

it("Should return full allocation after duration", async function () {

    const allocation =
        ethers.parseEther("500000");

    await vesting.addInvestor(

        beneficiary.address,

        allocation,

        180 * 24 * 60 * 60,

        730 * 24 * 60 * 60,

        true

    );

    await registry.activateLaunch();

    await ethers.provider.send(
        "evm_increaseTime",
        [731 * 24 * 60 * 60]
    );

    await ethers.provider.send(
        "evm_mine"
    );

    expect(

        await vesting.vestedAmount(
            beneficiary.address
        )

    ).to.equal(allocation);

});

it("Should reject claim before ecosystem launch", async function () {

    const allocation =
        ethers.parseEther("500000");

    await vesting.addInvestor(

        beneficiary.address,

        allocation,

        180 * 24 * 60 * 60,

        730 * 24 * 60 * 60,

        true

    );

    await expect(

        vesting
            .connect(beneficiary)
            .claim()

    ).to.be.revertedWithCustomError(

        vesting,

        "LaunchNotActive"

    );

});


it("Should reject claim before cliff", async function () {

    const allocation =
        ethers.parseEther("500000");

    await vesting.addInvestor(

        beneficiary.address,

        allocation,

        180 * 24 * 60 * 60,

        730 * 24 * 60 * 60,

        true

    );

    await registry.activateLaunch();

    await expect(

        vesting
            .connect(beneficiary)
            .claim()

    ).to.be.revertedWithCustomError(

        vesting,

        "NothingToClaim"

    );

});

it("Should allow claiming after cliff", async function () {

    const allocation =
        ethers.parseEther("500000");

    await vesting.addInvestor(

        beneficiary.address,

        allocation,

        180 * 24 * 60 * 60,

        730 * 24 * 60 * 60,

        true

    );

    await lgc.approve(
        vesting.target,
        allocation
    );

    await vesting.fundInvestorVesting(
        allocation
    );

    await registry.activateLaunch();

    await ethers.provider.send(
        "evm_increaseTime",
        [365 * 24 * 60 * 60]
    );

    await ethers.provider.send(
        "evm_mine"
    );

    await vesting
        .connect(beneficiary)
        .claim();

    expect(

        await lgc.balanceOf(
            beneficiary.address
        )

    ).to.be.gt(0);

});

it("Should update released amount after claim", async function () {

    const allocation =
        ethers.parseEther("500000");

    await vesting.addInvestor(

        beneficiary.address,

        allocation,

        180 * 24 * 60 * 60,

        730 * 24 * 60 * 60,

        true

    );

    await lgc.approve(
        vesting.target,
        allocation
    );

    await vesting.fundInvestorVesting(
        allocation
    );

    await registry.activateLaunch();

    await ethers.provider.send(
        "evm_increaseTime",
        [365 * 24 * 60 * 60]
    );

    await ethers.provider.send(
        "evm_mine"
    );

    await vesting
        .connect(beneficiary)
        .claim();

    const investor =
        await vesting.investors(
            beneficiary.address
        );

    expect(investor.released)
        .to.be.gt(0);

});

it("Should update totalReleased", async function () {

    const allocation =
        ethers.parseEther("500000");

    await vesting.addInvestor(

        beneficiary.address,

        allocation,

        180 * 24 * 60 * 60,

        730 * 24 * 60 * 60,

        true

    );

    await lgc.approve(
        vesting.target,
        allocation
    );

    await vesting.fundInvestorVesting(
        allocation
    );

    await registry.activateLaunch();

    await ethers.provider.send(
        "evm_increaseTime",
        [365 * 24 * 60 * 60]
    );

    await ethers.provider.send(
        "evm_mine"
    );

    await vesting
        .connect(beneficiary)
        .claim();

    expect(
        await vesting.totalReleased()
    ).to.be.gt(0);

});


it("Should allow owner to revoke an investor", async function () {

    const allocation =
        ethers.parseEther("500000");

    await vesting.addInvestor(

        beneficiary.address,

        allocation,

        180 * 24 * 60 * 60,

        730 * 24 * 60 * 60,

        true

    );

    await vesting.revokeInvestor(
        beneficiary.address
    );

    const investor =
        await vesting.investors(
            beneficiary.address
        );

    expect(
        investor.revoked
    ).to.equal(true);

});

it("Should not allow non-owner to revoke investor", async function () {

    const allocation =
        ethers.parseEther("500000");

    await vesting.addInvestor(

        beneficiary.address,

        allocation,

        180 * 24 * 60 * 60,

        730 * 24 * 60 * 60,

        true

    );

    await expect(

        vesting
            .connect(beneficiary)
            .revokeInvestor(
                beneficiary.address
            )

    ).to.be.reverted;

});

it("Should reject revoking unknown investor", async function () {

    await expect(

        vesting.revokeInvestor(
            beneficiary.address
        )

    ).to.be.revertedWithCustomError(

        vesting,

        "BeneficiaryNotFound"

    );

});

it("Should not allow revoking twice", async function () {

    const allocation =
        ethers.parseEther("500000");

    await vesting.addInvestor(

        beneficiary.address,

        allocation,

        180 * 24 * 60 * 60,

        730 * 24 * 60 * 60,

        true

    );

    await vesting.revokeInvestor(
        beneficiary.address
    );

    await expect(

        vesting.revokeInvestor(
            beneficiary.address
        )

    ).to.be.revertedWithCustomError(

        vesting,

        "InvestorAlreadyRevoked"

    );

});

it("Should reject revoking a non-revocable investor", async function () {

    const allocation =
        ethers.parseEther("500000");

    await vesting.addInvestor(

        beneficiary.address,

        allocation,

        180 * 24 * 60 * 60,

        730 * 24 * 60 * 60,

        false

    );

    await expect(

        vesting.revokeInvestor(
            beneficiary.address
        )

    ).to.be.revertedWithCustomError(

        vesting,

        "InvestorNotRevocable"

    );

});


it("Should stop vesting after revocation", async function () {

    const allocation =
        ethers.parseEther("500000");

    await vesting.addInvestor(

        beneficiary.address,

        allocation,

        180 * 24 * 60 * 60,

        730 * 24 * 60 * 60,

        true

    );

    await registry.activateLaunch();

    await ethers.provider.send(
        "evm_increaseTime",
        [365 * 24 * 60 * 60]
    );

    await ethers.provider.send(
        "evm_mine"
    );

    await lgc.approve(
        vesting.target,
        allocation
    );

    await vesting.fundInvestorVesting(
        allocation
    );

    await vesting
        .connect(beneficiary)
        .claim();

    const releasedBefore =
        (
            await vesting.investors(
                beneficiary.address
            )
        ).released;

    await vesting.revokeInvestor(
        beneficiary.address
    );

    await ethers.provider.send(
        "evm_increaseTime",
        [365 * 24 * 60 * 60]
    );

    await ethers.provider.send(
        "evm_mine"
    );

    expect(

        await vesting.vestedAmount(
            beneficiary.address
        )

    ).to.equal(releasedBefore);

});

it("Should return zero claimable amount for unknown investor", async function () {

    expect(

        await vesting.claimableAmount(
            beneficiary.address
        )

    ).to.equal(0);

});

it("Should return zero remaining allocation for unknown investor", async function () {

    expect(

        await vesting.remainingAllocation(
            beneficiary.address
        )

    ).to.equal(0);

});

it("Should return zero vesting progress for unknown investor", async function () {

    expect(

        await vesting.vestingProgress(
            beneficiary.address
        )

    ).to.equal(0);

});

it("Should return the correct claimable amount", async function () {

    const allocation =
        ethers.parseEther("500000");

    await vesting.addInvestor(

        beneficiary.address,

        allocation,

        180 * 24 * 60 * 60,

        730 * 24 * 60 * 60,

        true

    );

    await lgc.approve(
        vesting.target,
        allocation
    );

    await vesting.fundInvestorVesting(
        allocation
    );

    await registry.activateLaunch();

    await ethers.provider.send(
        "evm_increaseTime",
        [365 * 24 * 60 * 60]
    );

    await ethers.provider.send("evm_mine");

    expect(

        await vesting.claimableAmount(
            beneficiary.address
        )

    ).to.be.gt(0);

});

it("Should reduce remaining allocation after claim", async function () {

    const allocation =
        ethers.parseEther("500000");

    await vesting.addInvestor(

        beneficiary.address,

        allocation,

        180 * 24 * 60 * 60,

        730 * 24 * 60 * 60,

        true

    );

    await lgc.approve(
        vesting.target,
        allocation
    );

    await vesting.fundInvestorVesting(
        allocation
    );

    await registry.activateLaunch();

    await ethers.provider.send(
        "evm_increaseTime",
        [365 * 24 * 60 * 60]
    );

    await ethers.provider.send("evm_mine");

    await vesting
        .connect(beneficiary)
        .claim();

    expect(

        await vesting.remainingAllocation(
            beneficiary.address
        )

    ).to.be.lt(allocation);

});

it("Should update vesting progress after claim", async function () {

    const allocation =
        ethers.parseEther("500000");

    await vesting.addInvestor(

        beneficiary.address,

        allocation,

        180 * 24 * 60 * 60,

        730 * 24 * 60 * 60,

        true

    );

    await lgc.approve(
        vesting.target,
        allocation
    );

    await vesting.fundInvestorVesting(
        allocation
    );

    await registry.activateLaunch();

    await ethers.provider.send(
        "evm_increaseTime",
        [365 * 24 * 60 * 60]
    );

    await ethers.provider.send("evm_mine");

    await vesting
        .connect(beneficiary)
        .claim();

    expect(

        await vesting.vestingProgress(
            beneficiary.address
        )

    ).to.be.gt(0);

});

it("Should return complete investor information", async function () {

    const allocation =
        ethers.parseEther("500000");

    await vesting.addInvestor(

        beneficiary.address,

        allocation,

        180 * 24 * 60 * 60,

        730 * 24 * 60 * 60,

        true

    );

    const info =
        await vesting.getInvestorInfo(
            beneficiary.address
        );

    expect(info.exists).to.equal(true);

    expect(info.revocable).to.equal(true);

    expect(info.allocation).to.equal(allocation);

});

it("Should recover another ERC20 token", async function () {

    const MockToken =
        await ethers.getContractFactory(
            "MockERC20"
        );

    const otherToken =
        await MockToken.deploy();

    await otherToken.transfer(
        vesting.target,
        ethers.parseEther("1000")
    );

    await vesting.recoverERC20(
        otherToken.target,
        owner.address,
        ethers.parseEther("1000")
    );

    expect(
        await otherToken.balanceOf(
            vesting.target
        )
    ).to.equal(0);

    expect(
        await otherToken.balanceOf(
            owner.address
        )
    ).to.equal(
        ethers.parseEther("1000000")
    );

});

it("Should not recover Living God Coin", async function () {

    await expect(

        vesting.recoverERC20(
            lgc.target,
            owner.address,
            ethers.parseEther("1")
        )

    ).to.be.revertedWithCustomError(

        vesting,
        "CannotRecoverLGC"

    );

});


it("Should not allow non-owner to recover ERC20", async function () {

    const MockToken =
        await ethers.getContractFactory(
            "MockERC20"
        );

    const otherToken =
        await MockToken.deploy();

    await otherToken.transfer(
        vesting.target,
        ethers.parseEther("1000")
    );

    await expect(

        vesting
            .connect(beneficiary)
            .recoverERC20(

                otherToken.target,

                beneficiary.address,

                ethers.parseEther("1000")

            )

    ).to.be.reverted;

});

it("Should recover accidental ETH", async function () {

    await owner.sendTransaction({

        to: vesting.target,

        value: ethers.parseEther("1")

    });

    await vesting.recoverETH(

        owner.address,

        ethers.parseEther("1")

    );

    expect(

        await ethers.provider.getBalance(
            vesting.target
        )

    ).to.equal(0);

});

it("Should reject recovering too much ETH", async function () {

    await expect(

        vesting.recoverETH(

            owner.address,

            ethers.parseEther("1")

        )

    ).to.be.revertedWithCustomError(

        vesting,

        "InsufficientETHBalance"

    );

});

it("Should not allow non-owner to recover ETH", async function () {

    await expect(

        vesting
            .connect(beneficiary)
            .recoverETH(

                beneficiary.address,

                1

            )

    ).to.be.reverted;

});

it("Should allow owner to pause Investor Vesting", async function () {

    await vesting.pause();

    expect(
        await vesting.paused()
    ).to.equal(true);

});

it("Should allow owner to unpause Investor Vesting", async function () {

    await vesting.pause();

    await vesting.unpause();

    expect(
        await vesting.paused()
    ).to.equal(false);

});

it("Should not allow non-owner to pause Investor Vesting", async function () {

    await expect(

        vesting
            .connect(beneficiary)
            .pause()

    ).to.be.reverted;

});

it("Should not allow claiming while paused", async function () {

    const allocation =
        ethers.parseEther("500000");

    await vesting.addInvestor(

        beneficiary.address,

        allocation,

        180 * 24 * 60 * 60,

        730 * 24 * 60 * 60,

        true

    );

    await lgc.approve(
        vesting.target,
        allocation
    );

    await vesting.fundInvestorVesting(
        allocation
    );

    await registry.activateLaunch();

    await ethers.provider.send(
        "evm_increaseTime",
        [365 * 24 * 60 * 60]
    );

    await ethers.provider.send(
        "evm_mine"
    );

    await vesting.pause();

    await expect(

        vesting
            .connect(beneficiary)
            .claim()

    ).to.be.revertedWithCustomError(

        vesting,

        "EnforcedPause"

    );

});

it("Should allow claiming after unpause", async function () {

    const allocation =
        ethers.parseEther("500000");

    await vesting.addInvestor(

        beneficiary.address,

        allocation,

        180 * 24 * 60 * 60,

        730 * 24 * 60 * 60,

        true

    );

    await lgc.approve(
        vesting.target,
        allocation
    );

    await vesting.fundInvestorVesting(
        allocation
    );

    await registry.activateLaunch();

    await ethers.provider.send(
        "evm_increaseTime",
        [365 * 24 * 60 * 60]
    );

    await ethers.provider.send(
        "evm_mine"
    );

    await vesting.pause();

    await vesting.unpause();

    await expect(

        vesting
            .connect(beneficiary)
            .claim()

    ).to.not.be.reverted;

});

it("Invariant: totalReleased should never exceed totalAllocated", async function () {

    expect(
        await vesting.totalReleased()
    ).to.be.lte(
        await vesting.totalAllocated()
    );

});

it("Invariant: released should never exceed allocation", async function () {

    const allocation =
        ethers.parseEther("500000");

    await vesting.addInvestor(

        beneficiary.address,

        allocation,

        180 * 24 * 60 * 60,

        730 * 24 * 60 * 60,

        true

    );

    const info =
        await vesting.getInvestorInfo(
            beneficiary.address
        );

    expect(info.released)
        .to.be.lte(info.allocation);

});


it("Invariant: remaining plus released should equal allocation", async function () {

    const allocation =
        ethers.parseEther("500000");

    await vesting.addInvestor(

        beneficiary.address,

        allocation,

        180 * 24 * 60 * 60,

        730 * 24 * 60 * 60,

        true

    );

    const info =
        await vesting.getInvestorInfo(
            beneficiary.address
        );

    const remaining =
        await vesting.remainingAllocation(
            beneficiary.address
        );

    expect(
        remaining + info.released
    ).to.equal(
        info.allocation
    );

});


it("Invariant: allocation should remain constant", async function () {

    const allocation =
        ethers.parseEther("500000");

    await vesting.addInvestor(

        beneficiary.address,

        allocation,

        180 * 24 * 60 * 60,

        730 * 24 * 60 * 60,

        true

    );

    const before =
        await vesting.getInvestorInfo(
            beneficiary.address
        );

    const after =
        await vesting.getInvestorInfo(
            beneficiary.address
        );

    expect(before.allocation)
        .to.equal(after.allocation);

});


it("Invariant: claimable should never exceed remaining allocation", async function () {

    const allocation =
        ethers.parseEther("500000");

    await vesting.addInvestor(

        beneficiary.address,

        allocation,

        180 * 24 * 60 * 60,

        730 * 24 * 60 * 60,

        true

    );

    expect(

        await vesting.claimableAmount(
            beneficiary.address
        )

    ).to.be.lte(

        await vesting.remainingAllocation(
            beneficiary.address
        )

    );

});



});