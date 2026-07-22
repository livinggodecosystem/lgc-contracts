module.exports = {

    config:
        require("./config"),

    provider:
        require("./provider"),

    wallet:
        require("./wallet"),

    contracts:
        require("./contracts"),

    token:
        require("./token/lgc"),

    staking:
        require("./staking/staking"),

    treasury:
        require("./treasury/treasury"),

    vesting: {

        general:
            require("./vesting/vesting"),

        team:
            require("./vesting/team"),

        investor:
            require("./vesting/investor")

    },

    registry:
        require("./registry/launch")

};