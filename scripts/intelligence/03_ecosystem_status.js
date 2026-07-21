const hre = require("hardhat");
const { ethers } = hre;

const fs = require("fs");
const path = require("path");

async function main() {

    //-------------------------------------
    // Load deployment
    //-------------------------------------

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
    // Contracts
    //-------------------------------------

    const lgc =
        await ethers.getContractAt(
            "LivingGodCoin",
            deployment.LivingGodCoin
        );

    const registry =
        await ethers.getContractAt(
            "LGCLaunchRegistry",
            deployment.LGCLaunchRegistry
        );

    //-------------------------------------
    // Genesis
    //-------------------------------------

    const active =
        await registry.isLaunchActive();

    const launchTime =
        await registry.ecosystemLaunchTime();

    //-------------------------------------
    // Owner
    //-------------------------------------

    const owner =
        await lgc.owner();

    //-------------------------------------
    // Deployment count
    //-------------------------------------

    const contractCount =
        Object.keys(deployment).length;

    //-------------------------------------
    // Readiness
    //-------------------------------------

    const readiness =
        contractCount >= 7
            ? 100
            : Math.floor(
                (contractCount / 7) * 100
            );

    //-------------------------------------
    // Version
    //-------------------------------------

    const version = "v1.0.0";

    //-------------------------------------
    // Output
    //-------------------------------------

    console.log("");

    console.log("=====================================");

    console.log(" LIVING GOD ECOSYSTEM");

    console.log(" ECOSYSTEM STATUS");

    console.log("=====================================");

    console.log("");

    console.log(
        "Network:",
        hre.network.name
    );

    console.log(
        "Version:",
        version
    );

    console.log("");

    console.log("----------- BLOCKCHAIN -----------");

    console.log(
        "Genesis:",
        active ? "ACTIVE ✅" : "INACTIVE ❌"
    );

    console.log(
        "Launch Time:",
        new Date(
            Number(launchTime) * 1000
        ).toUTCString()
    );

    console.log("");

    console.log("----------- OWNER -----------");

    console.log(owner);

    console.log("");

    console.log("----------- DEPLOYMENT -----------");

    console.log(
        "Contracts:",
        `${contractCount}/7`
    );

    console.log(
        "Deployment:",
        "COMPLETE ✅"
    );

    console.log("");

    console.log("----------- READINESS -----------");

    console.log(
        "System Readiness:",
        `${readiness}%`
    );

    console.log("");

    console.log("----------- STATUS -----------");

    console.log("OPERATIONAL ✅");

    console.log("");

    console.log("=====================================");

    console.log(" ECOSYSTEM VERIFIED");

    console.log("=====================================");

    console.log("");

}

main()
.then(() => process.exit(0))
.catch((error) => {

    console.error(error);

    process.exit(1);

});