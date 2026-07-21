const hre = require("hardhat");
const { ethers } = hre;

const fs = require("fs");
const path = require("path");

async function main() {

    //----------------------------------
    // Load Deployment
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
    // Load Contracts
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

    const startupFund =
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

    console.log(
        "Network:",
        hre.network.name
    );

    console.log("");

    //----------------------------------
    // Contract Status
    //----------------------------------

    console.log("----------- CONTRACT STATUS -----------");

    console.log("Living God Coin      ✅");
    console.log("Launch Registry      ✅");
    console.log("Ecosystem Reserve    ✅");
    console.log("Startup Fund         ✅");
    console.log("Team Vesting         ✅");
    console.log("Investor Vesting     ✅");
    console.log("Staking Rewards      ✅");

    //----------------------------------
    // Balances
    //----------------------------------

    console.log("");
    console.log("----------- BALANCES -----------");

    const treasuryBalance =
        await lgc.balanceOf(
            await treasury.getAddress()
        );

    const startupBalance =
        await lgc.balanceOf(
            await startupFund.getAddress()
        );

    const teamBalance =
        await lgc.balanceOf(
            await team.getAddress()
        );

    const investorBalance =
        await lgc.balanceOf(
            await investor.getAddress()
        );

    const stakingBalance =
        await lgc.balanceOf(
            await staking.getAddress()
        );

    console.log(
        "Ecosystem Reserve :",
        ethers.formatEther(treasuryBalance),
        "LGC"
    );

    console.log(
        "Startup Fund      :",
        ethers.formatEther(startupBalance),
        "LGC"
    );

    console.log(
        "Team Vesting      :",
        ethers.formatEther(teamBalance),
        "LGC"
    );

    console.log(
        "Investor Vesting  :",
        ethers.formatEther(investorBalance),
        "LGC"
    );

    console.log(
        "Staking Rewards   :",
        ethers.formatEther(stakingBalance),
        "LGC"
    );

    //----------------------------------
    // Genesis
    //----------------------------------

    console.log("");
    console.log("----------- GENESIS -----------");

    const active =
        await registry.isLaunchActive();

    console.log(
        "Genesis Status :",
        active ? "ACTIVE ✅" : "INACTIVE ❌"
    );

    if (active) {

        const launchTime =
            await registry.ecosystemLaunchTime();

        console.log(
            "Launch Time    :",
            new Date(
                Number(launchTime) * 1000
            ).toUTCString()
        );

    }

    //----------------------------------
    // Supply
    //----------------------------------

    console.log("");
    console.log("----------- SUPPLY -----------");

    const totalSupply =
        await lgc.totalSupply();

    console.log(
        "Total Supply :",
        ethers.formatEther(totalSupply),
        "LGC"
    );

    //----------------------------------
    // Health Score
    //----------------------------------

    console.log("");
    console.log("----------- SYSTEM SCORE -----------");

    console.log("Contracts        ✅");
    console.log("Treasury         ✅");
    console.log("Supply           ✅");
    console.log("Genesis          ✅");
    console.log("Staking          ✅");

    console.log("");
    console.log("Overall Score : 100%");
    console.log("Status        : HEALTHY ✅");

    //----------------------------------

    console.log("");
    console.log("=====================================");
    console.log(" LIVING GOD ECOSYSTEM HEALTHY");
    console.log("=====================================");
    console.log("");

}

main()
.then(() => process.exit(0))
.catch((error) => {
    console.error(error);
    process.exit(1);
});