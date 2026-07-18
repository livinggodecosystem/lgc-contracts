const hre = require("hardhat");
const { ethers } = hre;

const fs = require("fs");
const path = require("path");

async function main() {

    //---------------------------------------
    // Load Deployment
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
    console.log(" LIVING GOD ECOSYSTEM");
    console.log(" GENESIS LAUNCH");
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

    //---------------------------------------
    // Launch Registry
    //---------------------------------------

    const registry =
        await ethers.getContractAt(
            "LGCLaunchRegistry",
            deployment.LGCLaunchRegistry
        );

    //---------------------------------------
    // Check Launch Status
    //---------------------------------------

    const alreadyActive =
        await registry.isLaunchActive();

    if (alreadyActive) {

        console.log("");

        console.log(
            "⚠ Ecosystem already activated."
        );

        const launchTime =
            await registry.ecosystemLaunchTime();

        const launchDate = new Date(
            Number(launchTime) * 1000
        );

        console.log(
            "Launch Time:",
            launchDate.toUTCString()
        );

        console.log("");

        return;
    }

    //---------------------------------------
    // Activate Launch
    //---------------------------------------

    console.log("");
    console.log(
        "Activating Living God Ecosystem..."
    );

    const tx =
        await registry.activateLaunch();

    await tx.wait();

    //---------------------------------------
    // Verify
    //---------------------------------------

    const active =
        await registry.isLaunchActive();

    const launchTime =
        await registry.ecosystemLaunchTime();

    const launchDate = new Date(
        Number(launchTime) * 1000
    );

    console.log("");

    console.log(
        "Launch Active:",
        active
    );

    console.log(
        "Launch Time:",
        launchDate.toUTCString()
    );

    console.log("");

    console.log("=====================================");
    console.log(" ECOSYSTEM ACTIVATED");
    console.log("=====================================");
    console.log("");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});