const { ethers } = require("ethers");

const wallet = require("../wallet");
const deployment = require("../contracts");
const abi = require("../abi/LGCInvestorVesting.json");

const contract = new ethers.Contract(
    deployment.LGCInvestorVesting,
    abi,
    wallet
);

module.exports = {

    contract,

    address() {
        return deployment.LGCInvestorVesting;
    },

    async owner() {
        return await contract.owner();
    },

    async paused() {
        return await contract.paused();
    }

};