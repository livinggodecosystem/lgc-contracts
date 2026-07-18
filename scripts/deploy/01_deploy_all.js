const hre = require("hardhat");
const { ethers } = hre;

const {
    saveDeployment
} = require("../utils/saveDeployment");

async function main() {

    //-------------------------------------------------
    // Accounts
    //-------------------------------------------------

    const [deployer] =
        await ethers.getSigners();

    console.log("");
    console.log("=====================================");
    console.log(" Living God Ecosystem Deployment");
    console.log("=====================================");
    console.log("");

    console.log(
        "Network:",
        hre.network.name
    );

    console.log(
        "Deployer:",
        deployer.address
    );

    //-------------------------------------------------
    // Temporary Wallets
    //-------------------------------------------------

    const ecosystemWallet =
        deployer.address;

    const communityWallet =
        deployer.address;

    const liquidityWallet =
        deployer.address;

    const developmentWallet =
        deployer.address;

    const reserveWallet =
        deployer.address;

    const teamWallet =
        deployer.address;

    //-------------------------------------------------
    // Deployment Object
    //-------------------------------------------------

    const deployment = {};

    //-------------------------------------------------
// Deploy Living God Coin
//-------------------------------------------------

console.log("");
console.log("Deploying Living God Coin...");

const LivingGodCoin =
    await ethers.getContractFactory(
        "LivingGodCoin"
    );

const lgc =
    await LivingGodCoin.deploy();

await lgc.waitForDeployment();

const lgcAddress =
    await lgc.getAddress();

deployment.LivingGodCoin =
    lgcAddress;

console.log(
    "Living God Coin:",
    lgcAddress
);

//-------------------------------------------------
// Deploy Launch Registry
//-------------------------------------------------

console.log("");
console.log("Deploying Launch Registry...");

const LGCLaunchRegistry =
    await ethers.getContractFactory(
        "LGCLaunchRegistry"
    );

const launchRegistry =
    await LGCLaunchRegistry.deploy(
        deployer.address
    );

await launchRegistry.waitForDeployment();

const launchRegistryAddress =
    await launchRegistry.getAddress();

deployment.LGCLaunchRegistry =
    launchRegistryAddress;

console.log(
    "Launch Registry:",
    launchRegistryAddress
);

//-------------------------------------------------
// Deploy Treasury
//-------------------------------------------------

console.log("");
console.log("Deploying Treasury...");

const LGCTreasury =
    await ethers.getContractFactory(
        "LGCTreasury"
    );

const treasury =
    await LGCTreasury.deploy(

        deployer.address,

        lgcAddress,

        ecosystemWallet,

        communityWallet,

        liquidityWallet,

        developmentWallet,

        reserveWallet,

        teamWallet

    );

await treasury.waitForDeployment();

const treasuryAddress =
    await treasury.getAddress();

deployment.LGCTreasury =
    treasuryAddress;

console.log(
    "Treasury:",
    treasuryAddress
);

//-------------------------------------------------
// Deploy General Vesting
//-------------------------------------------------

console.log("");
console.log("Deploying General Vesting...");

const LGCVesting =
    await ethers.getContractFactory(
        "LGCVesting"
    );

const vesting =
    await LGCVesting.deploy(

        deployer.address,

        lgcAddress

    );

await vesting.waitForDeployment();

const vestingAddress =
    await vesting.getAddress();

deployment.LGCVesting =
    vestingAddress;

console.log(
    "General Vesting:",
    vestingAddress
);

//-------------------------------------------------
// Deploy Team Vesting
//-------------------------------------------------

console.log("");
console.log("Deploying Team Vesting...");

const LGCTeamVesting =
    await ethers.getContractFactory(
        "LGCTeamVesting"
    );

const teamVesting =
    await LGCTeamVesting.deploy(

        deployer.address,

        lgcAddress,

        launchRegistryAddress,

        teamWallet

    );

await teamVesting.waitForDeployment();

const teamVestingAddress =
    await teamVesting.getAddress();

deployment.LGCTeamVesting =
    teamVestingAddress;

console.log(
    "Team Vesting:",
    teamVestingAddress
);

//-------------------------------------------------
// Deploy Investor Vesting
//-------------------------------------------------

console.log("");
console.log("Deploying Investor Vesting...");

const LGCInvestorVesting =
    await ethers.getContractFactory(
        "LGCInvestorVesting"
    );

const investorVesting =
    await LGCInvestorVesting.deploy(

        deployer.address,

        lgcAddress,

        launchRegistryAddress

    );

await investorVesting.waitForDeployment();

const investorVestingAddress =
    await investorVesting.getAddress();

deployment.LGCInvestorVesting =
    investorVestingAddress;

console.log(
    "Investor Vesting:",
    investorVestingAddress
);

//-------------------------------------------------
// Deploy Staking
//-------------------------------------------------

console.log("");
console.log("Deploying Staking...");

const LGCStaking =
    await ethers.getContractFactory(
        "LGCStaking"
    );

const staking =
    await LGCStaking.deploy(

        deployer.address,

        lgcAddress

    );

await staking.waitForDeployment();

const stakingAddress =
    await staking.getAddress();

deployment.LGCStaking =
    stakingAddress;

console.log(
    "Staking:",
    stakingAddress
);

//-------------------------------------------------
// Save Deployment
//-------------------------------------------------

await saveDeployment(
    hre.network.name,
    deployment
);

//-------------------------------------------------
// Deployment Summary
//-------------------------------------------------

console.log("");
console.log("=====================================");
console.log(" LIVING GOD ECOSYSTEM DEPLOYED");
console.log("=====================================");
console.log("");

for (const [name, address] of Object.entries(deployment)) {
    console.log(`${name}: ${address}`);
}

console.log("");
console.log("=====================================");
console.log(" Deployment Complete");
console.log("=====================================");
console.log("");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });