require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "";
const BSC_TESTNET_RPC_URL = process.env.BSC_TESTNET_RPC_URL || "";
const BSC_MAINNET_RPC_URL = process.env.BSC_MAINNET_RPC_URL || "";

module.exports = {
  solidity: "0.8.30",

  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },

    bscTestnet: {
      url: BSC_TESTNET_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },

    bscMainnet: {
      url: BSC_MAINNET_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};