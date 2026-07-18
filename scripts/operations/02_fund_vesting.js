const hre = require("hardhat");
const { ethers } = hre;

const fs = require("fs");
const path = require("path");

async function main() {

    //---------------------------------------
    // Load Deployment Addresses
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
    console.log(" FUND VESTING CONTRACTS");
    console.log("=====================================");
    console.log("");

    console.log("Network:", hre.network.name);
    console.log("Deployer:", deployer.address);

    //---------------------------------------
    // Contracts
    //---------------------------------------

    const lgc =
        await ethers.getContractAt(
            "LivingGodCoin",
            deployment.LivingGodCoin
        );

    const generalVesting =
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

    //---------------------------------------
    // Funding Amounts
    //---------------------------------------

    const generalAmount =
        ethers.parseUnits("2000000", 18);

    const teamAmount =
        ethers.parseUnits("1000000", 18);

    const investorAmount =
        ethers.parseUnits("3000000", 18);

    //---------------------------------------
    // Fund General Vesting
    //---------------------------------------

    console.log("");
    console.log("Funding General Vesting...");

    await (
        await lgc.transfer(
            await generalVesting.getAddress(),
            generalAmount
        )
    ).wait();

    //---------------------------------------
    // Fund Team Vesting
    //---------------------------------------

    console.log("Funding Team Vesting...");

    await (
        await lgc.transfer(
            await teamVesting.getAddress(),
            teamAmount
        )
    ).wait();

    //---------------------------------------
    // Fund Investor Vesting
    //---------------------------------------

    console.log("Funding Investor Vesting...");

    await (
        await lgc.transfer(
            await investorVesting.getAddress(),
            investorAmount
        )
    ).wait();

    //---------------------------------------
    // Display Balances
    //---------------------------------------

    const generalBalance =
        await lgc.balanceOf(
            await generalVesting.getAddress()
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
        "General Vesting:",
        ethers.formatUnits(generalBalance, 18),
        "LGC"
    );

    console.log(
        "Team Vesting:",
        ethers.formatUnits(teamBalance, 18),
        "LGC"
    );

    console.log(
        "Investor Vesting:",
        ethers.formatUnits(investorBalance, 18),
        "LGC"
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