const { ethers } = require("ethers");

const wallet = require("../wallet");
const deployment = require("../contracts");
const abi = require("../abi/LGCTreasury.json");

const contract = new ethers.Contract(
    deployment.LGCTreasury,
    abi,
    wallet
);

module.exports = {

    contract,

    address() {
        return deployment.LGCTreasury;
    },

    async ecosystemWallet() {
        return await contract.ecosystemWallet();
    },

    async communityWallet() {
        return await contract.communityWallet();
    },

    async liquidityWallet() {
        return await contract.liquidityWallet();
    },

    async developmentWallet() {
        return await contract.developmentWallet();
    },

    async reserveWallet() {
        return await contract.reserveWallet();
    },

    async teamWallet() {
        return await contract.teamWallet();
    },

    async paused() {
        return await contract.paused();
    },

    async owner() {
        return await contract.owner();
    }

};