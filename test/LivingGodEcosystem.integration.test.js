
    const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Living God Ecosystem Integration", function () {

    let owner;
    let ecosystem;
    let community;
    let liquidity;
    let development;
    let reserve;
    let team;
    let investor;

    let lgc;
    let treasury;
    let vesting;
    let staking;

    beforeEach(async function () {

        [
            owner,
            ecosystem,
            community,
            liquidity,
            development,
            reserve,
            team,
            investor
        ] = await ethers.getSigners();

        //-----------------------------------
        // Deploy Living God Coin
        //-----------------------------------

        const LivingGodCoin =
            await ethers.getContractFactory("LivingGodCoin");

        lgc = await LivingGodCoin.deploy();

        await lgc.waitForDeployment();

        //-----------------------------------
        // Deploy Treasury
        //-----------------------------------

        const LGCTreasury =
            await ethers.getContractFactory("LGCTreasury");

        treasury =
            await LGCTreasury.deploy(

                owner.address,

                await lgc.getAddress(),

                ecosystem.address,

                community.address,

                liquidity.address,

                development.address,

                reserve.address,

                team.address
            );

        await treasury.waitForDeployment();

        //-----------------------------------
        // Deploy Vesting
        //-----------------------------------

        const LGCVesting =
            await ethers.getContractFactory("LGCVesting");

        vesting =
            await LGCVesting.deploy(

                owner.address,

                await lgc.getAddress()

            );

        await vesting.waitForDeployment();

        //-----------------------------------
        // Deploy Staking
        //-----------------------------------

        const LGCStaking =
            await ethers.getContractFactory("LGCStaking");

        staking =
            await LGCStaking.deploy(

                owner.address,

                await lgc.getAddress()

            );

        await staking.waitForDeployment();

    });

it("Should deploy the complete Living God Ecosystem", async function () {

    expect(
        await lgc.totalSupply()
    ).to.equal(
        ethers.parseEther("15000000")
    );

    expect(
        await treasury.owner()
    ).to.equal(owner.address);

    expect(
        await vesting.owner()
    ).to.equal(owner.address);

    expect(
        await staking.owner()
    ).to.equal(owner.address);

});

it("Should connect every treasury wallet correctly", async function () {

    expect(
        await treasury.ecosystemWallet()
    ).to.equal(ecosystem.address);

    expect(
        await treasury.communityWallet()
    ).to.equal(community.address);

    expect(
        await treasury.liquidityWallet()
    ).to.equal(liquidity.address);

    expect(
        await treasury.developmentWallet()
    ).to.equal(development.address);

    expect(
        await treasury.reserveWallet()
    ).to.equal(reserve.address);

    expect(
        await treasury.teamWallet()
    ).to.equal(team.address);

});


it("Should fund the treasury", async function () {

    const amount =
        ethers.parseEther("1000000");

    await lgc.approve(
        treasury.target,
        amount
    );

    await treasury.fundTreasury(amount);

    expect(
        await lgc.balanceOf(
            treasury.target
        )
    ).to.equal(amount);

});


it("Should fund staking rewards", async function () {

    const amount =
        ethers.parseEther("500000");

    await lgc.transfer(
        staking.target,
        amount
    );

    expect(
        await lgc.balanceOf(
            staking.target
        )
    ).to.equal(amount);

});

it("Should fund vesting", async function () {

    const amount =
        ethers.parseEther("1000000");

    await lgc.transfer(
        vesting.target,
        amount
    );

    expect(
        await lgc.balanceOf(
            vesting.target
        )
    ).to.equal(amount);

});

it("Treasury should use the deployed LGC token", async function () {

    expect(
        await treasury.lgcToken()
    ).to.equal(
        await lgc.getAddress()
    );

});

it("Vesting should use the deployed LGC token", async function () {

    expect(
        await vesting.lgcToken()
    ).to.equal(
        await lgc.getAddress()
    );

});

it("Staking should use the deployed LGC token", async function () {

    expect(
        await staking.lgcToken()
    ).to.equal(
        await lgc.getAddress()
    );

});

it("Treasury should start with zero balance", async function () {

    expect(
        await treasury.treasuryBalance()
    ).to.equal(0);

});

it("Vesting should start with zero schedules", async function () {

    expect(
        await vesting.totalSchedules()
    ).to.equal(0);

});

it("Staking should start with zero reward pool and zero staked", async function () {

    expect(
        await staking.rewardPool()
    ).to.equal(0);

    expect(
        await staking.totalStaked()
    ).to.equal(0);

});

it("Should fund Vesting from Treasury", async function () {

    const treasuryAmount =
        ethers.parseEther("1000000");

    const vestingAmount =
        ethers.parseEther("250000");

    // Fund Treasury

    await lgc.approve(
        treasury.target,
        treasuryAmount
    );

    await treasury.fundTreasury(
        treasuryAmount
    );

});

   it("Should distribute Development allocation to the Development wallet", async function () {

    const amount =
        ethers.parseEther("250000");

    await lgc.approve(
        treasury.target,
        amount
    );

    await treasury.fundTreasury(amount);

    await treasury.distributeDevelopment(
        amount
    );

    expect(
        await lgc.balanceOf(
            development.address
        )
    ).to.equal(amount);

});

});
