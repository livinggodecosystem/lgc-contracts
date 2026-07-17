const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LGCTeamVesting", function () {

    let owner;
    let teamWallet;
    let beneficiary;
    let other;

    let lgc;
    let registry;
    let vesting;

    beforeEach(async function () {

        [
            owner,
            teamWallet,
            beneficiary,
            other
        ] = await ethers.getSigners();

        //----------------------------------
        // Deploy LGC
        //----------------------------------

        const LivingGodCoin =
            await ethers.getContractFactory(
                "LivingGodCoin"
            );

        lgc =
            await LivingGodCoin.deploy();

        await lgc.waitForDeployment();

        //----------------------------------
        // Deploy Launch Registry
        //----------------------------------

        const LaunchRegistry =
            await ethers.getContractFactory(
                "LGCLaunchRegistry"
            );

        registry =
            await LaunchRegistry.deploy(
                owner.address
            );

        await registry.waitForDeployment();

        //----------------------------------
        // Deploy Team Vesting
        //----------------------------------

        const TeamVesting =
            await ethers.getContractFactory(
                "LGCTeamVesting"
            );

        vesting =
            await TeamVesting.deploy(

                owner.address,

                await lgc.getAddress(),

                await registry.getAddress(),

                teamWallet.address

            );

        await vesting.waitForDeployment();

    });

    it("Should deploy correctly", async function () {

    expect(
        await vesting.owner()
    ).to.equal(owner.address);

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

it("Should store the Team Wallet", async function () {

    expect(
        await vesting.teamWallet()
    ).to.equal(
        teamWallet.address
    );

});

it("Should return VERSION 1.0.0", async function () {

    expect(
        await vesting.VERSION()
    ).to.equal("1.0.0");

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

it("Should add a team member", async function () {

    const allocation =
        ethers.parseEther("100000");

    await vesting.addTeamMember(

        beneficiary.address,

        allocation

    );

    const member =
        await vesting.teamMembers(
            beneficiary.address
        );

    expect(member.allocation)
        .to.equal(allocation);

    expect(member.released)
        .to.equal(0);

    expect(member.exists)
        .to.equal(true);

});

it("Should increase totalAllocated after adding a member", async function () {

    const allocation =
        ethers.parseEther("100000");

    await vesting.addTeamMember(

        beneficiary.address,

        allocation

    );

    expect(
        await vesting.totalAllocated()
    ).to.equal(allocation);

});

it("Should reject zero beneficiary", async function () {

    await expect(

        vesting.addTeamMember(

            ethers.ZeroAddress,

            ethers.parseEther("100000")

        )

    ).to.be.revertedWithCustomError(

        vesting,

        "InvalidBeneficiary"

    );

});

it("Should reject zero allocation", async function () {

    await expect(

        vesting.addTeamMember(

            beneficiary.address,

            0

        )

    ).to.be.revertedWithCustomError(

        vesting,

        "InvalidAmount"

    );

});

it("Should reject duplicate team members", async function () {

    const allocation =
        ethers.parseEther("100000");

    await vesting.addTeamMember(

        beneficiary.address,

        allocation

    );

    await expect(

        vesting.addTeamMember(

            beneficiary.address,

            allocation

        )

    ).to.be.revertedWithCustomError(

        vesting,

        "BeneficiaryExists"

    );

});


it("Should remove a team member", async function () {

    const allocation =
        ethers.parseEther("100000");

    await vesting.addTeamMember(

        beneficiary.address,

        allocation

    );

    await vesting.removeTeamMember(

        beneficiary.address

    );

    const member =
        await vesting.teamMembers(
            beneficiary.address
        );

    expect(member.exists)
        .to.equal(false);

});


it("Should reduce totalAllocated after removal", async function () {

    const allocation =
        ethers.parseEther("100000");

    await vesting.addTeamMember(

        beneficiary.address,

        allocation

    );

    await vesting.removeTeamMember(

        beneficiary.address

    );

    expect(
        await vesting.totalAllocated()
    ).to.equal(0);

});

it("Should reject removing a non-existent member", async function () {

    await expect(

        vesting.removeTeamMember(

            beneficiary.address

        )

    ).to.be.revertedWithCustomError(

        vesting,

        "BeneficiaryNotFound"

    );

});

it("Should allow owner to fund Team Vesting", async function () {

    const amount =
        ethers.parseEther("500000");

    await lgc.approve(
        vesting.target,
        amount
    );

    await vesting.fundTeamVesting(
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

        vesting.fundTeamVesting(0)

    ).to.be.revertedWithCustomError(

        vesting,

        "InvalidAmount"

    );

});

it("Should not allow non-owner to fund Team Vesting", async function () {

    const amount =
        ethers.parseEther("100000");

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
            .fundTeamVesting(amount)

    ).to.be.revertedWithCustomError(

        vesting,

        "OwnableUnauthorizedAccount"

    );

});

it("Should reject claim before ecosystem launch", async function () {

    const allocation =
        ethers.parseEther("100000");

    await vesting.addTeamMember(
        beneficiary.address,
        allocation
    );

    const funding =
        ethers.parseEther("500000");

    await lgc.approve(
        vesting.target,
        funding
    );

    await vesting.fundTeamVesting(
        funding
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

it("Should return zero vested amount before launch", async function () {

    const allocation =
        ethers.parseEther("100000");

    await vesting.addTeamMember(
        beneficiary.address,
        allocation
    );

    expect(

        await vesting.vestedAmount(
            beneficiary.address
        )

    ).to.equal(0);

});

it("Should return zero vested amount for unknown member", async function () {

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

it("Should store official launch time", async function () {

    await registry.activateLaunch();

    expect(

        await registry.officialLaunchTime()

    ).to.be.gt(0);

});

it("Should not unlock tokens before 6 months", async function () {

    const allocation =
        ethers.parseEther("100000");

    await vesting.addTeamMember(
        beneficiary.address,
        allocation
    );

    await registry.activateLaunch();

    await ethers.provider.send(
        "evm_increaseTime",
        [179 * 24 * 60 * 60]
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

it("Should unlock 30% after 6 months", async function () {

    const allocation =
        ethers.parseEther("100000");

    await vesting.addTeamMember(
        beneficiary.address,
        allocation
    );

    await registry.activateLaunch();

    await ethers.provider.send(
        "evm_increaseTime",
        [180 * 24 * 60 * 60]
    );

    await ethers.provider.send("evm_mine");

    expect(

        await vesting.vestedAmount(
            beneficiary.address
        )

    ).to.equal(

        allocation * 30n / 100n

    );

});


it("Should still unlock only 30% before two years", async function () {

    const allocation =
        ethers.parseEther("100000");

    await vesting.addTeamMember(
        beneficiary.address,
        allocation
    );

    await registry.activateLaunch();

    await ethers.provider.send(
        "evm_increaseTime",
        [500 * 24 * 60 * 60]
    );

    await ethers.provider.send("evm_mine");

    expect(

        await vesting.vestedAmount(
            beneficiary.address
        )

    ).to.equal(

        allocation * 30n / 100n

    );

});


it("Should unlock 100% after two years", async function () {

    const allocation =
        ethers.parseEther("100000");

    await vesting.addTeamMember(
        beneficiary.address,
        allocation
    );

    await registry.activateLaunch();

    await ethers.provider.send(
        "evm_increaseTime",
        [730 * 24 * 60 * 60]
    );

    await ethers.provider.send("evm_mine");

    expect(

        await vesting.vestedAmount(
            beneficiary.address
        )

    ).to.equal(allocation);

});

it("Should allow claiming 30% after six months", async function () {

    const allocation =
        ethers.parseEther("100000");

    await vesting.addTeamMember(
        beneficiary.address,
        allocation
    );

    const funding =
        ethers.parseEther("500000");

    await lgc.approve(
        vesting.target,
        funding
    );

    await vesting.fundTeamVesting(
        funding
    );

    await registry.activateLaunch();

    await ethers.provider.send(
        "evm_increaseTime",
        [180 * 24 * 60 * 60]
    );

    await ethers.provider.send("evm_mine");

    await vesting
        .connect(beneficiary)
        .claim();

    expect(

        await lgc.balanceOf(
            beneficiary.address
        )

    ).to.equal(

        allocation * 30n / 100n

    );

});

it("Should update released tokens after claim", async function () {

    const allocation =
        ethers.parseEther("100000");

    await vesting.addTeamMember(
        beneficiary.address,
        allocation
    );

    const funding =
        ethers.parseEther("500000");

    await lgc.approve(
        vesting.target,
        funding
    );

    await vesting.fundTeamVesting(
        funding
    );

    await registry.activateLaunch();

    await ethers.provider.send(
        "evm_increaseTime",
        [180 * 24 * 60 * 60]
    );

    await ethers.provider.send("evm_mine");

    await vesting
        .connect(beneficiary)
        .claim();

    const member =
        await vesting.teamMembers(
            beneficiary.address
        );

    expect(member.released)
        .to.equal(
            allocation * 30n / 100n
        );

});

it("Should not allow claiming twice before two years", async function () {

    const allocation =
        ethers.parseEther("100000");

    await vesting.addTeamMember(
        beneficiary.address,
        allocation
    );

    const funding =
        ethers.parseEther("500000");

    await lgc.approve(
        vesting.target,
        funding
    );

    await vesting.fundTeamVesting(
        funding
    );

    await registry.activateLaunch();

    await ethers.provider.send(
        "evm_increaseTime",
        [180 * 24 * 60 * 60]
    );

    await ethers.provider.send("evm_mine");

    await vesting
        .connect(beneficiary)
        .claim();

    await expect(

        vesting
            .connect(beneficiary)
            .claim()

    ).to.be.revertedWithCustomError(

        vesting,

        "NothingToClaim"

    );

});

it("Should release the remaining 70% after two years", async function () {

    const allocation =
        ethers.parseEther("100000");

    await vesting.addTeamMember(
        beneficiary.address,
        allocation
    );

    const funding =
        ethers.parseEther("500000");

    await lgc.approve(
        vesting.target,
        funding
    );

    await vesting.fundTeamVesting(
        funding
    );

    await registry.activateLaunch();

    await ethers.provider.send(
        "evm_increaseTime",
        [180 * 24 * 60 * 60]
    );

    await ethers.provider.send("evm_mine");

    await vesting
        .connect(beneficiary)
        .claim();

    await ethers.provider.send(
        "evm_increaseTime",
        [550 * 24 * 60 * 60]
    );

    await ethers.provider.send("evm_mine");

    await vesting
        .connect(beneficiary)
        .claim();

    expect(

        await lgc.balanceOf(
            beneficiary.address
        )

    ).to.equal(allocation);

});

it("Should update totalReleased correctly", async function () {

    const allocation =
        ethers.parseEther("100000");

    await vesting.addTeamMember(
        beneficiary.address,
        allocation
    );

    const funding =
        ethers.parseEther("500000");

    await lgc.approve(
        vesting.target,
        funding
    );

    await vesting.fundTeamVesting(
        funding
    );

    await registry.activateLaunch();

    await ethers.provider.send(
        "evm_increaseTime",
        [730 * 24 * 60 * 60]
    );

    await ethers.provider.send("evm_mine");

    await vesting
        .connect(beneficiary)
        .claim();

    expect(
        await vesting.totalReleased()
    ).to.equal(allocation);

});

it("Should allow owner to pause Team Vesting", async function () {

    await vesting.pause();

    expect(
        await vesting.paused()
    ).to.equal(true);

});


it("Should allow owner to unpause Team Vesting", async function () {

    await vesting.pause();

    await vesting.unpause();

    expect(
        await vesting.paused()
    ).to.equal(false);

});

it("Should not allow claiming while paused", async function () {

    const allocation =
        ethers.parseEther("100000");

    await vesting.addTeamMember(
        beneficiary.address,
        allocation
    );

    const funding =
        ethers.parseEther("500000");

    await lgc.approve(
        vesting.target,
        funding
    );

    await vesting.fundTeamVesting(
        funding
    );

    await registry.activateLaunch();

    await ethers.provider.send(
        "evm_increaseTime",
        [730 * 24 * 60 * 60]
    );

    await ethers.provider.send("evm_mine");

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

it("Should return correct team member information", async function () {

    const allocation =
        ethers.parseEther("100000");

    await vesting.addTeamMember(
        beneficiary.address,
        allocation
    );

    const member =
        await vesting.teamMembers(
            beneficiary.address
        );

    expect(member.allocation)
        .to.equal(allocation);

    expect(member.released)
        .to.equal(0);

    expect(member.exists)
        .to.equal(true);

});

it("Should correctly track totalAllocated", async function () {

    await vesting.addTeamMember(
        beneficiary.address,
        ethers.parseEther("100000")
    );

    await vesting.addTeamMember(
        teamWallet.address,
        ethers.parseEther("200000")
    );

    expect(
        await vesting.totalAllocated()
    ).to.equal(
        ethers.parseEther("300000")
    );

});





});