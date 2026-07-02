const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LivingGodCoin", function () {
  let token;
  let owner;
  let addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    const LivingGodCoin = await ethers.getContractFactory("LivingGodCoin");

    token = await LivingGodCoin.deploy();

    await token.waitForDeployment();
  });

  it("Should have the correct name", async function () {
    expect(await token.name()).to.equal("Living God Coin");
  });

  it("Should have the correct symbol", async function () {
    expect(await token.symbol()).to.equal("LGC");
  });

  it("Should mint the full supply to the owner", async function () {
    const totalSupply = await token.totalSupply();
    const ownerBalance = await token.balanceOf(owner.address);

    expect(ownerBalance).to.equal(totalSupply);
  });

  it("Should allow transfers", async function () {
    await token.transfer(addr1.address, ethers.parseEther("100"));

    expect(await token.balanceOf(addr1.address))
      .to.equal(ethers.parseEther("100"));
  });

  it("Should burn tokens", async function () {
    const initialSupply = await token.totalSupply();

    await token.burn(ethers.parseEther("50"));

    expect(await token.totalSupply())
      .to.equal(initialSupply - ethers.parseEther("50"));
  });
});