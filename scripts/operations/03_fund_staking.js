const hre = require("hardhat");
const { ethers } = hre;

const fs = require("fs");
const path = require("path");

async function main() {

    //---------------------------------------
    // Load Deployment Addresses
    //---------------------------------------

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

    //---------------------------------------
    // Accounts
    //---------------------------------------

    const [deployer] =
        await ethers.getSigners();

    console.log("");
    console.log("=====================================");
    console.log(" FUND STAKING");
    console.log("=====================================");
    console.log("");

    console.log("Network:", hre.network.name);
    console.log("Deployer:", deployer.address);

    //---------------------------------------
    // Contracts
    //---------------------------------------

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

    //---------------------------------------
    // Funding Amount
    //---------------------------------------

    const amount =
        ethers.parseUnits(
            "2000000",
            18
        );

    console.log("");
    console.log("Funding Staking...");

    //---------------------------------------
    // Transfer
    //---------------------------------------

    const tx =
        await lgc.transfer(
            await staking.getAddress(),
            amount
        );

    await tx.wait();

    //---------------------------------------
    // Balance
    //---------------------------------------

    const balance =
        await lgc.balanceOf(
            await staking.getAddress()
        );

    console.log("");

    console.log(
        "Staking Balance:",
        ethers.formatUnits(
            balance,
            18
        ),
        "LGC"
    );

    console.log("");
    console.log("=====================================");
    console.log(" STAKING FUNDED");
    console.log("=====================================");
    console.log("");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });