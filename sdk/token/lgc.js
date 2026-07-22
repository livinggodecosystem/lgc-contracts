const { ethers } = require("ethers");

const wallet = require("../wallet");

const deployment = require("../contracts");

const abi = require("../abi/LivingGodCoin.json");

const contract = new ethers.Contract(
    deployment.LivingGodCoin,
    abi,
    wallet
);

module.exports = {

    contract,

    address() {
        return deployment.LivingGodCoin;
    },

    async name() {
        return await contract.name();
    },

    async symbol() {
        return await contract.symbol();
    },

    async decimals() {
        return await contract.decimals();
    },

    async totalSupply() {

        return ethers.formatUnits(

            await contract.totalSupply(),

            18

        );

    },

    async balance(walletAddress) {

        return ethers.formatUnits(

            await contract.balanceOf(walletAddress),

            18

        );

    },

    async transfer(to, amount) {

        return await contract.transfer(

            to,

            ethers.parseUnits(

                amount.toString(),

                18

            )

        );

    },

    async approve(spender, amount) {

        return await contract.approve(

            spender,

            ethers.parseUnits(

                amount.toString(),

                18

            )

        );

    }

};