const { ethers } = require("ethers");

const wallet = require("../wallet");
const deployment = require("../contracts");
const abi = require("../abi/LGCLaunchRegistry.json");

const contract = new ethers.Contract(

    deployment.LGCLaunchRegistry,

    abi,

    wallet

);

module.exports = {

    contract,

    address() {

        return deployment.LGCLaunchRegistry;

    },

    async owner() {

        return await contract.owner();

    },

    async version() {

        return await contract.VERSION();

    },

    async deployedAt() {

        return await contract.deployedAt();

    },

    async isLaunchActive() {

        return await contract.isLaunchActive();

    },

    async ecosystemLaunchTime() {

        return await contract.ecosystemLaunchTime();

    },

    async secondsSinceLaunch() {

        return await contract.secondsSinceLaunch();

    },

    async daysSinceLaunch() {

        return await contract.daysSinceLaunch();

    },

    async monthsSinceLaunch() {

        return await contract.monthsSinceLaunch();

    },

    async yearsSinceLaunch() {

        return await contract.yearsSinceLaunch();

    }

};