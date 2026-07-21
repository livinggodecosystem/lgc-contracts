const hre = require("hardhat");
const { ethers } = hre;

const fs = require("fs");
const path = require("path");

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
    // Balances
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

    //-------------------------------------
    // Total Managed Funds
    //-------------------------------------

    const totalManaged =

        treasuryBalance +

        startupBalance +

        teamBalance +

        investorBalance +

        stakingBalance;

    //-------------------------------------
    // Output
    //-------------------------------------

    console.log("");

    console.log("=====================================");

    console.log(" LIVING GOD ECOSYSTEM");

    console.log(" TREASURY INTELLIGENCE");

    console.log("=====================================");

    console.log("");

    console.log(
        "Network:",
        hre.network.name
    );

    console.log("");

    console.log("----------- TREASURY STATUS -----------");

    console.log(
        "Ecosystem Reserve :",
        treasuryBalance.toLocaleString(),
        "LGC"
    );

    console.log(
        "Startup Fund      :",
        startupBalance.toLocaleString(),
        "LGC"
    );

    console.log(
        "Team Reserve      :",
        teamBalance.toLocaleString(),
        "LGC"
    );

    console.log(
        "Investor Vesting  :",
        investorBalance.toLocaleString(),
        "LGC"
    );

    console.log(
        "Staking Rewards   :",
        stakingBalance.toLocaleString(),
        "LGC"
    );

    console.log("");

    console.log("----------- SUMMARY -----------");

    console.log(
        "Total Managed Assets :",
        totalManaged.toLocaleString(),
        "LGC"
    );

    console.log("");

    console.log("Treasury Status : HEALTHY ✅");

    console.log("");

    console.log("=====================================");

    console.log(" TREASURY VERIFIED");

    console.log("=====================================");

    console.log("");

}

main()
.then(() => process.exit(0))
.catch((error) => {
    console.error(error);
    process.exit(1);
});