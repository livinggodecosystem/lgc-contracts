const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LGCVesting", function () {

    let owner;
    let beneficiary;
    let other;

    let lgc;
    let vesting;

    beforeEach(async function () {

    [owner, beneficiary, other] =
        await ethers.getSigners();

    const LivingGodCoin =
        await ethers.getContractFactory("LivingGodCoin");

    lgc = await LivingGodCoin.deploy();

    await lgc.waitForDeployment();

    const LGCVesting =
        await ethers.getContractFactory("LGCVesting");

    vesting = await LGCVesting.deploy(
        owner.address,
        await lgc.getAddress()
    );

    await vesting.waitForDeployment();

    await lgc.transfer(
        await vesting.getAddress(),
        ethers.parseEther("1000000")
    );

});

    it("Should deploy correctly", async function () {

    expect(await vesting.owner())
        .to.equal(owner.address);

    expect(await vesting.lgcToken())
        .to.equal(await lgc.getAddress());

    expect(await vesting.totalSchedules())
        .to.equal(0);

    expect(await vesting.totalLocked())
        .to.equal(0);

    expect(await vesting.totalReleased())
        .to.equal(0);

});

it("Should create a vesting schedule", async function () {

    const latestBlock = await ethers.provider.getBlock("latest");

    const startTime = latestBlock.timestamp + 60;
    

    await vesting.createVestingSchedule(
        beneficiary.address,
        ethers.parseEther("1000"),
        startTime,
        30 * 24 * 60 * 60,
        365 * 24 * 60 * 60
    );

    expect(await vesting.totalSchedules())
        .to.equal(1);

    expect(await vesting.totalLocked())
        .to.equal(
            ethers.parseEther("1000")
        );

    const schedule =
        await vesting.getSchedule(0);

    expect(schedule.beneficiary)
        .to.equal(beneficiary.address);

    expect(schedule.totalAmount)
        .to.equal(
            ethers.parseEther("1000")
        );

});

it("Should reject zero beneficiary", async function () {

    const latestBlock =
        await ethers.provider.getBlock("latest");

    const startTime =
        latestBlock.timestamp + 60;

    await expect(

        vesting.createVestingSchedule(
            ethers.ZeroAddress,
            ethers.parseEther("1000"),
            startTime,
            0,
            365 * 24 * 60 * 60
        )

    ).to.be.reverted;

});

it("Should reject zero amount", async function () {

    const latestBlock =
        await ethers.provider.getBlock("latest");

    const startTime =
        latestBlock.timestamp + 60;

    await expect(

        vesting.createVestingSchedule(
            beneficiary.address,
            0,
            startTime,
            0,
            365 * 24 * 60 * 60
        )

    ).to.be.reverted;

});

it("Should reject cliff longer than vesting duration", async function () {

    const latestBlock =
        await ethers.provider.getBlock("latest");

    const startTime =
        latestBlock.timestamp + 60;

    await expect(

        vesting.createVestingSchedule(
            beneficiary.address,
            ethers.parseEther("1000"),
            startTime,
            366 * 24 * 60 * 60,
            365 * 24 * 60 * 60
        )

    ).to.be.reverted;

});

it("Should not release tokens before the cliff", async function () {

    const latestBlock =
        await ethers.provider.getBlock("latest");

    const startTime =
        latestBlock.timestamp + 60;

    const amount =
        ethers.parseEther("1000");

  
    await vesting.createVestingSchedule(
        beneficiary.address,
        amount,
        startTime,
        180 * 24 * 60 * 60,
        365 * 24 * 60 * 60
    );

    
    await expect(

        vesting
            .connect(beneficiary)
            .releaseTokens(0)

    ).to.be.reverted;

});

it("Should return zero vested amount before the cliff", async function () {

    const latestBlock =
        await ethers.provider.getBlock("latest");

    const startTime =
        latestBlock.timestamp + 60;

 

    await vesting.createVestingSchedule(
        beneficiary.address,
        ethers.parseEther("1000"),
        startTime,
        180 * 24 * 60 * 60,
        365 * 24 * 60 * 60
    );

    expect(
        await vesting.calculateVestedAmount(0)
    ).to.equal(0);

});

it("Should vest tokens after the cliff", async function () {

    const latestBlock =
        await ethers.provider.getBlock("latest");

    const startTime =
        latestBlock.timestamp + 60;

    const amount =
        ethers.parseEther("1000");

 

    await vesting.createVestingSchedule(
        beneficiary.address,
        amount,
        startTime,
        180 * 24 * 60 * 60,
        365 * 24 * 60 * 60
    );

    await ethers.provider.send(
        "evm_increaseTime",
        [181 * 24 * 60 * 60]
    );

    await ethers.provider.send(
        "evm_mine",
        []
    );

    const vested =
        await vesting.calculateVestedAmount(0);

    expect(vested)
        .to.be.gt(0);

});

it("Should release vested tokens", async function () {

    const latestBlock =
        await ethers.provider.getBlock("latest");

    const startTime =
        latestBlock.timestamp + 60;

    const amount =
        ethers.parseEther("1000");

  

    await vesting.createVestingSchedule(
        beneficiary.address,
        amount,
        startTime,
        180 * 24 * 60 * 60,
        365 * 24 * 60 * 60
    );

   

    await ethers.provider.send(
        "evm_increaseTime",
        [181 * 24 * 60 * 60]
    );

    await ethers.provider.send(
        "evm_mine",
        []
    );

    const before =
        await lgc.balanceOf(
            beneficiary.address
        );

    await vesting
        .connect(beneficiary)
        .releaseTokens(0);

    const afterBalance =
        await lgc.balanceOf(
            beneficiary.address
        );

    expect(afterBalance)
        .to.be.gt(before);

});

it("Should not allow claiming the same vested tokens twice", async function () {

    const latestBlock =
        await ethers.provider.getBlock("latest");

    const startTime =
        latestBlock.timestamp + 60;

    const amount =
        ethers.parseEther("1000");

 

    await vesting.createVestingSchedule(
        beneficiary.address,
        amount,
        startTime,
        180 * 24 * 60 * 60,
        365 * 24 * 60 * 60
    );

   

    await ethers.provider.send(
        "evm_increaseTime",
        [181 * 24 * 60 * 60]
    );

    await ethers.provider.send(
        "evm_mine",
        []
    );

    await vesting
    .connect(beneficiary)
    .releaseTokens(0);

const releasable =
    await vesting.calculateReleasableAmount(0);

expect(releasable).to.equal(0);
});

it("Should update released accounting correctly", async function () {

    const latestBlock =
        await ethers.provider.getBlock("latest");

    const startTime =
        latestBlock.timestamp + 60;

    const amount =
        ethers.parseEther("1000");

   
    await vesting.createVestingSchedule(
        beneficiary.address,
        amount,
        startTime,
        180 * 24 * 60 * 60,
        365 * 24 * 60 * 60
    );

    
    await ethers.provider.send(
        "evm_increaseTime",
        [181 * 24 * 60 * 60]
    );

    await ethers.provider.send(
        "evm_mine",
        []
    );

    await vesting
        .connect(beneficiary)
        .releaseTokens(0);

    expect(
        await vesting.totalReleased()
    ).to.be.gt(0);

});

it("Should allow the owner to revoke a vesting schedule", async function () {

    const latestBlock =
        await ethers.provider.getBlock("latest");

    const startTime =
        latestBlock.timestamp + 60;

   

    await vesting.createVestingSchedule(
        beneficiary.address,
        ethers.parseEther("1000"),
        startTime,
        180 * 24 * 60 * 60,
        365 * 24 * 60 * 60
    );

    await vesting.revokeSchedule(0);

    const schedule =
        await vesting.getSchedule(0);

    expect(schedule.revoked)
        .to.equal(true);

});

it("Should not allow a non-owner to revoke a vesting schedule", async function () {

    const latestBlock =
        await ethers.provider.getBlock("latest");

    const startTime =
        latestBlock.timestamp + 60;

   

    await vesting.createVestingSchedule(
        beneficiary.address,
        ethers.parseEther("1000"),
        startTime,
        180 * 24 * 60 * 60,
        365 * 24 * 60 * 60
    );

    await expect(

        vesting
            .connect(other)
            .revokeSchedule(0)

    ).to.be.reverted;

});

it("Should recover another ERC20 token", async function () {

    const LivingGodCoin =
        await ethers.getContractFactory("LivingGodCoin");

    const otherToken =
        await LivingGodCoin.deploy();

    await otherToken.waitForDeployment();

    await otherToken.transfer(
        await vesting.getAddress(),
        ethers.parseEther("500")
    );

    await vesting.recoverERC20(
        await otherToken.getAddress(),
        owner.address,
        ethers.parseEther("500")
    );

    expect(
        await otherToken.balanceOf(owner.address)
    ).to.equal(
        ethers.parseEther("15000000")
    );

});

it("Should not recover Living God Coin", async function () {

    await expect(

        vesting.recoverERC20(
            await lgc.getAddress(),
            owner.address,
            ethers.parseEther("100")
        )

    ).to.be.reverted;

});

it("Should return the correct beneficiary schedule count", async function () {

    const latestBlock =
        await ethers.provider.getBlock("latest");

    const startTime =
        latestBlock.timestamp + 60;

    await vesting.createVestingSchedule(
        beneficiary.address,
        ethers.parseEther("100"),
        startTime,
        0,
        365 * 24 * 60 * 60
    );

    await vesting.createVestingSchedule(
        beneficiary.address,
        ethers.parseEther("200"),
        startTime,
        0,
        365 * 24 * 60 * 60
    );

    expect(
        await vesting.getBeneficiaryScheduleCount(
            beneficiary.address
        )
    ).to.equal(2);

});

it("Should return beneficiary schedule IDs", async function () {

    const latestBlock =
        await ethers.provider.getBlock("latest");

    const startTime =
        latestBlock.timestamp + 60;


  
    await vesting.createVestingSchedule(
        beneficiary.address,
        ethers.parseEther("100"),
        startTime,
        0,
        365 * 24 * 60 * 60
    );

    const ids =
        await vesting.getBeneficiaryScheduleIds(
            beneficiary.address
        );

    expect(ids.length).to.equal(1);

    expect(ids[0]).to.equal(0);

});

it("Should return zero vesting progress before vesting begins", async function () {

    const latestBlock =
        await ethers.provider.getBlock("latest");

    const startTime =
        latestBlock.timestamp + 60;

   

    await vesting.createVestingSchedule(
        beneficiary.address,
        ethers.parseEther("100"),
        startTime,
        180 * 24 * 60 * 60,
        365 * 24 * 60 * 60
    );

    expect(
        await vesting.vestingProgress(0)
    ).to.equal(0);

});

it("Should revert when vesting contract has insufficient balance", async function () {

    const LGCVesting =
        await ethers.getContractFactory("LGCVesting");

    const emptyVesting =
        await LGCVesting.deploy(
            owner.address,
            await lgc.getAddress()
        );

    await emptyVesting.waitForDeployment();

    const latestBlock =
        await ethers.provider.getBlock("latest");

    const startTime =
        latestBlock.timestamp + 60;

    await expect(

        emptyVesting.createVestingSchedule(
            beneficiary.address,
            ethers.parseEther("1000"),
            startTime,
            0,
            365 * 24 * 60 * 60
        )

    ).to.be.revertedWithCustomError(
        emptyVesting,
        "InsufficientVestingBalance"
    );

});

});