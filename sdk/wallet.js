const { ethers } = require("ethers");

const provider =
    require("./provider");

const wallet =
    new ethers.Wallet(

        process.env.PRIVATE_KEY,

        provider

    );

module.exports = wallet;