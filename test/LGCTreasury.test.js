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
    let mockToken;
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

        const MockERC20 = await ethers.getContractFactory("MockERC20");

mockToken = await MockERC20.deploy();

await mockToken.waitForDeployment();

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

it("Should distribute Community tokens correctly", async function () {

    const fundingAmount = ethers.parseEther("1000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const distributionAmount = ethers.parseEther("50000");

    await treasury.distributeCommunity(distributionAmount);

    expect(
        await lgc.balanceOf(addr2.address)
    ).to.equal(distributionAmount);

    expect(
        await treasury.communityDistributed()
    ).to.equal(distributionAmount);

});

it("Should not allow a non-owner to distribute Community tokens", async function () {

    const fundingAmount = ethers.parseEther("1000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const distributionAmount = ethers.parseEther("50000");

    await expect(

        treasury
            .connect(addr1)
            .distributeCommunity(distributionAmount)

    ).to.be.reverted;

});

it("Should not exceed the Community allocation", async function () {

    const fundingAmount = ethers.parseEther("4000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const excessiveAmount = ethers.parseEther("3000001");

    await expect(

        treasury.distributeCommunity(excessiveAmount)

    ).to.be.revertedWith(
        "Community allocation exceeded"
    );

});

it("Should not distribute more Community tokens than the treasury balance", async function () {

    const fundingAmount = ethers.parseEther("100");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const distributionAmount = ethers.parseEther("1000");

    await expect(

        treasury.distributeCommunity(distributionAmount)

    ).to.be.revertedWith(
        "Insufficient treasury balance"
    );

});

it("Should distribute Liquidity tokens correctly", async function () {

    const fundingAmount = ethers.parseEther("1000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const distributionAmount = ethers.parseEther("100000");

    await treasury.distributeLiquidity(distributionAmount);

    expect(
        await lgc.balanceOf(addr3.address)
    ).to.equal(distributionAmount);

    expect(
        await treasury.liquidityDistributed()
    ).to.equal(distributionAmount);

});

it("Should not allow a non-owner to distribute Liquidity tokens", async function () {

    const fundingAmount = ethers.parseEther("1000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const distributionAmount = ethers.parseEther("100000");

    await expect(

        treasury
            .connect(addr1)
            .distributeLiquidity(distributionAmount)

    ).to.be.reverted;

});

it("Should not exceed the Liquidity allocation", async function () {

    const fundingAmount = ethers.parseEther("3000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const excessiveAmount = ethers.parseEther("2250001");

    await expect(

        treasury.distributeLiquidity(excessiveAmount)

    ).to.be.revertedWith(
        "Liquidity allocation exceeded"
    );

});

it("Should not distribute more Liquidity tokens than the treasury balance", async function () {

    const fundingAmount = ethers.parseEther("100");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const distributionAmount = ethers.parseEther("1000");

    await expect(

        treasury.distributeLiquidity(distributionAmount)

    ).to.be.revertedWith(
        "Insufficient treasury balance"
    );

});

it("Should emit TokensDistributed event for Liquidity", async function () {

    const fundingAmount = ethers.parseEther("1000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const distributionAmount = ethers.parseEther("50000");

    await expect(

        treasury.distributeLiquidity(distributionAmount)

    )
        .to.emit(treasury, "TokensDistributed")
        .withArgs(
            "Liquidity",
            addr3.address,
            distributionAmount
        );

});

it("Should distribute Development tokens correctly", async function () {

    const fundingAmount = ethers.parseEther("1000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const distributionAmount = ethers.parseEther("100000");

    await treasury.distributeDevelopment(distributionAmount);

    expect(
        await lgc.balanceOf(addr4.address)
    ).to.equal(distributionAmount);

    expect(
        await treasury.developmentDistributed()
    ).to.equal(distributionAmount);

});

it("Should not allow a non-owner to distribute Development tokens", async function () {

    const fundingAmount = ethers.parseEther("1000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const distributionAmount = ethers.parseEther("100000");

    await expect(

        treasury
            .connect(addr1)
            .distributeDevelopment(distributionAmount)

    ).to.be.reverted;

});

it("Should not exceed the Development allocation", async function () {

    const fundingAmount = ethers.parseEther("3000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const excessiveAmount = ethers.parseEther("2250001");

    await expect(

        treasury.distributeDevelopment(excessiveAmount)

    ).to.be.revertedWith(
        "Development allocation exceeded"
    );

});

it("Should not distribute more Development tokens than the treasury balance", async function () {

    const fundingAmount = ethers.parseEther("100");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const distributionAmount = ethers.parseEther("1000");

    await expect(

        treasury.distributeDevelopment(distributionAmount)

    ).to.be.revertedWith(
        "Insufficient treasury balance"
    );

});

it("Should emit TokensDistributed event for Development", async function () {

    const fundingAmount = ethers.parseEther("1000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const distributionAmount = ethers.parseEther("50000");

    await expect(

        treasury.distributeDevelopment(distributionAmount)

    )
        .to.emit(treasury, "TokensDistributed")
        .withArgs(
            "Development",
            addr4.address,
            distributionAmount
        );

});

it("Should distribute Reserve tokens correctly", async function () {

    const fundingAmount = ethers.parseEther("1000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const distributionAmount = ethers.parseEther("100000");

    await treasury.distributeReserve(distributionAmount);

    expect(
        await lgc.balanceOf(addr5.address)
    ).to.equal(distributionAmount);

    expect(
        await treasury.reserveDistributed()
    ).to.equal(distributionAmount);

});

it("Should not allow a non-owner to distribute Reserve tokens", async function () {

    const fundingAmount = ethers.parseEther("1000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const distributionAmount = ethers.parseEther("100000");

    await expect(

        treasury
            .connect(addr1)
            .distributeReserve(distributionAmount)

    ).to.be.reverted;

});

it("Should not exceed the Reserve allocation", async function () {

    const fundingAmount = ethers.parseEther("2000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const excessiveAmount = ethers.parseEther("1500001");

    await expect(

        treasury.distributeReserve(excessiveAmount)

    ).to.be.revertedWith(
        "Reserve allocation exceeded"
    );

});

it("Should not distribute more Reserve tokens than the treasury balance", async function () {

    const fundingAmount = ethers.parseEther("100");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const distributionAmount = ethers.parseEther("1000");

    await expect(

        treasury.distributeReserve(distributionAmount)

    ).to.be.revertedWith(
        "Insufficient treasury balance"
    );

});

it("Should emit TokensDistributed event for Reserve", async function () {

    const fundingAmount = ethers.parseEther("1000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const distributionAmount = ethers.parseEther("50000");

    await expect(

        treasury.distributeReserve(distributionAmount)

    )
        .to.emit(treasury, "TokensDistributed")
        .withArgs(
            "Reserve",
            addr5.address,
            distributionAmount
        );

});

it("Should distribute Team tokens correctly", async function () {

    const fundingAmount = ethers.parseEther("1000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const distributionAmount = ethers.parseEther("100000");

    await treasury.distributeTeam(distributionAmount);

    expect(
        await lgc.balanceOf(addr6.address)
    ).to.equal(distributionAmount);

    expect(
        await treasury.teamDistributed()
    ).to.equal(distributionAmount);

});

it("Should not allow a non-owner to distribute Team tokens", async function () {

    const fundingAmount = ethers.parseEther("1000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const distributionAmount = ethers.parseEther("100000");

    await expect(

        treasury
            .connect(addr1)
            .distributeTeam(distributionAmount)

    ).to.be.reverted;

});

it("Should not exceed the Team allocation", async function () {

    const fundingAmount = ethers.parseEther("2000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const excessiveAmount = ethers.parseEther("1500001");

    await expect(

        treasury.distributeTeam(excessiveAmount)

    ).to.be.revertedWith(
        "Team allocation exceeded"
    );

});

it("Should not distribute more Team tokens than the treasury balance", async function () {

    const fundingAmount = ethers.parseEther("100");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const distributionAmount = ethers.parseEther("1000");

    await expect(

        treasury.distributeTeam(distributionAmount)

    ).to.be.revertedWith(
        "Insufficient treasury balance"
    );

});

it("Should emit TokensDistributed event for Team", async function () {

    const fundingAmount = ethers.parseEther("1000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const distributionAmount = ethers.parseEther("50000");

    await expect(

        treasury.distributeTeam(distributionAmount)

    )
        .to.emit(treasury, "TokensDistributed")
        .withArgs(
            "Team",
            addr6.address,
            distributionAmount
        );

});

it("Should return the correct remaining Ecosystem allocation", async function () {

    const fundingAmount = ethers.parseEther("1000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const amount = ethers.parseEther("100000");

    await treasury.distributeEcosystem(amount);

    expect(
        await treasury.remainingEcosystemAllocation()
    ).to.equal(
        ethers.parseEther("4400000")
    );

});

it("Should return the correct remaining Community allocation", async function () {

    const fundingAmount = ethers.parseEther("1000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const amount = ethers.parseEther("100000");

    await treasury.distributeCommunity(amount);

    expect(
        await treasury.remainingCommunityAllocation()
    ).to.equal(
        ethers.parseEther("2900000")
    );

});
it("Should return the correct remaining Liquidity allocation", async function () {

    const fundingAmount = ethers.parseEther("1000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const amount = ethers.parseEther("100000");

    await treasury.distributeLiquidity(amount);

    expect(
        await treasury.remainingLiquidityAllocation()
    ).to.equal(
        ethers.parseEther("2150000")
    );

});

it("Should return the correct remaining Development allocation", async function () {

    const fundingAmount = ethers.parseEther("1000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const amount = ethers.parseEther("100000");

    await treasury.distributeDevelopment(amount);

    expect(
        await treasury.remainingDevelopmentAllocation()
    ).to.equal(
        ethers.parseEther("2150000")
    );

});

it("Should return the correct remaining Reserve allocation", async function () {

    const fundingAmount = ethers.parseEther("1000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const amount = ethers.parseEther("100000");

    await treasury.distributeReserve(amount);

    expect(
        await treasury.remainingReserveAllocation()
    ).to.equal(
        ethers.parseEther("1400000")
    );

});

it("Should return the correct remaining Team allocation", async function () {

    const fundingAmount = ethers.parseEther("1000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    const amount = ethers.parseEther("100000");

    await treasury.distributeTeam(amount);

    expect(
        await treasury.remainingTeamAllocation()
    ).to.equal(
        ethers.parseEther("1400000")
    );

});

it("Should correctly track remaining allocation after multiple Ecosystem distributions", async function () {

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

    expect(
        await treasury.remainingEcosystemAllocation()
    ).to.equal(
        ethers.parseEther("4200000")
    );

});

it("Distributed + Remaining should always equal Ecosystem allocation", async function () {

    const fundingAmount = ethers.parseEther("1000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    await treasury.distributeEcosystem(
        ethers.parseEther("350000")
    );

    const distributed =
        await treasury.ecosystemDistributed();

    const remaining =
        await treasury.remainingEcosystemAllocation();

    expect(
        distributed + remaining
    ).to.equal(
        ethers.parseEther("4500000")
    );

});

it("Different allocations should remain independent", async function () {

    const fundingAmount = ethers.parseEther("3000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    await treasury.distributeEcosystem(
        ethers.parseEther("100000")
    );

    await treasury.distributeCommunity(
        ethers.parseEther("200000")
    );

    expect(
        await treasury.ecosystemDistributed()
    ).to.equal(
        ethers.parseEther("100000")
    );

    expect(
        await treasury.communityDistributed()
    ).to.equal(
        ethers.parseEther("200000")
    );

    expect(
        await treasury.remainingEcosystemAllocation()
    ).to.equal(
        ethers.parseEther("4400000")
    );

    expect(
        await treasury.remainingCommunityAllocation()
    ).to.equal(
        ethers.parseEther("2800000")
    );

});

it("Should allow distributing the entire Ecosystem allocation", async function () {

    const fundingAmount = ethers.parseEther("4500000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    await treasury.distributeEcosystem(
        ethers.parseEther("4500000")
    );

    expect(
        await treasury.ecosystemDistributed()
    ).to.equal(
        ethers.parseEther("4500000")
    );

    expect(
        await treasury.remainingEcosystemAllocation()
    ).to.equal(0);

});

it("Should reject distributions after Ecosystem allocation is exhausted", async function () {

    const fundingAmount = ethers.parseEther("4500001");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    await treasury.distributeEcosystem(
        ethers.parseEther("4500000")
    );

    await expect(

        treasury.distributeEcosystem(
            ethers.parseEther("1")
        )

    ).to.be.revertedWith(
        "Ecosystem allocation exceeded"
    );

});

it("Treasury balance should remain correct after multiple distributions", async function () {

    const fundingAmount = ethers.parseEther("1000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    await treasury.distributeEcosystem(
        ethers.parseEther("100000")
    );

    await treasury.distributeCommunity(
        ethers.parseEther("200000")
    );

    await treasury.distributeLiquidity(
        ethers.parseEther("150000")
    );

    expect(
        await lgc.balanceOf(await treasury.getAddress())
    ).to.equal(
        ethers.parseEther("550000")
    );

});

it("Treasury balance should be zero after deployment", async function () {

    expect(
        await treasury.treasuryBalance()
    ).to.equal(0);

});

it("Treasury balance should increase after funding", async function () {

    const amount = ethers.parseEther("500000");

    await lgc.transfer(
        await treasury.getAddress(),
        amount
    );

    expect(
        await treasury.treasuryBalance()
    ).to.equal(amount);

});

it("Treasury balance should decrease after token distributions", async function () {

    const fundingAmount = ethers.parseEther("1000000");

    await lgc.transfer(
        await treasury.getAddress(),
        fundingAmount
    );

    await treasury.distributeEcosystem(
        ethers.parseEther("100000")
    );

    await treasury.distributeCommunity(
        ethers.parseEther("50000")
    );

    expect(
        await treasury.treasuryBalance()
    ).to.equal(
        ethers.parseEther("850000")
    );

});

it("Should recover accidentally sent ERC20 tokens", async function () {

    const amount = ethers.parseEther("1000");

    await mockToken.transfer(
        await treasury.getAddress(),
        amount
    );

    await treasury.recoverERC20(
        await mockToken.getAddress(),
        owner.address,
        amount
    );

    expect(
        await mockToken.balanceOf(owner.address)
    ).to.equal(
        ethers.parseEther("1000000")
    );

});

it("Should not allow a non-owner to recover ERC20 tokens", async function () {

    await expect(

        treasury
            .connect(addr1)
            .recoverERC20(
                await mockToken.getAddress(),
                addr1.address,
                ethers.parseEther("100")
            )

    ).to.be.reverted;

});

it("Should not allow recovery of LGC", async function () {

    await expect(

        treasury.recoverERC20(
            await lgc.getAddress(),
            owner.address,
            ethers.parseEther("100")
        )

    ).to.be.revertedWith(
        "Cannot recover LGC"
    );

});

it("Should emit RecoveredToken event", async function () {

    const amount = ethers.parseEther("500");

    await mockToken.transfer(
        await treasury.getAddress(),
        amount
    );

    await expect(

        treasury.recoverERC20(
            await mockToken.getAddress(),
            owner.address,
            amount
        )

    )
        .to.emit(treasury, "RecoveredToken")
        .withArgs(
            await mockToken.getAddress(),
            owner.address,
            amount
        );

});

it("Should recover another ERC20 token", async function () {

    const MockERC20 = await ethers.getContractFactory("MockERC20");

    const mock = await MockERC20.deploy();

    await mock.waitForDeployment();

    const amount = ethers.parseEther("500");

    await mock.transfer(
        await treasury.getAddress(),
        amount
    );

    await treasury.recoverERC20(
        await mock.getAddress(),
        owner.address,
        amount
    );

    expect(
        await mock.balanceOf(owner.address)
    ).to.equal(
        ethers.parseEther("1000000")
    );

});

it("Should reject recovering LGC", async function () {

    await expect(

        treasury.recoverERC20(
            await lgc.getAddress(),
            owner.address,
            100
        )

    ).to.be.revertedWith(
        "Cannot recover LGC"
    );

});

it("Should emit RecoveredToken event", async function () {

    const MockERC20 = await ethers.getContractFactory("MockERC20");

    const mock = await MockERC20.deploy();

    await mock.waitForDeployment();

    const amount = ethers.parseEther("250");

    await mock.transfer(
        await treasury.getAddress(),
        amount
    );

    await expect(

        treasury.recoverERC20(
            await mock.getAddress(),
            owner.address,
            amount
        )

    )
        .to.emit(treasury, "RecoveredToken")
        .withArgs(
            await mock.getAddress(),
            owner.address,
            amount
        );

});

it("Should return the correct total allocation", async function () {

    const total =
        ethers.parseEther("4500000") +
        ethers.parseEther("3000000") +
        ethers.parseEther("2250000") +
        ethers.parseEther("2250000") +
        ethers.parseEther("1500000") +
        ethers.parseEther("1500000");

    expect(
        await treasury.totalAllocation()
    ).to.equal(total);

});

it("Should return 0% distribution initially", async function () {
    expect(
        await treasury.distributionPercentage()
    ).to.equal(0);
});

it("Should correctly calculate distribution percentage", async function () {

    await lgc.transfer(
    treasury.target,
    ethers.parseEther("4500000")
);

    await treasury.distributeEcosystem(
        ethers.parseEther("450000")
    );

    const expected =
        (450000n * 100n) / 15000000n;

    expect(
        await treasury.distributionPercentage()
    ).to.equal(expected);
});

it("Should return true when treasury has balance", async function () {

    await lgc.transfer(
    treasury.target,
    ethers.parseEther("100")
);

    expect(
        await treasury.hasTreasuryBalance()
    ).to.equal(true);
});

it("Should return false when treasury has no balance", async function () {

    expect(
        await treasury.hasTreasuryBalance()
    ).to.equal(false);
});
});