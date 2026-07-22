const { ethers } = require("ethers");

const wallet = require("../wallet");
const deployment = require("../contracts");
const abi = require("../abi/LGCStaking.json");

const contract = new ethers.Contract(
    deployment.LGCStaking,
    abi,
    wallet
);

module.exports = {

    contract,

    address() {
        return deployment.LGCStaking;
    },

    async totalPools() {
        return Number(
            await contract.totalPools()
        );
    },

    async annualRewardRate() {
        return Number(
            await contract.annualRewardRate()
        );
    },

    async paused() {
        return await contract.paused();
    },

    async stake(amount) {
        return await contract.stake(
            ethers.parseUnits(
                amount.toString(),
                18
            )
        );
    },

    async unstake() {
        return await contract.unstake();
    },

    async claimRewards() {
        return await contract.claimRewards();
    }

};