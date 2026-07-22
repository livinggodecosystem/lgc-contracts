require("dotenv").config();

module.exports = {

    network: process.env.NETWORK || "bscTestnet",

    rpcUrl:
        process.env.BSC_RPC_URL,

    chainId: 97,

    tokenAddress:
        process.env.LGC_TOKEN_ADDRESS,

    deploymentFile:
        "../deployments/bscTestnet.json"

};