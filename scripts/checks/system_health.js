const hre = require("hardhat");
const { ethers } = hre;

const fs = require("fs");
const path = require("path");

async function main() {

    //----------------------------------
    // Load deployment file
    //----------------------------------

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

    //----------------------------------
    // Load contracts
    //----------------------------------

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

    const vesting =
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

    //----------------------------------
    // Header
    //----------------------------------

    console.log("");
    console.log("=====================================");
    console.log(" LIVING GOD ECOSYSTEM");
    console.log(" SYSTEM HEALTH CHECK");
    console.log("=====================================");
    console.log("");

    //----------------------------------
    // Contract availability
    //----------------------------------

    console.log(
        "Living God Coin      ✅",
        await lgc.getAddress()
    );

    console.log(
        "Launch Registry      ✅",
        await registry.getAddress()
    );

    console.log(
        "Treasury             ✅",
        await treasury.getAddress()
    );

    console.log(
        "General Vesting      ✅",
        await vesting.getAddress()
    );

    console.log(
        "Team Vesting         ✅",
        await team.getAddress()
    );

    console.log(
        "Investor Vesting     ✅",
        await investor.getAddress()
    );

    console.log(
        "Staking              ✅",
        await staking.getAddress()
    );

    //----------------------------------
    // Balances
    //----------------------------------

    console.log("");
    console.log("----------- BALANCES -----------");

    console.log(
        "Treasury:",
        ethers.formatEther(
            await lgc.balanceOf(
                await treasury.getAddress()
            )
        ),
        "LGC"
    );

    console.log(
        "General Vesting:",
        ethers.formatEther(
            await lgc.balanceOf(
                await vesting.getAddress()
            )
        ),
        "LGC"
    );

    console.log(
        "Team Vesting:",
        ethers.formatEther(
            await lgc.balanceOf(
                await team.getAddress()
            )
        ),
        "LGC"
    );

    console.log(
        "Investor Vesting:",
        ethers.formatEther(
            await lgc.balanceOf(
                await investor.getAddress()
            )
        ),
        "LGC"
    );

    console.log(
        "Staking:",
        ethers.formatEther(
            await lgc.balanceOf(
                await staking.getAddress()
            )
        ),
        "LGC"
    );

    //----------------------------------
    // Launch Status
    //----------------------------------

    console.log("");
    console.log("----------- GENESIS -----------");

    const active =
        await registry.isLaunchActive();

    console.log(
        "Genesis Active:",
        active ? "YES ✅" : "NO ❌"
    );

    if (active) {

        const launchTime =
            await registry.ecosystemLaunchTime();

        console.log(
            "Launch Time:",
            new Date(
                Number(launchTime) * 1000
            ).toUTCString()
        );
    }

    //----------------------------------
    // Footer
    //----------------------------------

    console.log("");
    console.log("=====================================");
    console.log(" SYSTEM HEALTHY");
    console.log("=====================================");
    console.log("");
}

main()
.then(() => process.exit(0))
.catch((error) => {
    console.error(error);
    process.exit(1);
});