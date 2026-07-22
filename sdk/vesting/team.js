const { ethers } = require("ethers");

const wallet = require("../wallet");
const deployment = require("../contracts");
const abi = require("../abi/LGCTeamVesting.json");

const contract = new ethers.Contract(
    deployment.LGCTeamVesting,
    abi,
    wallet
);

module.exports = {

    contract,

    address() {
        return deployment.LGCTeamVesting;
    },

    async owner() {
        return await contract.owner();
    },

    async paused() {
        return await contract.paused();
    }

};