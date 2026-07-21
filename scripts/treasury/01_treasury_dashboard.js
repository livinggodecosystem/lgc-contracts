const hre = require("hardhat");
const { ethers } = hre;

const fs = require("fs");
const path = require("path");

async function main() {

    //-------------------------------------------------
    // Load Deployment
    //-------------------------------------------------

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

    //-------------------------------------------------
    // Contracts
    //-------------------------------------------------

    const lgc =
        await ethers.getContractAt(
            "LivingGodCoin",
            deployment.LivingGodCoin
        );

    //-------------------------------------------------
    // Network Configuration
    //-------------------------------------------------

    const config =
        require("../../config/networks.js");

    const network =
        config[hre.network.name];

    //-------------------------------------------------
    // Helper
    //-------------------------------------------------

    async function balance(address) {

        const wallet =
            address ===
            "0x0000000000000000000000000000000000000000"

                ? (await ethers.getSigners())[0].address

                : address;

        return Number(
            ethers.formatUnits(
                await lgc.balanceOf(wallet),
                18
            )
        );

    }

    //-------------------------------------------------
    // Wallet Balances
    //-------------------------------------------------

    const ecosystemReserve =
        await balance(network.ecosystemWallet);

    const communityRewards =
        await balance(network.communityWallet);

    const liquidityReserve =
        await balance(network.liquidityWallet);

    const developmentFund =
        await balance(network.developmentWallet);

    const investorVesting =
        await balance(network.reserveWallet);

    const teamVesting =
        await balance(network.teamWallet);

    //-------------------------------------------------
    // Total Supply
    //-------------------------------------------------

    const totalSupply =
        Number(
            ethers.formatUnits(
                await lgc.totalSupply(),
                18
            )
        );

    //-------------------------------------------------
    // Dashboard
    //-------------------------------------------------

    console.log("");
    console.log("=====================================");
    console.log(" LIVING GOD ECOSYSTEM");
    console.log(" ECOSYSTEM RESERVE DASHBOARD");
    console.log("=====================================");
    console.log("");

    console.log(
        "Network:",
        hre.network.name
    );

    console.log("");

    console.log(
        "Total Supply"
    );

    console.log(
        `${totalSupply.toLocaleString()} LGC`
    );

    console.log("");
    console.log("-------------------------------------");
    console.log(" Financial Allocation");
    console.log("-------------------------------------");

    console.log(
        "Ecosystem Reserve :",
        ecosystemReserve.toLocaleString(),
        "LGC"
    );

    console.log(
        "Community Rewards :",
        communityRewards.toLocaleString(),
        "LGC"
    );

    console.log(
        "Liquidity Reserve :",
        liquidityReserve.toLocaleString(),
        "LGC"
    );

    console.log(
        "Development Fund :",
        developmentFund.toLocaleString(),
        "LGC"
    );

    console.log(
        "Investor Vesting :",
        investorVesting.toLocaleString(),
        "LGC"
    );

    console.log(
        "Team Vesting      :",
        teamVesting.toLocaleString(),
        "LGC"
    );

    console.log("");

    console.log("=====================================");
    console.log(" Dashboard Complete");
    console.log("=====================================");
    console.log("");

}

main()
.then(() => process.exit(0))
.catch((err) => {
    console.error(err);
    process.exit(1);
});