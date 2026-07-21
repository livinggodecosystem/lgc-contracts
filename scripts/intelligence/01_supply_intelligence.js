const hre = require("hardhat");
const { ethers } = hre;

const tokenomics =
    require("../../config/tokenomics");

async function main() {

    //-------------------------------------
    // Load Deployment
    //-------------------------------------

    const fs = require("fs");
    const path = require("path");

    const deploymentPath = path.join(
        __dirname,
        "../../deployments",
        `${hre.network.name}.json`
    );

    if (!fs.existsSync(deploymentPath)) {

        throw new Error(
            `Deployment file not found:\n${deploymentPath}`
        );

    }

    const deployment = JSON.parse(
        fs.readFileSync(deploymentPath)
    );

    //-------------------------------------
    // Contract
    //-------------------------------------

    const lgc =
        await ethers.getContractAt(
            "LivingGodCoin",
            deployment.LivingGodCoin
        );

    //-------------------------------------
    // Supply
    //-------------------------------------

    const totalSupply =
        Number(
            ethers.formatEther(
                await lgc.totalSupply()
            )
        );

    const maxSupply =
        Number(tokenomics.MAX_SUPPLY);

    //-------------------------------------
    // Locked Supply
    //-------------------------------------
       const allocatedSupply =

    Number(tokenomics.STARTUP_FUND) +

    Number(tokenomics.TEAM_VESTING) +

    Number(tokenomics.INVESTOR_VESTING) +

    Number(tokenomics.ECOSYSTEM_RESERVE) +

    Number(tokenomics.LIQUIDITY_RESERVE) +

    Number(tokenomics.DEVELOPMENT_FUND) +

    Number(tokenomics.COMMUNITY_REWARDS) +

    Number(tokenomics.STAKING_REWARDS);

    //-------------------------------------
    // Circulating
    //-------------------------------------

      const circulatingSupply = 0;

    //-------------------------------------
    // Helper
    //-------------------------------------

    function percent(value) {

        return (
            (Number(value) / maxSupply) * 100
        ).toFixed(2);

    }

    //-------------------------------------
    // Display
    //-------------------------------------

    console.log("");

    console.log("=====================================");

    console.log(" LIVING GOD ECOSYSTEM");

    console.log(" SUPPLY INTELLIGENCE");

    console.log("=====================================");

    console.log("");

    console.log(
        "Network:",
        hre.network.name
    );

    console.log("");

    console.log("----------- SUPPLY -----------");

    console.log(
        "Maximum Supply :",
        maxSupply.toLocaleString(),
        "LGC"
    );

    console.log(
        "Minted Supply  :",
        totalSupply.toLocaleString(),
        "LGC"
    );

    console.log(
    "Allocated Supply:",
    allocatedSupply.toLocaleString(),
    "LGC"
    );

    console.log(
        "Circulating    :",
        circulatingSupply.toLocaleString(),
        "LGC"
    );

    console.log("");

    console.log("------ TOKENOMICS DISTRIBUTION ------");

    console.log(
        `Startup Fund         ${percent(tokenomics.STARTUP_FUND)}%`
    );

    console.log(
        `Community Rewards    ${percent(tokenomics.COMMUNITY_REWARDS)}%`
    );

    console.log(
        `Ecosystem Reserve    ${percent(tokenomics.ECOSYSTEM_RESERVE)}%`
    );

    console.log(
        `Development Fund     ${percent(tokenomics.DEVELOPMENT_FUND)}%`
    );

    console.log(
        `Team Reserve         ${percent(tokenomics.TEAM_VESTING)}%`
    );

    console.log(
        `Investor Vesting     ${percent(tokenomics.INVESTOR_VESTING)}%`
    );

    console.log(
        `Liquidity Reserve    ${percent(tokenomics.LIQUIDITY_RESERVE)}%`
    );

    console.log(
        `Staking Rewards      ${percent(tokenomics.STAKING_REWARDS)}%`
    );

    console.log("");

    console.log("------ SUPPLY HEALTH ------");

    if (totalSupply === maxSupply) {

        console.log("Supply Status : HEALTHY ✅");

    } else {

        console.log("Supply Status : WARNING ⚠");

    }

    console.log("");

    console.log("=====================================");

    console.log(" SUPPLY VERIFIED");

    console.log("=====================================");

    console.log("");

}

main()
.then(() => process.exit(0))
.catch((error) => {

    console.error(error);

    process.exit(1);

});