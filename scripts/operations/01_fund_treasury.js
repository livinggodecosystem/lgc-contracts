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
            `Deployment file not found:
${deploymentPath}`
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
    console.log(" FUND TREASURY");
    console.log("=====================================");
    console.log("");

    console.log(
        "Network:",
        hre.network.name
    );

    console.log(
        "Deployer:",
        deployer.address
    );

    //---------------------------------------
    // Contracts
    //---------------------------------------

    const lgc =
        await ethers.getContractAt(
            "LivingGodCoin",
            deployment.LivingGodCoin
        );
    

    const treasury =
        await ethers.getContractAt(
            "LGCTreasury",
            deployment.LGCTreasury
        );

    //---------------------------------------
    // Amount
    //---------------------------------------

    const amount =
        ethers.parseUnits(
            "1000000",
            18
        );

    console.log("");
    console.log(
        "Funding Treasury..."
    );

    //---------------------------------------
    // Transfer
    //---------------------------------------

    const tx =
        await lgc.transfer(
            await treasury.getAddress(),
            amount
        );

    await tx.wait();

    //---------------------------------------
    // Balance
    //---------------------------------------

    const balance =
        await lgc.balanceOf(
            await treasury.getAddress()
        );

    console.log("");
    console.log(
        "Treasury Balance:"
    );

    console.log(
        ethers.formatUnits(
            balance,
            18
        ),
        "LGC"
    );

    console.log("");
    console.log("=====================================");
    console.log(" Treasury Funded");
    console.log("=====================================");
    console.log("");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });