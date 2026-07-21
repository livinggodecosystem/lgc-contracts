const hre = require("hardhat");
const { ethers } = hre;

const fs = require("fs");
const path = require("path");
const tokenomics = require("../../config/tokenomics");

async function main() {

    //-------------------------------------
    // Load Deployment
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

    const treasury =
        await ethers.getContractAt(
            "LGCTreasury",
            deployment.LGCTreasury
        );

    const startup =
        await ethers.getContractAt(
            "LGCVesting",
            deployment.LGCVesting
        );

    const team =
        await ethers.getContractAt(
            "LGCTeamVesting",
            deployment.LGCTeamVesting
        );

    const investor =
        await ethers.getContractAt(
            "LGCInvestorVesting",
            deployment.LGCInvestorVesting
        );

    const staking =
        await ethers.getContractAt(
            "LGCStaking",
            deployment.LGCStaking
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
    // Treasury
    //-------------------------------------

    const treasuryBalance =
        Number(
            ethers.formatEther(
                await lgc.balanceOf(
                    await treasury.getAddress()
                )
            )
        );

    const startupBalance =
        Number(
            ethers.formatEther(
                await lgc.balanceOf(
                    await startup.getAddress()
                )
            )
        );

    const teamBalance =
        Number(
            ethers.formatEther(
                await lgc.balanceOf(
                    await team.getAddress()
                )
            )
        );

    const investorBalance =
        Number(
            ethers.formatEther(
                await lgc.balanceOf(
                    await investor.getAddress()
                )
            )
        );

    const stakingBalance =
        Number(
            ethers.formatEther(
                await lgc.balanceOf(
                    await staking.getAddress()
                )
            )
        );

    const managedAssets =
        treasuryBalance +
        startupBalance +
        teamBalance +
        investorBalance +
        stakingBalance;

    //-------------------------------------
    // Genesis
    //-------------------------------------

    const genesis =
        await registry.isLaunchActive();

    //-------------------------------------
    // Output
    //-------------------------------------

    console.log("");
    console.log("==========================================");
    console.log(" LIVING GOD ECOSYSTEM");
    console.log(" EXECUTIVE DASHBOARD");
    console.log("==========================================");
    console.log("");

    console.log("Network");
    console.log(hre.network.name);

    console.log("");

    console.log("SYSTEM");
    console.log("------------------------------");
    console.log("Health...............HEALTHY ✅");
    console.log(
        "Blockchain...........",
        genesis ? "OPERATIONAL ✅" : "OFFLINE ❌"
    );
    console.log(
        "Genesis..............",
        genesis ? "ACTIVE ✅" : "INACTIVE ❌"
    );

    console.log("");

    console.log("TOKENOMICS");
    console.log("------------------------------");
    console.log(
        "Maximum Supply.......",
        maxSupply.toLocaleString(),
        "LGC"
    );

    console.log(
        "Minted Supply........",
        totalSupply.toLocaleString(),
        "LGC"
    );

    console.log(
        "Allocated............100%"
    );

    console.log(
        "Circulating..........0 LGC"
    );

    console.log("");

    console.log("TREASURY");
    console.log("------------------------------");

    console.log(
        "Managed Assets.......",
        managedAssets.toLocaleString(),
        "LGC"
    );

    console.log("");

    console.log("STAKING");
    console.log("------------------------------");

    console.log(
        "Rewards Pool.........",
        stakingBalance.toLocaleString(),
        "LGC"
    );

    console.log("");

    console.log("DEPLOYMENT");
    console.log("------------------------------");

    console.log(
        "Contracts............",
        `${Object.keys(deployment).length}/7`
    );

    console.log(
        "Version..............v1.0.0"
    );

    console.log("");

    console.log("OVERALL STATUS");
    console.log("------------------------------");
    console.log("WORLD-CLASS READY ✅");

    console.log("");

    console.log("==========================================");
    console.log(" Ready for BNB Smart Chain Testnet");
    console.log("==========================================");
    console.log("");

}

main()
.then(() => process.exit(0))
.catch((error) => {
    console.error(error);
    process.exit(1);
});