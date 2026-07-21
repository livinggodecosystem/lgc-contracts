const hre = require("hardhat");
const { ethers } = hre;

const {
    loadDeployment
} = require("../utils/loadDeployment");

const wallets = require("../../config/wallets");

async function main() {

    const deployment =
        loadDeployment(hre.network.name);

    const [deployer] =
        await ethers.getSigners();

    console.log("");
    console.log("=====================================");
    console.log(" Living God Ecosystem Verification");
    console.log("=====================================");
    console.log("");

    console.log(
        "Network:",
        hre.network.name
    );

    //-------------------------------------------------
    // Wallet Addresses
    //-------------------------------------------------

    const ecosystemWallet = wallets.ecosystemWallet;
    const communityWallet = wallets.communityWallet;
    const liquidityWallet = wallets.liquidityWallet;
    const developmentWallet = wallets.developmentWallet;
    const reserveWallet = wallets.reserveWallet;
    const teamWallet = wallets.teamWallet;

    //-------------------------------------------------
    // Verification Helper
    //-------------------------------------------------

    async function verifyContract(
        name,
        address,
        constructorArguments = []
    ) {

        console.log("");
        console.log(`Verifying ${name}...`);

        try {

            await hre.run("verify:verify", {

                address,

                constructorArguments

            });

            console.log(`✅ ${name} Verified`);

        } catch (error) {

            const message = error.message || "";

            if (
                message.includes("already been verified") ||
                message.includes("Already Verified")
            ) {

                console.log(`✓ ${name} Already Verified`);

            } else {

                console.log(`❌ ${name} Verification Failed`);
                console.log(message);

            }

        }

    }

    //-------------------------------------------------
    // Living God Coin
    //-------------------------------------------------

    await verifyContract(

        "LivingGodCoin",

        deployment.LivingGodCoin,

        []

    );

    //-------------------------------------------------
    // Launch Registry
    //-------------------------------------------------

    await verifyContract(

        "LGCLaunchRegistry",

        deployment.LGCLaunchRegistry,

        [

            deployer.address

        ]

    );

    //-------------------------------------------------
    // Treasury
    //-------------------------------------------------

    await verifyContract(

        "LGCTreasury",

        deployment.LGCTreasury,

        [

            deployer.address,

            deployment.LivingGodCoin,

            ecosystemWallet,

            communityWallet,

            liquidityWallet,

            developmentWallet,

            reserveWallet,

            teamWallet

        ]

    );

    //-------------------------------------------------
    // General Vesting
    //-------------------------------------------------

    await verifyContract(

        "LGCVesting",

        deployment.LGCVesting,

        [

            deployer.address,

            deployment.LivingGodCoin

        ]

    );

    //-------------------------------------------------
    // Team Vesting
    //-------------------------------------------------

    await verifyContract(

        "LGCTeamVesting",

        deployment.LGCTeamVesting,

        [

            deployer.address,

            deployment.LivingGodCoin,

            deployment.LGCLaunchRegistry,

            teamWallet

        ]

    );

    //-------------------------------------------------
    // Investor Vesting
    //-------------------------------------------------

    await verifyContract(

        "LGCInvestorVesting",

        deployment.LGCInvestorVesting,

        [

            deployer.address,

            deployment.LivingGodCoin,

            deployment.LGCLaunchRegistry

        ]

    );

    //-------------------------------------------------
    // Staking
    //-------------------------------------------------

    await verifyContract(

        "LGCStaking",

        deployment.LGCStaking,

        [

            deployer.address,

            deployment.LivingGodCoin

        ]

    );

    console.log("");
    console.log("=====================================");
    console.log(" Verification Complete");
    console.log("=====================================");
    console.log("");

}

main()
.then(() => process.exit(0))
.catch((error) => {

    console.error(error);

    process.exit(1);

});