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
    console.log(" FUND ECOSYSTEM RESERVE");
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

    const ecosystemReserve =
        await ethers.getContractAt(
            "LGCTreasury",
            deployment.LGCTreasury
        );

    //-------------------------------------------------
    // Amount
    //-------------------------------------------------

    const amount =
        ethers.parseUnits(
            tokenomics.ECOSYSTEM_RESERVE.toString(),
            18
        );

    console.log("");
    console.log(
        "Funding Ecosystem Reserve..."
    );

    //-------------------------------------------------
    // Transfer
    //-------------------------------------------------

    const tx =
        await lgc.transfer(
            await ecosystemReserve.getAddress(),
            amount
        );

    await tx.wait();

    //-------------------------------------------------
    // Verify Balance
    //-------------------------------------------------

    const balance =
        await lgc.balanceOf(
            await ecosystemReserve.getAddress()
        );

    console.log("");

    console.log(
        "Ecosystem Reserve Balance:"
    );

    console.log(
        `${ethers.formatUnits(balance, 18)} LGC`
    );

    console.log("");

    console.log("=====================================");
    console.log(" ECOSYSTEM RESERVE FUNDED");
    console.log("=====================================");
    console.log("");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });