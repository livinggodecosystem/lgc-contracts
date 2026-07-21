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
    console.log(" FUND VESTING CONTRACTS");
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

    //-------------------------------------------------
    // Funding Amounts
    //-------------------------------------------------

    const startupAmount =
        ethers.parseUnits(
            tokenomics.STARTUP_FUND.toString(),
            18
        );

    const teamAmount =
        ethers.parseUnits(
            tokenomics.TEAM_VESTING.toString(),
            18
        );

    const investorAmount =
        ethers.parseUnits(
            tokenomics.INVESTOR_VESTING.toString(),
            18
        );

    //-------------------------------------------------
    // Fund Startup Fund
    //-------------------------------------------------

    console.log("");
    console.log(
        "Funding Startup Fund..."
    );

    await (
        await lgc.transfer(
            await startupFund.getAddress(),
            startupAmount
        )
    ).wait();

    //-------------------------------------------------
    // Fund Team Vesting
    //-------------------------------------------------

    console.log(
        "Funding Team Vesting..."
    );

    await (
        await lgc.transfer(
            await teamVesting.getAddress(),
            teamAmount
        )
    ).wait();

    //-------------------------------------------------
    // Fund Investor Vesting
    //-------------------------------------------------

    console.log(
        "Funding Investor Vesting..."
    );

    await (
        await lgc.transfer(
            await investorVesting.getAddress(),
            investorAmount
        )
    ).wait();

    //-------------------------------------------------
    // Display Balances
    //-------------------------------------------------

    const startupBalance =
        await lgc.balanceOf(
            await startupFund.getAddress()
        );

    const teamBalance =
        await lgc.balanceOf(
            await teamVesting.getAddress()
        );

    const investorBalance =
        await lgc.balanceOf(
            await investorVesting.getAddress()
        );

    console.log("");

    console.log(
        `Startup Fund: ${ethers.formatUnits(startupBalance, 18)} LGC`
    );

    console.log(
        `Team Vesting: ${ethers.formatUnits(teamBalance, 18)} LGC`
    );

    console.log(
        `Investor Vesting: ${ethers.formatUnits(investorBalance, 18)} LGC`
    );

    console.log("");

    console.log("=====================================");
    console.log(" VESTING CONTRACTS FUNDED");
    console.log("=====================================");
    console.log("");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });