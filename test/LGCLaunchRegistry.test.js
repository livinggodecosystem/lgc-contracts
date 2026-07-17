const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LGCLaunchRegistry", function () {

    let owner;
    let other;

    let registry;

    beforeEach(async function () {

        [owner, other] =
            await ethers.getSigners();

        const LGCLaunchRegistry =
            await ethers.getContractFactory(
                "LGCLaunchRegistry"
            );

        registry =
            await LGCLaunchRegistry.deploy(
                owner.address
            );

        await registry.waitForDeployment();

    });

    it("Should deploy correctly", async function () {

    expect(
        await registry.owner()
    ).to.equal(owner.address);

});

it("Should return VERSION 1.0.0", async function () {

    expect(
        await registry.VERSION()
    ).to.equal("1.0.0");

});

it("Should store deployment timestamp", async function () {

    expect(
        await registry.deployedAt()
    ).to.be.gt(0);

});

it("Should start with launch inactive", async function () {

    expect(
        await registry.launchActivated()
    ).to.equal(false);

});

it("Should start with zero official launch time", async function () {

    expect(
        await registry.officialLaunchTime()
    ).to.equal(0);

});

it("Should report launch as inactive", async function () {

    expect(
        await registry.isLaunchActive()
    ).to.equal(false);

});

});