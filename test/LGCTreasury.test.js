const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LGCTreasury", function () {

    let owner;
    let addr1;
    let addr2;
    let addr3;
    let addr4;
    let addr5;
    let addr6;

    let lgc;
    let treasury;

    beforeEach(async function () {

        [
            owner,
            addr1,
            addr2,
            addr3,
            addr4,
            addr5,
            addr6
        ] = await ethers.getSigners();

        const LivingGodCoin = await ethers.getContractFactory("LivingGodCoin");

        lgc = await LivingGodCoin.deploy();

        await lgc.waitForDeployment();

        const LGCTreasury = await ethers.getContractFactory("LGCTreasury");

        treasury = await LGCTreasury.deploy(
            owner.address,
            await lgc.getAddress(),
            addr1.address,
            addr2.address,
            addr3.address,
            addr4.address,
            addr5.address,
            addr6.address
        );

        await treasury.waitForDeployment();
    });

    it("Should deploy the treasury correctly", async function () {

        expect(await treasury.lgcToken()).to.equal(
            await lgc.getAddress()
        );

    });

    it("Should store all treasury wallet addresses correctly", async function () {

        expect(await treasury.ecosystemWallet()).to.equal(addr1.address);
        expect(await treasury.communityWallet()).to.equal(addr2.address);
        expect(await treasury.liquidityWallet()).to.equal(addr3.address);
        expect(await treasury.developmentWallet()).to.equal(addr4.address);
        expect(await treasury.reserveWallet()).to.equal(addr5.address);
        expect(await treasury.teamWallet()).to.equal(addr6.address);

    });

    it("Should set the correct owner", async function () {

        expect(await treasury.owner()).to.equal(owner.address);

    });

it("Should allow the owner to fund the treasury", async function () {

    const amount = ethers.parseEther("1000000");

    await lgc.transfer(
        await treasury.getAddress(),
        amount
    );

    expect(
        await lgc.balanceOf(await treasury.getAddress())
    ).to.equal(amount);

});

it("Should distribute Ecosystem tokens correctly", async function () {

    const fundingAmount = ethers.parseEther("1000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const distributionAmount = ethers.parseEther("100000");

    await treasury.distributeEcosystem(distributionAmount);

    expect(
        await lgc.balanceOf(addr1.address)
    ).to.equal(distributionAmount);

    expect(
        await treasury.ecosystemDistributed()
    ).to.equal(distributionAmount);

    expect(
        await lgc.balanceOf(await treasury.getAddress())
    ).to.equal(
        fundingAmount - distributionAmount
    );

});

it("Should not allow a non-owner to distribute Ecosystem tokens", async function () {

    const fundingAmount = ethers.parseEther("1000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const distributionAmount = ethers.parseEther("100000");

    await expect(

        treasury
            .connect(addr1)
            .distributeEcosystem(distributionAmount)

    ).to.be.reverted;

});

it("Should not exceed the Ecosystem allocation", async function () {

    const fundingAmount = ethers.parseEther("5000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const excessiveAmount = ethers.parseEther("4500001");

    await expect(

        treasury.distributeEcosystem(excessiveAmount)

    ).to.be.revertedWith(
        "Ecosystem allocation exceeded"
    );

});

it("Should not distribute more than the treasury balance", async function () {

    const fundingAmount = ethers.parseEther("100");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const distributionAmount = ethers.parseEther("1000");

    await expect(

        treasury.distributeEcosystem(distributionAmount)

    ).to.be.revertedWith(
        "Insufficient treasury balance"
    );

});

it("Should emit TokensDistributed event", async function () {

    const fundingAmount = ethers.parseEther("1000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const distributionAmount = ethers.parseEther("50000");

    await expect(

        treasury.distributeEcosystem(distributionAmount)

    )
        .to.emit(treasury, "TokensDistributed")
        .withArgs(
            "Ecosystem",
            addr1.address,
            distributionAmount
        );

});

it("Should update the Ecosystem wallet", async function () {

    await treasury.updateEcosystemWallet(addr2.address);

    expect(
        await treasury.ecosystemWallet()
    ).to.equal(addr2.address);

});

it("Should not allow a non-owner to update the Ecosystem wallet", async function () {

    await expect(

        treasury
            .connect(addr1)
            .updateEcosystemWallet(addr3.address)

    ).to.be.reverted;

});

it("Should not allow the Ecosystem wallet to be the zero address", async function () {

    await expect(

        treasury.updateEcosystemWallet(
            ethers.ZeroAddress
        )

    ).to.be.revertedWith(
        "Invalid wallet"
    );

});

it("Should emit WalletUpdated event", async function () {

    await expect(

        treasury.updateEcosystemWallet(addr2.address)

    )
        .to.emit(treasury, "WalletUpdated")
        .withArgs(
            "Ecosystem",
            addr1.address,
            addr2.address
        );

});

it("Should track multiple Ecosystem distributions correctly", async function () {

    const fundingAmount = ethers.parseEther("1000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    await treasury.distributeEcosystem(
        ethers.parseEther("100000")
    );

    await treasury.distributeEcosystem(
        ethers.parseEther("200000")
    );

    expect(
        await treasury.ecosystemDistributed()
    ).to.equal(
        ethers.parseEther("300000")
    );

});

});