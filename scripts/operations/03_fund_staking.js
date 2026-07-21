const hre = require("hardhat");
const { ethers } = hre;

const fs = require("fs");
const path = require("path");

const tokenomics =
    require("../../config/tokenomics");

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
    // Accounts
    //-------------------------------------------------

    const [deployer] =
        await ethers.getSigners();

    console.log("");
    console.log("=====================================");
    console.log(" FUND STAKING REWARDS");
    console.log("=====================================");
    console.log("");

    console.log(
        "Network:",
        hre.network.name
    );

    console.log(
        "Operator:",
        deployer.address
    );

    //-------------------------------------------------
    // Contracts
    //-------------------------------------------------

    const lgc =
        await ethers.getContractAt(
            "LivingGodCoin",
            deployment.LivingGodCoin
        );

    const staking =
        await ethers.getContractAt(
            "LGCStaking",
            deployment.LGCStaking
        );

    //-------------------------------------------------
    // Funding Amount
    //-------------------------------------------------

    const amount =
        ethers.parseUnits(
            tokenomics.STAKING_REWARDS.toString(),
            18
        );

    console.log("");
    console.log(
        "Funding Staking Rewards..."
    );

    //-------------------------------------------------
    // Transfer
    //-------------------------------------------------

    const tx =
        await lgc.transfer(
            await staking.getAddress(),
            amount
        );

    await tx.wait();

    //-------------------------------------------------
    // Verify Balance
    //-------------------------------------------------

    const balance =
        await lgc.balanceOf(
            await staking.getAddress()
        );

    console.log("");

    console.log(
        "Staking Rewards Balance:"
    );

    console.log(
        `${ethers.formatUnits(balance, 18)} LGC`
    );

    console.log("");

    console.log("=====================================");
    console.log(" STAKING REWARDS FUNDED");
    console.log("=====================================");
    console.log("");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });