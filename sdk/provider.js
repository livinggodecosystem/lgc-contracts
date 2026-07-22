const { ethers } = require("ethers");

const config = require("./config");

const provider = new ethers.JsonRpcProvider(

    config.rpcUrl

);

module.exports = provider;