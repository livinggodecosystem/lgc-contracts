require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

module.exports = {

    solidity: {
        version: "0.8.30",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },

    networks: {

        hardhat: {
            chainId: 31337
        },

        localhost: {
            url: "http://127.0.0.1:8545"
        },

        bscTestnet: {
            url: process.env.BSC_RPC_URL,
            chainId: 97,
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : []
        }

    },

     etherscan: {
    apiKey: process.env.BSCSCAN_API_KEY,
},

};