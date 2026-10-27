const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("LGCStaking", function () {

    let owner;
    let alice;
    let bob;

    let lgc;
    let staking;

    beforeEach(async function () {

        [owner, alice, bob] =
            await ethers.getSigners();

        const LivingGodCoin =
            await ethers.getContractFactory(
                "LivingGodCoin"
            );

        lgc =
            await LivingGodCoin.deploy();

        await lgc.waitForDeployment();

        const LGCStaking =
            await ethers.getContractFactory(
                "LGCStaking"
            );

        staking =
            await LGCStaking.deploy(
                owner.address,
                await lgc.getAddress()
            );

        await staking.waitForDeployment();

    });

    it("Should deploy correctly", async function () {

    expect(
        await staking.getAddress()
    ).to.properAddress;

});

it("Should store the token address", async function () {

    expect(
        await staking.lgcToken()
    ).to.equal(
        await lgc.getAddress()
    );

});

it("Should set the correct owner", async function () {

    expect(
        await staking.owner()
    ).to.equal(owner.address);

});

it("Should start with zero reward pool", async function () {

    expect(
        await staking.rewardPool()
    ).to.equal(0);

});

it("Should start with zero total staked", async function () {

    expect(
        await staking.totalStaked()
    ).to.equal(0);

});

it("Should allow the owner to fund the reward pool", async function () {

    const amount =
        ethers.parseEther("10000");

    await lgc.approve(
        await staking.getAddress(),
        amount
    );

    await staking.fundRewardPool(amount);

    expect(
        await staking.rewardPool()
    ).to.equal(amount);

});

it("Should reject zero reward pool funding", async function () {

    await expect(

        staking.fundRewardPool(0)

    ).to.be.reverted;

});

it("Should not allow a non-owner to fund the reward pool", async function () {

    const amount =
        ethers.parseEther("100");

    await lgc.transfer(
        alice.address,
        amount
    );

    await lgc
        .connect(alice)
        .approve(
            await staking.getAddress(),
            amount
        );

    await expect(

        staking
            .connect(alice)
            .fundRewardPool(amount)

    ).to.be.reverted;

});

it("Should allow the owner to update the annual reward rate", async function () {

    await staking.setAnnualRewardRate(1500);

    expect(
        await staking.annualRewardRate()
    ).to.equal(1500);

});

it("Should not allow a non-owner to update the annual reward rate", async function () {

    await expect(

        staking
            .connect(alice)
            .setAnnualRewardRate(1500)

    ).to.be.reverted;

});

it("Should allow a user to stake tokens", async function () {

    const amount = ethers.parseEther("1000");

    await lgc.transfer(alice.address, amount);

    await lgc
        .connect(alice)
        .approve(await staking.getAddress(), amount);

    await staking
        .connect(alice)
        .stake(amount);

    expect(
        await staking.totalStaked()
    ).to.equal(amount);

});

it("Should reject staking zero tokens", async function () {

    await expect(

        staking
            .connect(alice)
            .stake(0)

    ).to.be.reverted;

});

it("Should create a staking position", async function () {

    const amount = ethers.parseEther("500");

    await lgc.transfer(alice.address, amount);

    await lgc
        .connect(alice)
        .approve(await staking.getAddress(), amount);

    await staking
        .connect(alice)
        .stake(amount);

    const info =
        await staking.getStake(0);

    expect(info.amount)
        .to.equal(amount);

    expect(info.staker)
        .to.equal(alice.address);

});

it("Should track user stake count", async function () {

    const amount = ethers.parseEther("100");

    await lgc.transfer(alice.address, amount * 2n);

    await lgc
        .connect(alice)
        .approve(
            await staking.getAddress(),
            amount * 2n
        );

    await staking.connect(alice).stake(amount);

    await staking.connect(alice).stake(amount);

    expect(
        await staking.getUserStakeCount(
            alice.address
        )
    ).to.equal(2);

});


it("Should return user stake IDs", async function () {

    const amount = ethers.parseEther("100");

    await lgc.transfer(alice.address, amount);

    await lgc
        .connect(alice)
        .approve(
            await staking.getAddress(),
            amount
        );

    await staking
        .connect(alice)
        .stake(amount);

    const ids =
        await staking.getUserStakeIds(
            alice.address
        );

    expect(ids.length).to.equal(1);

    expect(ids[0]).to.equal(0);

});

it("Should calculate staking rewards after time passes", async function () {

    const amount = ethers.parseEther("1000");

    await lgc.transfer(alice.address, amount);

    await lgc
        .connect(alice)
        .approve(await staking.getAddress(), amount);

    await staking
        .connect(alice)
        .stake(amount);

    await ethers.provider.send(
        "evm_increaseTime",
        [365 * 24 * 60 * 60]
    );

    await ethers.provider.send(
        "evm_mine",
        []
    );

    const reward =
        await staking.calculateRewards(0);

    expect(reward).to.be.gt(0);

});

it("Should allow claiming staking rewards", async function () {

    const stakeAmount = ethers.parseEther("1000");

    const rewardPool = ethers.parseEther("1000");

    await lgc.approve(
        await staking.getAddress(),
        rewardPool
    );

    await staking.fundRewardPool(rewardPool);

    await lgc.transfer(
        alice.address,
        stakeAmount
    );

    await lgc
        .connect(alice)
        .approve(
            await staking.getAddress(),
            stakeAmount
        );

    await staking
        .connect(alice)
        .stake(stakeAmount);

    await ethers.provider.send(
        "evm_increaseTime",
        [365 * 24 * 60 * 60]
    );

    await ethers.provider.send(
        "evm_mine",
        []
    );

    await staking
        .connect(alice)
        .claimRewards(0);

    expect(
        await lgc.balanceOf(alice.address)
    ).to.be.gt(0);

});

it("Should decrease the reward pool after claiming", async function () {

    const stakeAmount = ethers.parseEther("1000");

    const rewardPool = ethers.parseEther("1000");

    await lgc.approve(
        await staking.getAddress(),
        rewardPool
    );

    await staking.fundRewardPool(rewardPool);

    await lgc.transfer(
        alice.address,
        stakeAmount
    );

    await lgc
        .connect(alice)
        .approve(
            await staking.getAddress(),
            stakeAmount
        );

    await staking
        .connect(alice)
        .stake(stakeAmount);

    await ethers.provider.send(
        "evm_increaseTime",
        [365 * 24 * 60 * 60]
    );

    await ethers.provider.send(
        "evm_mine",
        []
    );

    const before =
        await staking.rewardPool();

    await staking
        .connect(alice)
        .claimRewards(0);

    const after =
        await staking.rewardPool();

    expect(after).to.be.lt(before);

});

it("Should not allow claiming significant rewards twice immediately", async function () {

    const stakeAmount = ethers.parseEther("1000");
    const rewardPool = ethers.parseEther("1000");

    await lgc.approve(await staking.getAddress(), rewardPool);
    await staking.fundRewardPool(rewardPool);

    await lgc.transfer(alice.address, stakeAmount);

    await lgc.connect(alice)
        .approve(await staking.getAddress(), stakeAmount);

    await staking.connect(alice).stake(stakeAmount);

    await ethers.provider.send(
        "evm_increaseTime",
        [365 * 24 * 60 * 60]
    );

    await ethers.provider.send("evm_mine", []);

    await staking.connect(alice).claimRewards(0);

    const reward =
        await staking.calculateRewards(0);

    expect(reward).to.be.lt(
        ethers.parseEther("0.001")
    );

});

it("Should allow a user to unstake tokens", async function () {

    const stakeAmount = ethers.parseEther("1000");
    const rewardPool = ethers.parseEther("1000");

    await lgc.approve(await staking.getAddress(), rewardPool);
    await staking.fundRewardPool(rewardPool);

    await lgc.transfer(alice.address, stakeAmount);

    await lgc
        .connect(alice)
        .approve(await staking.getAddress(), stakeAmount);

    await staking.connect(alice).stake(stakeAmount);

    await ethers.provider.send(
        "evm_increaseTime",
        [365 * 24 * 60 * 60]
    );

    await ethers.provider.send("evm_mine", []);

    await staking.connect(alice).unstake(0);

    expect(await staking.totalStaked()).to.equal(0);

});

it("Should mark the stake as inactive after unstaking", async function () {

    const amount = ethers.parseEther("500");

    await lgc.transfer(alice.address, amount);

    await lgc
        .connect(alice)
        .approve(await staking.getAddress(), amount);

    await staking.connect(alice).stake(amount);

    await lgc.approve(
        await staking.getAddress(),
        ethers.parseEther("100")
    );

    await staking.fundRewardPool(
        ethers.parseEther("100")
    );

    await staking.connect(alice).unstake(0);

    const info = await staking.stakes(0);

    expect(info.active).to.equal(false);

});

it("Should not allow another user to unstake someone else's stake", async function () {

    const amount = ethers.parseEther("500");

    await lgc.transfer(alice.address, amount);

    await lgc
        .connect(alice)
        .approve(await staking.getAddress(), amount);

    await staking.connect(alice).stake(amount);

    await expect(

        staking
            .connect(bob)
            .unstake(0)

    ).to.be.reverted;

});

it("Should update total staked correctly after unstaking", async function () {

    const amount = ethers.parseEther("1000");

    await lgc.transfer(alice.address, amount);

    await lgc
        .connect(alice)
        .approve(await staking.getAddress(), amount);

    await staking.connect(alice).stake(amount);

    await lgc.approve(
        await staking.getAddress(),
        ethers.parseEther("100")
    );

    await staking.fundRewardPool(
        ethers.parseEther("100")
    );

    await staking.connect(alice).unstake(0);

    expect(
        await staking.totalStaked()
    ).to.equal(0);

});

it("Should allow the owner to pause staking", async function () {

    await staking.pause();

    expect(
        await staking.paused()
    ).to.equal(true);

});

it("Should allow the owner to unpause staking", async function () {

    await staking.pause();

    await staking.unpause();

    expect(
        await staking.paused()
    ).to.equal(false);

});

it("Should not allow a non-owner to pause staking", async function () {

    await expect(

        staking
            .connect(alice)
            .pause()

    ).to.be.reverted;

});

it("Should not allow staking while paused", async function () {

    const amount = ethers.parseEther("100");

    await lgc.transfer(alice.address, amount);

    await lgc
        .connect(alice)
        .approve(await staking.getAddress(), amount);

    await staking.pause();

    await expect(

        staking
            .connect(alice)
            .stake(amount)

    ).to.be.reverted;

});


it("Should not allow claiming rewards while paused", async function () {

    const stakeAmount = ethers.parseEther("1000");
    const rewardPool = ethers.parseEther("1000");

    await lgc.approve(await staking.getAddress(), rewardPool);
    await staking.fundRewardPool(rewardPool);

    await lgc.transfer(alice.address, stakeAmount);

    await lgc.connect(alice)
        .approve(await staking.getAddress(), stakeAmount);

    await staking.connect(alice).stake(stakeAmount);

    await ethers.provider.send(
        "evm_increaseTime",
        [365 * 24 * 60 * 60]
    );

    await ethers.provider.send("evm_mine", []);

    await staking.pause();

    await expect(

        staking
            .connect(alice)
            .claimRewards(0)

    ).to.be.reverted;

});


it("Should not allow unstaking while paused", async function () {

    const amount = ethers.parseEther("500");

    await lgc.approve(
        await staking.getAddress(),
        ethers.parseEther("100")
    );

    await staking.fundRewardPool(
        ethers.parseEther("100")
    );

    await lgc.transfer(alice.address, amount);

    await lgc.connect(alice)
        .approve(await staking.getAddress(), amount);

    await staking.connect(alice).stake(amount);

    await staking.pause();

    await expect(

        staking
            .connect(alice)
            .unstake(0)

    ).to.be.reverted;

});

it("Should still allow staking after adding ReentrancyGuard", async function () {

    const amount = ethers.parseEther("100");

    await lgc.transfer(alice.address, amount);

    await lgc
        .connect(alice)
        .approve(await staking.getAddress(), amount);

    await staking
        .connect(alice)
        .stake(amount);

    expect(
        await staking.totalStaked()
    ).to.equal(amount);

});

it("Should still allow claiming rewards after adding ReentrancyGuard", async function () {

    const stakeAmount = ethers.parseEther("1000");
    const rewardPool = ethers.parseEther("1000");

    await lgc.approve(await staking.getAddress(), rewardPool);
    await staking.fundRewardPool(rewardPool);

    await lgc.transfer(alice.address, stakeAmount);

    await lgc
        .connect(alice)
        .approve(await staking.getAddress(), stakeAmount);

    await staking
        .connect(alice)
        .stake(stakeAmount);

    await ethers.provider.send(
        "evm_increaseTime",
        [365 * 24 * 60 * 60]
    );

    await ethers.provider.send("evm_mine", []);

    await expect(
        staking.connect(alice).claimRewards(0)
    ).to.not.be.reverted;

});

it("Should still allow unstaking after adding ReentrancyGuard", async function () {

    const amount = ethers.parseEther("1000");

    await lgc.approve(
        await staking.getAddress(),
        ethers.parseEther("100")
    );

    await staking.fundRewardPool(
        ethers.parseEther("100")
    );

    await lgc.transfer(alice.address, amount);

    await lgc
        .connect(alice)
        .approve(await staking.getAddress(), amount);

    await staking
        .connect(alice)
        .stake(amount);

    await expect(
        staking.connect(alice).unstake(0)
    ).to.not.be.reverted;

});

it("Should create the five default staking pools", async function () {
    expect(await staking.getPoolCount()).to.equal(5);

    const flexible = await staking.getPoolInfo(0);
    expect(flexible.rewardRate).to.equal(1000);

    const silver = await staking.getPoolInfo(1);
    expect(silver.rewardRate).to.equal(1200);

    const gold = await staking.getPoolInfo(2);
    expect(gold.rewardRate).to.equal(1500);

    const platinum = await staking.getPoolInfo(3);
    expect(platinum.rewardRate).to.equal(1800);

    const diamond = await staking.getPoolInfo(4);
    expect(diamond.rewardRate).to.equal(2000);
});

it("Should allow staking into the Silver pool", async function () {

    const amount =
        ethers.parseEther("1000");

    await lgc.transfer(
        alice.address,
        amount
    );

    await lgc
        .connect(alice)
        .approve(
            await staking.getAddress(),
            amount
        );

    await staking
        .connect(alice)
        .stakeInPool(
            1,
            amount
        );

    const stake =
        await staking.getStake(0);

    expect(stake.poolId).to.equal(1);

    expect(stake.amount).to.equal(amount);

    expect(stake.staker).to.equal(
        alice.address
    );
});

it("Should not allow unstaking from the Silver pool before the lock expires", async function () {

    const amount =
        ethers.parseEther("1000");

    await lgc.transfer(
        alice.address,
        amount
    );

    await lgc
        .connect(alice)
        .approve(
            await staking.getAddress(),
            amount
        );

    await staking
        .connect(alice)
        .stakeInPool(
            1,
            amount
        );

    await expect(
        staking
            .connect(alice)
            .unstake(0)
    ).to.be.revertedWithCustomError(
        staking,
        "StakeStillLocked"
    );
});

it("Should allow immediate unstaking from the Flexible pool", async function () {

    const amount =
        ethers.parseEther("1000");

    // Fund reward pool
    await lgc.approve(
        await staking.getAddress(),
        amount
    );

    await staking.fundRewardPool(amount);

    await lgc.transfer(
        alice.address,
        amount
    );

    await lgc
        .connect(alice)
        .approve(
            await staking.getAddress(),
            amount
        );

    // Default Flexible Pool
    await staking
        .connect(alice)
        .stake(amount);

    await staking
        .connect(alice)
        .unstake(0);

    const stake =
        await staking.getStake(0);

    expect(stake.active).to.equal(false);
});

it("Should give higher rewards in the Gold pool than the Flexible pool", async function () {

    const amount = ethers.parseEther("1000");
    const rewardPool = ethers.parseEther("100000");

    // Fund reward pool
    await lgc.approve(await staking.getAddress(), rewardPool);
    await staking.fundRewardPool(rewardPool);

    // Give Alice and Bob tokens
    await lgc.transfer(alice.address, amount);
    await lgc.transfer(bob.address, amount);

    await lgc.connect(alice).approve(await staking.getAddress(), amount);
    await lgc.connect(bob).approve(await staking.getAddress(), amount);

    // Alice -> Flexible
    await staking.connect(alice).stake(amount);

    // Bob -> Gold
    await staking.connect(bob).stakeInPool(2, amount);

    // Advance 30 days
    await time.increase(30 * 24 * 60 * 60);

    const flexibleReward =
        await staking.calculateRewards(0);

    const goldReward =
        await staking.calculateRewards(1);

    expect(goldReward).to.be.gt(flexibleReward);
});

it("Should not allow unstaking from the Gold pool before 90 days", async function () {

    const amount = ethers.parseEther("1000");

    await lgc.transfer(alice.address, amount);

    await lgc
        .connect(alice)
        .approve(
            await staking.getAddress(),
            amount
        );

    await staking
        .connect(alice)
        .stakeInPool(
            2,
            amount
        );

    await expect(
        staking
            .connect(alice)
            .unstake(0)
    ).to.be.revertedWithCustomError(
        staking,
        "StakeStillLocked"
    );
});

it("Should allow unstaking from the Gold pool after 90 days", async function () {

    const amount = ethers.parseEther("1000");
    const rewardPool = ethers.parseEther("100000");

    // Fund reward pool
    await lgc.approve(await staking.getAddress(), rewardPool);
    await staking.fundRewardPool(rewardPool);

    // Give Alice tokens
    await lgc.transfer(alice.address, amount);

    await lgc
        .connect(alice)
        .approve(await staking.getAddress(), amount);

    // Stake in Gold Pool
    await staking
        .connect(alice)
        .stakeInPool(2, amount);

    // Advance exactly 90 days
    await time.increase(90 * 24 * 60 * 60);

    // Should now succeed
    await staking
        .connect(alice)
        .unstake(0);

    const stake = await staking.getStake(0);

    expect(stake.active).to.equal(false);
});

it("Should not allow unstaking from the Platinum pool before 180 days", async function () {

    const amount = ethers.parseEther("1000");

    await lgc.transfer(alice.address, amount);

    await lgc.connect(alice).approve(
        await staking.getAddress(),
        amount
    );

    await staking
        .connect(alice)
        .stakeInPool(3, amount);

    await expect(
        staking
            .connect(alice)
            .unstake(0)
    ).to.be.revertedWithCustomError(
        staking,
        "StakeStillLocked"
    );
});

it("Should allow unstaking from the Platinum pool after 180 days", async function () {

    const amount = ethers.parseEther("1000");
    const rewardPool = ethers.parseEther("100000");

    await lgc.approve(
        await staking.getAddress(),
        rewardPool
    );

    await staking.fundRewardPool(
        rewardPool
    );

    await lgc.transfer(
        alice.address,
        amount
    );

    await lgc
        .connect(alice)
        .approve(
            await staking.getAddress(),
            amount
        );

    await staking
        .connect(alice)
        .stakeInPool(
            3,
            amount
        );

    await time.increase(
        180 * 24 * 60 * 60
    );

    await staking
        .connect(alice)
        .unstake(0);

    const stake =
        await staking.getStake(0);

    expect(stake.active).to.equal(false);
});

it("Should not allow unstaking from the Diamond pool before 365 days", async function () {

    const amount = ethers.parseEther("1000");

    await lgc.transfer(alice.address, amount);

    await lgc
        .connect(alice)
        .approve(
            await staking.getAddress(),
            amount
        );

    await staking
        .connect(alice)
        .stakeInPool(4, amount);

    await expect(
        staking
            .connect(alice)
            .unstake(0)
    ).to.be.revertedWithCustomError(
        staking,
        "StakeStillLocked"
    );
});

it("Should allow unstaking from the Diamond pool after 365 days", async function () {

    const amount = ethers.parseEther("1000");
    const rewardPool = ethers.parseEther("100000");

    await lgc.approve(
        await staking.getAddress(),
        rewardPool
    );

    await staking.fundRewardPool(
        rewardPool
    );

    await lgc.transfer(
        alice.address,
        amount
    );

    await lgc
        .connect(alice)
        .approve(
            await staking.getAddress(),
            amount
        );

    await staking
        .connect(alice)
        .stakeInPool(
            4,
            amount
        );

    await time.increase(
        365 * 24 * 60 * 60
    );

    await staking
        .connect(alice)
        .unstake(0);

    const stake =
        await staking.getStake(0);

    expect(stake.active).to.equal(false);
});

it("Should allow the owner to disable a staking pool", async function () {

    await staking.setPoolActive(
        2,
        false
    );

    const pool =
        await staking.getPool(2);

    expect(pool.active)
        .to.equal(false);
});

it("Should allow the owner to re-enable a staking pool", async function () {

    await staking.setPoolActive(
        2,
        false
    );

    await staking.setPoolActive(
        2,
        true
    );

    const pool =
        await staking.getPool(2);

    expect(pool.active)
        .to.equal(true);
});

it("Should not allow a non-owner to disable a pool", async function () {

    await expect(

        staking
            .connect(alice)
            .setPoolActive(
                2,
                false
            )

    ).to.be.reverted;
});

it("Should not allow staking into an inactive pool", async function () {

    const amount =
        ethers.parseEther("1000");

    await lgc.transfer(
        alice.address,
        amount
    );

    await lgc
        .connect(alice)
        .approve(
            await staking.getAddress(),
            amount
        );

    await staking.setPoolActive(
        2,
        false
    );

    await expect(

        staking
            .connect(alice)
            .stakeInPool(
                2,
                amount
            )

    ).to.be.revertedWithCustomError(
        staking,
        "PoolInactive"
    );
});

it("Should allow the owner to update a pool reward rate", async function () {

    await staking.updatePoolRewardRate(
        2,
        1800
    );

    const pool =
        await staking.getPool(2);

    expect(pool.annualRewardRate)
        .to.equal(1800);
});

it("Should not allow a non-owner to update a pool reward rate", async function () {

    await expect(

        staking
            .connect(alice)
            .updatePoolRewardRate(
                2,
                1800
            )

    ).to.be.reverted;

});


it("Should reject updating an invalid pool", async function () {

    await expect(

        staking.updatePoolRewardRate(
            100,
            1800
        )

    ).to.be.revertedWithCustomError(
        staking,
        "InvalidPool"
    );

});


it("Should reject a zero reward rate", async function () {

    await expect(

        staking.updatePoolRewardRate(
            2,
            0
        )

    ).to.be.revertedWithCustomError(
        staking,
        "InvalidRewardRate"
    );

});

it("Should use the updated reward rate for future rewards", async function () {

    const amount =
        ethers.parseEther("1000");

    const rewardPool =
        ethers.parseEther("100000");

    await lgc.approve(
        await staking.getAddress(),
        rewardPool
    );

    await staking.fundRewardPool(
        rewardPool
    );

    await staking.updatePoolRewardRate(
        0,
        2000
    );

    await lgc.transfer(
        alice.address,
        amount
    );

    await lgc
        .connect(alice)
        .approve(
            await staking.getAddress(),
            amount
        );

    await staking
        .connect(alice)
        .stake(amount);

    await time.increase(
        365 * 24 * 60 * 60
    );

    const reward =
        await staking.calculateRewards(0);

    expect(reward)
        .to.equal(
            ethers.parseEther("200")
        );
});

it("Should return the correct initial reward pool statistics", async function () {

    const stats =
        await staking.getRewardPoolStats();

    expect(stats.rewardPool)
        .to.equal(0);

    expect(stats.totalRewardsPaid)
        .to.equal(0);

    expect(stats.totalStaked)
        .to.equal(0);

    expect(stats.totalStakePositions)
        .to.equal(0);

    expect(stats.totalPools)
        .to.equal(5);
});

it("Should update dashboard after funding the reward pool", async function () {

    const amount =
        ethers.parseEther("100000");

    await lgc.approve(
        await staking.getAddress(),
        amount
    );

    await staking.fundRewardPool(amount);

    const stats =
        await staking.getRewardPoolStats();

    expect(stats.rewardPool)
        .to.equal(amount);
});




it("V2 characterizes first-come partial funding across two claimants", async function () {
  const V2 = await ethers.getContractFactory("LGCStakingV2");
  const owner = await staking.owner();
  const v2 = await V2.deploy(owner, await lgc.getAddress());
  await v2.waitForDeployment();
  const contractAddress = await v2.getAddress();
  const principal = ethers.parseEther("100");
  const bob = (await ethers.getSigners()).find(s =>
    s.address.toLowerCase() !== alice.address.toLowerCase() &&
    s.address.toLowerCase() !== owner.toLowerCase()
  );
  expect(bob).not.to.equal(undefined);

  await lgc.transfer(alice.address, principal);
  await lgc.transfer(bob.address, principal);
  await lgc.connect(alice).approve(contractAddress, principal);
  await lgc.connect(bob).approve(contractAddress, principal);
  await v2.connect(alice).stake(principal);
  await v2.connect(bob).stake(principal);
  await time.increase(24 * 60 * 60);
  await v2.connect(alice).unstake(0);
  await v2.connect(bob).unstake(1);

  const debtA = await v2.unpaidRewards(alice.address);
  const debtB = await v2.unpaidRewards(bob.address);
  expect(debtA).to.be.gt(0n);
  expect(debtB).to.be.gt(0n);
  expect(await v2.totalUnpaidRewards()).to.equal(debtA + debtB);
  expect(await v2.totalStaked()).to.equal(0n);
  expect(await v2.activeStakers()).to.equal(0n);

  // Fund less than either person's debt. Bob claims first despite withdrawing second.
  const scarceFunding = (debtA < debtB ? debtA : debtB) / 2n;
  expect(scarceFunding).to.be.gt(0n);
  await lgc.approve(contractAddress, scarceFunding);
  await v2.fundRewardPool(scarceFunding);
  await v2.connect(bob).claimDeferredRewards();

  // Current implementation is first-come-first-served, not FIFO or pro rata.
  expect(await v2.unpaidRewards(alice.address)).to.equal(debtA);
  expect(await v2.unpaidRewards(bob.address)).to.equal(debtB - scarceFunding);
  expect(await v2.totalUnpaidRewards()).to.equal(debtA + debtB - scarceFunding);
  expect(await v2.totalRewardsPaid()).to.equal(scarceFunding);
  expect(await v2.rewardPool()).to.equal(0n);
  await expect(v2.connect(alice).claimDeferredRewards())
    .to.be.revertedWithCustomError(v2, "InsufficientRewardPool");
});

it("V2 reconciles two creditors and reward funding across settlement rounds", async function () {
  const V2 = await ethers.getContractFactory("LGCStakingV2");
  const owner = await staking.owner();
  const v2 = await V2.deploy(owner, await lgc.getAddress());
  await v2.waitForDeployment();
  const contractAddress = await v2.getAddress();
  const principal = ethers.parseEther("100");
  const bob = (await ethers.getSigners()).find(s =>
    s.address.toLowerCase() !== alice.address.toLowerCase() &&
    s.address.toLowerCase() !== owner.toLowerCase()
  );
  expect(bob).not.to.equal(undefined);

  await lgc.transfer(alice.address, principal);
  await lgc.transfer(bob.address, principal);
  await lgc.connect(alice).approve(contractAddress, principal);
  await lgc.connect(bob).approve(contractAddress, principal);
  await v2.connect(alice).stake(principal);
  await v2.connect(bob).stake(principal);
  await time.increase(24 * 60 * 60);
  await v2.connect(alice).unstake(0);
  await v2.connect(bob).unstake(1);
  const debtA = await v2.unpaidRewards(alice.address);
  const debtB = await v2.unpaidRewards(bob.address);
  const total = debtA + debtB;
  const first = debtA / 3n;
  expect(first).to.be.gt(0n);

  await lgc.approve(contractAddress, total);
  await v2.fundRewardPool(first);
  await expect(v2.connect(bob).claimDeferredRewards())
    .to.not.be.reverted;
  expect(await v2.unpaidRewards(alice.address)).to.equal(debtA);
  expect(await v2.unpaidRewards(bob.address)).to.equal(debtB - first);
  expect(await v2.totalUnpaidRewards()).to.equal(total - first);
  expect(await v2.totalRewardsPaid()).to.equal(first);

  // Fund all remaining recorded debt, then settle both claimants exactly once.
  await v2.fundRewardPool(total - first);
  await v2.connect(alice).claimDeferredRewards();
  await v2.connect(bob).claimDeferredRewards();

  expect(await v2.unpaidRewards(alice.address)).to.equal(0n);
  expect(await v2.unpaidRewards(bob.address)).to.equal(0n);
  expect(await v2.totalUnpaidRewards()).to.equal(0n);
  expect(await v2.rewardPool()).to.equal(0n);
  expect(await v2.totalRewardsFunded()).to.equal(total);
  expect(await v2.totalRewardsPaid()).to.equal(total);
  expect(await v2.totalStaked()).to.equal(0n);
  expect(await lgc.balanceOf(contractAddress)).to.equal(0n);
  await expect(v2.connect(alice).claimDeferredRewards())
    .to.be.revertedWithCustomError(v2, "NothingToClaim");
  await expect(v2.connect(bob).claimDeferredRewards())
    .to.be.revertedWithCustomError(v2, "NothingToClaim");
});

it("V2 reports deferred-liability coverage without claiming full solvency", async function () {
  const V2 = await ethers.getContractFactory("LGCStakingV2");
  const v2 = await V2.deploy(await staking.owner(), await lgc.getAddress());
  await v2.waitForDeployment();
  const address = await v2.getAddress();
  const principal = ethers.parseEther("100");
  await lgc.transfer(alice.address, principal);
  await lgc.connect(alice).approve(address, principal);
  await v2.connect(alice).stake(principal);
  await time.increase(24 * 60 * 60);
  await v2.connect(alice).unstake(0);

  const owed = await v2.unpaidRewards(alice.address);
  expect(owed).to.be.gt(1n);
  expect(await v2.rewardPoolHealthy()).to.equal(false);
  let coverage = await v2.deferredRewardCoverage();
  expect(coverage.fundedRewards).to.equal(0n);
  expect(coverage.recordedDebt).to.equal(owed);
  expect(coverage.fundingShortfall).to.equal(owed);

  await lgc.approve(address, owed);
  await v2.fundRewardPool(1n);
  expect(await v2.rewardPoolHealthy()).to.equal(false);
  coverage = await v2.deferredRewardCoverage();
  expect(coverage.fundedRewards).to.equal(1n);
  expect(coverage.recordedDebt).to.equal(owed);
  expect(coverage.fundingShortfall).to.equal(owed - 1n);

  await v2.fundRewardPool(owed - 1n);
  expect(await v2.rewardPoolHealthy()).to.equal(true);
  coverage = await v2.deferredRewardCoverage();
  expect(coverage.fundedRewards).to.equal(owed);
  expect(coverage.recordedDebt).to.equal(owed);
  expect(coverage.fundingShortfall).to.equal(0n);
});

it("V2 documents that emergency pause blocks withdrawal until owner unpauses", async function () {
  const V2 = await ethers.getContractFactory("LGCStakingV2");
  const v2 = await V2.deploy(await staking.owner(), await lgc.getAddress());
  await v2.waitForDeployment();
  const address = await v2.getAddress();
  const principal = ethers.parseEther("100");
  await lgc.transfer(alice.address, principal);
  await lgc.connect(alice).approve(address, principal);
  await v2.connect(alice).stake(principal);
  await v2.pause();

  await expect(v2.connect(alice).unstake(0))
    .to.be.revertedWithCustomError(v2, "EnforcedPause");
  expect(await v2.totalStaked()).to.equal(principal);
  expect((await v2.getStake(0))[6]).to.equal(true);

  await v2.unpause();
  await v2.connect(alice).unstake(0);
  expect(await v2.totalStaked()).to.equal(0n);
  expect((await v2.getStake(0))[6]).to.equal(false);
});

it("V2 prioritizes deferred liabilities over new live reward claims", async function () {
  const V2 = await ethers.getContractFactory("LGCStakingV2");
  const owner = await staking.owner();
  const v2 = await V2.deploy(owner, await lgc.getAddress());
  await v2.waitForDeployment();
  const address = await v2.getAddress();
  const principal = ethers.parseEther("100");
  const accounts = await ethers.getSigners();
  const bob = accounts.find(s => s.address.toLowerCase() !== alice.address.toLowerCase()
    && s.address.toLowerCase() !== owner.toLowerCase());
  expect(bob).not.to.equal(undefined);

  await lgc.transfer(alice.address, principal);
  await lgc.transfer(bob.address, principal);
  await lgc.connect(alice).approve(address, principal);
  await lgc.connect(bob).approve(address, principal);

  await v2.connect(alice).stake(principal);
  await time.increase(24 * 60 * 60);
  await v2.connect(alice).unstake(0);
  const aliceDebt = await v2.unpaidRewards(alice.address);
  expect(aliceDebt).to.be.gt(0n);
  expect(await v2.totalUnpaidRewards()).to.equal(aliceDebt);

  await v2.connect(bob).stake(principal);
  await time.increase(24 * 60 * 60);
  expect(await v2.calculateRewards(1)).to.be.gt(0n);

  // Funding exactly the recorded debt must not be consumed by a newer active claim.
  await lgc.approve(address, aliceDebt);
  await v2.fundRewardPool(aliceDebt);
  await expect(v2.connect(bob).claimRewards(1))
    .to.be.revertedWithCustomError(v2, "InsufficientRewardPool");
  await v2.connect(alice).claimDeferredRewards();
  expect(await v2.unpaidRewards(alice.address)).to.equal(0n);
  expect(await v2.totalUnpaidRewards()).to.equal(0n);
  expect(await v2.rewardPool()).to.equal(0n);
  expect((await v2.getStake(1))[6]).to.equal(true);
});

it("V2 partially settles deferred rewards without erasing remaining debt", async function () {
  const V2 = await ethers.getContractFactory("LGCStakingV2");
  const v2 = await V2.deploy(await staking.owner(), await lgc.getAddress());
  await v2.waitForDeployment();
  const address = await v2.getAddress();
  const principal = ethers.parseEther("100");
  const aliceStartingBalance = await lgc.balanceOf(alice.address);
  await lgc.transfer(alice.address, principal);
  await lgc.connect(alice).approve(address, principal);
  await v2.connect(alice).stake(principal);
  await time.increase(24 * 60 * 60);
  await v2.connect(alice).unstake(0);
  const owed = await v2.unpaidRewards(alice.address);
  const firstFunding = owed / 2n;
  expect(firstFunding).to.be.gt(0n);

  await lgc.approve(address, owed);
  await v2.fundRewardPool(firstFunding);
  await v2.connect(alice).claimDeferredRewards();
  expect(await v2.unpaidRewards(alice.address)).to.equal(owed - firstFunding);
  expect(await v2.totalUnpaidRewards()).to.equal(owed - firstFunding);
  expect(await v2.totalRewardsPaid()).to.equal(firstFunding);
  expect(await v2.rewardPool()).to.equal(0n);
  expect(await lgc.balanceOf(alice.address)).to.equal(aliceStartingBalance + principal + firstFunding);

  await v2.fundRewardPool(owed - firstFunding);
  await v2.connect(alice).claimDeferredRewards();
  expect(await v2.unpaidRewards(alice.address)).to.equal(0n);
  expect(await v2.totalUnpaidRewards()).to.equal(0n);
  expect(await v2.totalRewardsPaid()).to.equal(owed);
  expect(await lgc.balanceOf(alice.address)).to.equal(aliceStartingBalance + principal + owed);
  await expect(v2.connect(alice).claimDeferredRewards())
    .to.be.revertedWithCustomError(v2, "NothingToClaim");
});

it("V2 accumulates deferred debt across positions while counting stakers once", async function () {
  const V2 = await ethers.getContractFactory("LGCStakingV2");
  const v2 = await V2.deploy(await staking.owner(), await lgc.getAddress());
  await v2.waitForDeployment();
  const address = await v2.getAddress();
  const principal = ethers.parseEther("100");
  const aliceStartingBalance = await lgc.balanceOf(alice.address);
  await lgc.transfer(alice.address, principal * 2n);
  await lgc.connect(alice).approve(address, principal * 2n);
  await v2.connect(alice).stake(principal);
  await v2.connect(alice).stake(principal);
  expect(await v2.activeStakers()).to.equal(1n);
  expect(await v2.totalStaked()).to.equal(principal * 2n);
  await time.increase(24 * 60 * 60);

  await v2.connect(alice).unstake(0);
  expect(await v2.activeStakers()).to.equal(1n);
  expect(await v2.totalStaked()).to.equal(principal);
  const firstDebt = await v2.unpaidRewards(alice.address);
  expect(firstDebt).to.be.gt(0n);
  await v2.connect(alice).unstake(1);
  expect(await v2.activeStakers()).to.equal(0n);
  expect(await v2.totalStaked()).to.equal(0n);
  expect(await v2.userTotalStaked(alice.address)).to.equal(0n);
  const owed = await v2.unpaidRewards(alice.address);
  expect(owed).to.be.gt(firstDebt);
  expect(await v2.totalUnpaidRewards()).to.equal(owed);
  expect(await lgc.balanceOf(alice.address)).to.equal(aliceStartingBalance + principal * 2n);

  await lgc.approve(address, owed);
  await v2.fundRewardPool(owed);
  await v2.connect(alice).claimDeferredRewards();
  expect(await v2.totalUnpaidRewards()).to.equal(0n);
  expect(await lgc.balanceOf(alice.address)).to.equal(aliceStartingBalance + principal * 2n + owed);
});

it("V2 returns unlocked principal without reward liquidity and preserves accrued debt", async function () {
  const V2 = await ethers.getContractFactory("LGCStakingV2");
  const v2 = await V2.deploy(await staking.owner(), await lgc.getAddress());
  await v2.waitForDeployment();
  const address = await v2.getAddress();
  const principal = ethers.parseEther("100");
  await lgc.transfer(alice.address, principal);
  const initialBalance = await lgc.balanceOf(alice.address);
  await lgc.connect(alice).approve(address, principal);
  await v2.connect(alice).stake(principal);
  await time.increase(24 * 60 * 60);
  const beforeExit = await v2.calculateRewards(0);
  expect(beforeExit).to.be.gt(0n);
  expect(await v2.rewardPool()).to.equal(0n);

  await v2.connect(alice).unstake(0);
  expect(await v2.totalStaked()).to.equal(0n);
  expect(await v2.activeStakers()).to.equal(0n);
  expect((await v2.getStake(0))[6]).to.equal(false);
  expect(await lgc.balanceOf(alice.address)).to.equal(initialBalance);

  const debt = await v2.unpaidRewards(alice.address);
  expect(debt).to.be.gte(beforeExit);
  expect(await v2.totalUnpaidRewards()).to.equal(debt);
  await expect(v2.connect(alice).claimDeferredRewards())
    .to.be.revertedWithCustomError(v2, "InsufficientRewardPool");

  const funding = ethers.parseEther("10");
  await lgc.approve(address, funding);
  await v2.fundRewardPool(funding);
  await v2.connect(alice).claimDeferredRewards();
  expect(await v2.unpaidRewards(alice.address)).to.equal(0n);
  expect(await v2.totalUnpaidRewards()).to.equal(0n);
  expect(await v2.totalRewardsPaid()).to.equal(debt);
  expect(await lgc.balanceOf(alice.address)).to.equal(initialBalance + debt);
  await expect(v2.connect(alice).claimDeferredRewards())
    .to.be.revertedWithCustomError(v2, "NothingToClaim");
});

it("V2 returns principal even when reward rounds to zero", async function () {
  const V2 = await ethers.getContractFactory("LGCStakingV2");
  const v2 = await V2.deploy(await staking.owner(), await lgc.getAddress());
  await v2.waitForDeployment();
  const address = await v2.getAddress();
  await lgc.transfer(alice.address, 1n);
  const balance = await lgc.balanceOf(alice.address);
  await lgc.connect(alice).approve(address, 1n);
  await v2.connect(alice).stake(1n);
  await v2.connect(alice).unstake(0);
  expect(await v2.totalStaked()).to.equal(0n);
  expect(await v2.activeStakers()).to.equal(0n);
  expect(await lgc.balanceOf(alice.address)).to.equal(balance);
  expect(await v2.unpaidRewards(alice.address)).to.equal(0n);
});

it("Should demonstrate legacy withdrawal recovery after reward funding", async function () {
  const principal = ethers.parseEther("100");
  const funding = ethers.parseEther("10");
  const stakingAddress = await staking.getAddress();

  // Create a local test position.
  await lgc.transfer(alice.address, principal);

  await lgc
    .connect(alice)
    .approve(stakingAddress, principal);

  await staking.connect(alice).stake(principal);

  expect(await staking.getTotalStaked())
    .to.equal(principal);

  expect(await staking.activeStakers())
    .to.equal(1n);

  // Allow one day of rewards to accumulate.
  await time.increase(24 * 60 * 60);

  const pending =
    await staking.calculateRewards(0);

  expect(pending).to.be.gt(0n);

  expect(await staking.getRewardPool())
    .to.equal(0n);

  // Reproduce the deployed legacy withdrawal blocker.
  await expect(
    staking.connect(alice).unstake(0)
  ).to.be.revertedWithCustomError(
    staking,
    "InsufficientRewardPool"
  );

  // A reverted withdrawal must preserve principal.
  expect(await staking.getTotalStaked())
    .to.equal(principal);

  expect((await staking.getStake(0))[6])
    .to.equal(true);

  // Local owner funds the reward reserve.
  await lgc.approve(stakingAddress, funding);

  await staking.fundRewardPool(funding);

  expect(await staking.getRewardPool())
    .to.equal(funding);

  // Rehearse successful principal and reward recovery.
  await staking.connect(alice).unstake(0);

  expect(await staking.getTotalStaked())
    .to.equal(0n);

  expect(await staking.activeStakers())
    .to.equal(0n);

  expect((await staking.getStake(0))[6])
    .to.equal(false);

  expect(await lgc.balanceOf(alice.address))
    .to.be.gt(principal);

  expect(await staking.totalRewardsPaid())
    .to.be.gt(0n);
});

it("Should track distinct active stakers through exits", async function () {
  const amount = ethers.parseEther("10");
  const stakingAddress = await staking.getAddress();

  const signers = await ethers.getSigners();
  const bob = signers.find(
    (s) =>
      s.address.toLowerCase() !== alice.address.toLowerCase() &&
      s.address.toLowerCase() !== signers[0].address.toLowerCase()
  );

  if (!bob) throw new Error("Second test wallet unavailable");

  expect(await staking.activeStakers()).to.equal(0n);

  await lgc.transfer(alice.address, amount * 2n);
  await lgc.transfer(bob.address, amount);

  await lgc.connect(alice).approve(stakingAddress, amount * 2n);
  await lgc.connect(bob).approve(stakingAddress, amount);

  await staking.connect(alice).stake(amount);
  expect(await staking.activeStakers()).to.equal(1n);

  await staking.connect(alice).stake(amount);
  expect(await staking.activeStakers()).to.equal(1n);

  await staking.connect(bob).stake(amount);
  expect(await staking.activeStakers()).to.equal(2n);

  const stats = await staking.getRewardPoolStats();
  expect(stats.activeStakers).to.equal(2n);
  expect(stats.totalStakePositions).to.equal(3n);

  await lgc.approve(stakingAddress, ethers.parseEther("100000"));
  await staking.fundRewardPool(ethers.parseEther("100000"));

  await time.increase(366 * 24 * 60 * 60);

  await staking.connect(alice).unstake(0);
  expect(await staking.activeStakers()).to.equal(2n);

  await staking.connect(alice).unstake(1);
  expect(await staking.activeStakers()).to.equal(1n);

  await staking.connect(bob).unstake(2);
  expect(await staking.activeStakers()).to.equal(0n);
  expect(await staking.getTotalStaked()).to.equal(0n);

  await lgc.connect(alice).approve(stakingAddress, amount);
  await staking.connect(alice).stake(amount);

  expect(await staking.activeStakers()).to.equal(1n);
});

it("Should update dashboard after staking", async function () {

    const amount =
        ethers.parseEther("1000");

    await lgc.transfer(
        alice.address,
        amount
    );

    await lgc
        .connect(alice)
        .approve(
            await staking.getAddress(),
            amount
        );

    await staking
        .connect(alice)
        .stake(amount);

    const stats =
        await staking.getRewardPoolStats();

    expect(stats.totalStaked)
        .to.equal(amount);

    expect(stats.totalStakePositions)
        .to.equal(1);
});

it("Should update dashboard after claiming rewards", async function () {

    const rewardPool =
        ethers.parseEther("100000");

    const amount =
        ethers.parseEther("1000");

    await lgc.approve(
        await staking.getAddress(),
        rewardPool
    );

    await staking.fundRewardPool(
        rewardPool
    );

    await lgc.transfer(
        alice.address,
        amount
    );

    await lgc
        .connect(alice)
        .approve(
            await staking.getAddress(),
            amount
        );

    await staking
        .connect(alice)
        .stake(amount);

    await time.increase(
        365 * 24 * 60 * 60
    );

    const reward =
        await staking.calculateRewards(0);

    await staking
        .connect(alice)
        .claimRewards(0);

    const stats =
        await staking.getRewardPoolStats();

    expect(stats.totalRewardsPaid)
    .to.be.greaterThan(0);

expect(stats.rewardPool)
    .to.be.lessThan(rewardPool);

expect(
    stats.rewardPool +
    stats.totalRewardsPaid
).to.equal(rewardPool);
});

it("Invariant: totalStaked should equal total active stake initially", async function () {

    const calculated =
        await staking.calculateTotalActiveStake();

    expect(calculated)
        .to.equal(
            await staking.totalStaked()
        );

});

it("Invariant: totalStaked should equal active stake after one stake", async function () {

    const amount =
        ethers.parseEther("1000");

    await lgc.transfer(
        alice.address,
        amount
    );

    await lgc
        .connect(alice)
        .approve(
            await staking.getAddress(),
            amount
        );

    await staking
        .connect(alice)
        .stake(amount);

    expect(
        await staking.calculateTotalActiveStake()
    ).to.equal(
        await staking.totalStaked()
    );

});

it("Invariant: totalStaked should equal sum of all active stakes", async function () {

    const amount1 =
        ethers.parseEther("1000");

    const amount2 =
        ethers.parseEther("2000");

    await lgc.transfer(
        alice.address,
        amount1
    );

    await lgc.transfer(
        bob.address,
        amount2
    );

    await lgc
        .connect(alice)
        .approve(
            await staking.getAddress(),
            amount1
        );

    await lgc
        .connect(bob)
        .approve(
            await staking.getAddress(),
            amount2
        );

    await staking
        .connect(alice)
        .stake(amount1);

    await staking
        .connect(bob)
        .stake(amount2);

    expect(
        await staking.calculateTotalActiveStake()
    ).to.equal(
        await staking.totalStaked()
    );

});


it("Invariant: totalStaked should remain correct after unstaking", async function () {

    const rewardPool =
        ethers.parseEther("100000");

    await lgc.approve(
        await staking.getAddress(),
        rewardPool
    );

    await staking.fundRewardPool(
        rewardPool
    );

    const amount =
        ethers.parseEther("1000");

    await lgc.transfer(
        alice.address,
        amount
    );

    await lgc
        .connect(alice)
        .approve(
            await staking.getAddress(),
            amount
        );

    await staking
        .connect(alice)
        .stake(amount);

    await staking
        .connect(alice)
        .unstake(0);

    expect(
        await staking.calculateTotalActiveStake()
    ).to.equal(
        await staking.totalStaked()
    );

});

it("Invariant: reward accounting should be correct initially", async function () {

    const stats =
        await staking.getRewardPoolStats();

    expect(stats.totalRewardsFunded)
        .to.equal(0);

    expect(stats.rewardPool)
        .to.equal(0);

    expect(stats.totalRewardsPaid)
        .to.equal(0);

    expect(
        stats.rewardPool +
        stats.totalRewardsPaid
    ).to.equal(
        stats.totalRewardsFunded
    );

});

it("Invariant: reward accounting should remain correct after funding", async function () {

    const amount =
        ethers.parseEther("100000");

    await lgc.approve(
        await staking.getAddress(),
        amount
    );

    await staking.fundRewardPool(
        amount
    );

    const stats =
        await staking.getRewardPoolStats();

    expect(
        stats.rewardPool +
        stats.totalRewardsPaid
    ).to.equal(
        stats.totalRewardsFunded
    );

});

it("Invariant: reward accounting should remain correct after reward claim", async function () {

    const rewardPool =
        ethers.parseEther("100000");

    await lgc.approve(
        await staking.getAddress(),
        rewardPool
    );

    await staking.fundRewardPool(
        rewardPool
    );

    const amount =
        ethers.parseEther("1000");

    await lgc.transfer(
        alice.address,
        amount
    );

    await lgc
        .connect(alice)
        .approve(
            await staking.getAddress(),
            amount
        );

    await staking
        .connect(alice)
        .stake(amount);

    await time.increase(
        365 * 24 * 60 * 60
    );

    await staking
        .connect(alice)
        .claimRewards(0);

    const stats =
        await staking.getRewardPoolStats();

    expect(
        stats.rewardPool +
        stats.totalRewardsPaid
    ).to.equal(
        stats.totalRewardsFunded
    );

});
});
