const { ethers } = require("hardhat");

async function main() {

    console.log("====================================");
    console.log("Deploying LGC Staking...");
    console.log("====================================");

    const [deployer] = await ethers.getSigners();

    console.log("Deployer:", deployer.address);

    const tokenAddress = process.env.LGC_TOKEN_ADDRESS;

    if (!tokenAddress) {
        throw new Error("LGC_TOKEN_ADDRESS is missing in .env");
    }

    const LGCStaking = await ethers.getContractFactory("LGCStaking");

    const staking = await LGCStaking.deploy(
        deployer.address,
        tokenAddress
    );

    await staking.waitForDeployment();

    console.log("");
    console.log("====================================");
    console.log("LGC Staking Deployed");
    console.log("====================================");
    console.log("Contract:", await staking.getAddress());
    console.log("Token:", tokenAddress);
    console.log("Owner:", deployer.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});