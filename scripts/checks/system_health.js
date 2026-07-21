const hre = require("hardhat");
const { ethers } = hre;

const fs = require("fs");
const path = require("path");

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
    // Contracts
    //-------------------------------------------------

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

    const ecosystemReserve =
        await ethers.getContractAt(
            "LGCTreasury",
            deployment.LGCTreasury
        );

    const startupFund =
        await ethers.getContractAt(
            "LGCVesting",
            deployment.LGCVesting
        );

    const teamVesting =
        await ethers.getContractAt(
            "LGCTeamVesting",
            deployment.LGCTeamVesting
        );

    const investorVesting =
        await ethers.getContractAt(
            "LGCInvestorVesting",
            deployment.LGCInvestorVesting
        );

    const staking =
        await ethers.getContractAt(
            "LGCStaking",
            deployment.LGCStaking
        );

    //-------------------------------------------------
    // Header
    //-------------------------------------------------

    console.log("");
    console.log("=====================================");
    console.log(" LIVING GOD ECOSYSTEM");
    console.log(" SYSTEM HEALTH CHECK");
    console.log("=====================================");
    console.log("");

    //-------------------------------------------------
    // Contract Status
    //-------------------------------------------------

    console.log(
        "Living God Coin      ✅",
        await lgc.getAddress()
    );

    console.log(
        "Launch Registry      ✅",
        await registry.getAddress()
    );

    console.log(
        "Ecosystem Reserve    ✅",
        await ecosystemReserve.getAddress()
    );

    console.log(
        "Startup Fund         ✅",
        await startupFund.getAddress()
    );

    console.log(
        "Team Vesting         ✅",
        await teamVesting.getAddress()
    );

    console.log(
        "Investor Vesting     ✅",
        await investorVesting.getAddress()
    );

    console.log(
        "Staking Rewards      ✅",
        await staking.getAddress()
    );

    //-------------------------------------------------
    // Balances
    //-------------------------------------------------

    console.log("");
    console.log("----------- BALANCES -----------");

    console.log(
        "Ecosystem Reserve:",
        ethers.formatUnits(
            await lgc.balanceOf(
                await ecosystemReserve.getAddress()
            ),
            18
        ),
        "LGC"
    );

    console.log(
        "Startup Fund:",
        ethers.formatUnits(
            await lgc.balanceOf(
                await startupFund.getAddress()
            ),
            18
        ),
        "LGC"
    );

    console.log(
        "Team Vesting:",
        ethers.formatUnits(
            await lgc.balanceOf(
                await teamVesting.getAddress()
            ),
            18
        ),
        "LGC"
    );

    console.log(
        "Investor Vesting:",
        ethers.formatUnits(
            await lgc.balanceOf(
                await investorVesting.getAddress()
            ),
            18
        ),
        "LGC"
    );

    console.log(
        "Staking Rewards:",
        ethers.formatUnits(
            await lgc.balanceOf(
                await staking.getAddress()
            ),
            18
        ),
        "LGC"
    );

    //-------------------------------------------------
    // Genesis Status
    //-------------------------------------------------

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

    //-------------------------------------------------
    // Footer
    //-------------------------------------------------

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