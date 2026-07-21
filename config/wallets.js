module.exports = {

    ecosystemWallet:
        process.env.ECOSYSTEM_WALLET ||
        "0x0000000000000000000000000000000000000000",

    communityWallet:
        process.env.COMMUNITY_WALLET ||
        "0x0000000000000000000000000000000000000000",

    liquidityWallet:
        process.env.LIQUIDITY_WALLET ||
        "0x0000000000000000000000000000000000000000",

    developmentWallet:
        process.env.DEVELOPMENT_WALLET ||
        "0x0000000000000000000000000000000000000000",

    reserveWallet:
        process.env.RESERVE_WALLET ||
        "0x0000000000000000000000000000000000000000",

    teamWallet:
        process.env.TEAM_WALLET ||
        "0x0000000000000000000000000000000000000000"

};