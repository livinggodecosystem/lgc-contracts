const { ethers } = require("ethers");

const wallet = require("../wallet");
const deployment = require("../contracts");
const abi = require("../abi/LGCVesting.json");

const contract = new ethers.Contract(
    deployment.LGCVesting,
    abi,
    wallet
);

module.exports = {

    contract,

    address() {
        return deployment.LGCVesting;
    },

    async owner() {
        return await contract.owner();
    },

    async paused() {
        return await contract.paused();
    }

};