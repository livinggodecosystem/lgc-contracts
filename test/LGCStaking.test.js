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
