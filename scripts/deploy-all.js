const hre = require("hardhat");

async function main() {
    console.log("==================================================");
    console.log("        LIVING GOD ECOSYSTEM DEPLOYMENT");
    console.log("==================================================");

    const [deployer] = await hre.ethers.getSigners();

    console.log("\nNetwork:", hre.network.name);
    console.log("Deployer:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);

    console.log(
        "Balance:",
        hre.ethers.formatEther(balance),
        "ETH"
    );

    console.log("\nDeploying Living God Coin...");

    const LivingGodCoin =
        await hre.ethers.getContractFactory("LivingGodCoin");

    const lgc = await LivingGodCoin.deploy();

    await lgc.waitForDeployment();

    const lgcAddress = await lgc.getAddress();

    console.log("✅ Living God Coin deployed");
    console.log("Address:", lgcAddress);

    console.log("\nDeploying Treasury...");

    const LGCTreasury =
        await hre.ethers.getContractFactory("LGCTreasury");

    const treasury = await LGCTreasury.deploy(
        deployer.address,
        lgcAddress,
        deployer.address,
        deployer.address,
        deployer.address,
        deployer.address,
        deployer.address,
        deployer.address
    );

    await treasury.waitForDeployment();

    const treasuryAddress =
        await treasury.getAddress();

    console.log("✅ Treasury deployed");
    console.log("Address:", treasuryAddress);

    console.log("\nFunding Treasury...");

    const treasuryAllocation =
        15_000_000n * 10n ** 18n;

    const fundingTx =
        await lgc.transfer(
            treasuryAddress,
            treasuryAllocation
        );

    await fundingTx.wait();

    console.log("✅ Treasury funded");

    const treasuryBalance =
        await lgc.balanceOf(treasuryAddress);

    console.log(
        "Treasury Balance:",
        hre.ethers.formatUnits(
            treasuryBalance,
            18
        ),
        "LGC"
    );

    console.log("\n==================================================");
    console.log("DEPLOYMENT COMPLETE");
    console.log("==================================================");

    console.log("Living God Coin:");
    console.log(lgcAddress);

    console.log("\nTreasury:");
    console.log(treasuryAddress);

    console.log("\nLGC Deployment TX:");
    console.log(
        lgc.deploymentTransaction().hash
    );

    console.log("\nTreasury Deployment TX:");
    console.log(
        treasury.deploymentTransaction().hash
    );

    console.log("\nTreasury Funding TX:");
    console.log(
        fundingTx.hash
    );

    console.log("\n==================================================");
    console.log("Living God Ecosystem Successfully Deployed");
    console.log("==================================================");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});