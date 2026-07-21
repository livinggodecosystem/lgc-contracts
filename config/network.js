module.exports = {

    hardhat: {

        chainId: 31337,

        ecosystemWallet:
            "0x0000000000000000000000000000000000000000",

        communityWallet:
            "0x0000000000000000000000000000000000000000",

        liquidityWallet:
            "0x0000000000000000000000000000000000000000",

        developmentWallet:
            "0x0000000000000000000000000000000000000000",

        reserveWallet:
            "0x0000000000000000000000000000000000000000",

        teamWallet:
            "0x0000000000000000000000000000000000000000"
    },

    localhost: {

        chainId: 31337,

        ecosystemWallet:
            "0x0000000000000000000000000000000000000000",

        communityWallet:
            "0x0000000000000000000000000000000000000000",

        liquidityWallet:
            "0x0000000000000000000000000000000000000000",

        developmentWallet:
            "0x0000000000000000000000000000000000000000",

        reserveWallet:
            "0x0000000000000000000000000000000000000000",

        teamWallet:
            "0x0000000000000000000000000000000000000000"
    },

    bscTestnet: {

        chainId: 97,

        ecosystemWallet: process.env.ECOSYSTEM_WALLET,

        communityWallet: process.env.COMMUNITY_WALLET,

        liquidityWallet: process.env.LIQUIDITY_WALLET,

        developmentWallet: process.env.DEVELOPMENT_WALLET,

        reserveWallet: process.env.RESERVE_WALLET,

        teamWallet: process.env.TEAM_WALLET
    },

    bscMainnet: {

        chainId: 56,

        ecosystemWallet: process.env.ECOSYSTEM_WALLET,

        communityWallet: process.env.COMMUNITY_WALLET,

        liquidityWallet: process.env.LIQUIDITY_WALLET,

        developmentWallet: process.env.DEVELOPMENT_WALLET,

        reserveWallet: process.env.RESERVE_WALLET,

        teamWallet: process.env.TEAM_WALLET
    }

};