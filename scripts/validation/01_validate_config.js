const hre = require("hardhat");
const { ethers } = hre;

const wallets =
    require("../../config/wallets");

const tokenomics =
    require("../../config/tokenomics");

const networks =
    require("../../config/networks");

async function main() {

    console.log("");
    console.log("=====================================");
    console.log(" LGC PRE-FLIGHT VALIDATION");
    console.log("=====================================");
    console.log("");

    //-------------------------------------------------
    // Network Validation
    //-------------------------------------------------

    console.log(
        "Network:",
        hre.network.name
    );

    if (!networks[hre.network.name]) {

        throw new Error(
            `Unsupported network: ${hre.network.name}`
        );

    }

    console.log(
        "✓ Network configuration found"
    );

    //-------------------------------------------------
    // Deployer
    //-------------------------------------------------

    const [deployer] =
        await ethers.getSigners();

    //-------------------------------------------------
    // Wallet Validation
    //-------------------------------------------------

    console.log("");
    console.log("Checking wallets...");

    for (const [name, address] of Object.entries(wallets)) {

        const wallet =

            (!address ||
            address ===
            "0x0000000000000000000000000000000000000000")

                ? deployer.address

                : address;

        if (!ethers.isAddress(wallet)) {

            throw new Error(
                `Invalid wallet address for ${name}`
            );

        }

        console.log(`✓ ${name}`);

    }

    //-------------------------------------------------
    // Tokenomics Validation
    //-------------------------------------------------

    console.log("");
    console.log("Checking tokenomics...");

    let total = 0n;

    for (const [name, amount] of Object.entries(tokenomics)) {

        if (name === "MAX_SUPPLY")
            continue;

        total += amount;

        console.log(
            `${name}: ${amount.toLocaleString()} LGC`
        );

    }

    console.log("");

    console.log(
        "Allocated:",
        total.toLocaleString(),
        "LGC"
    );

    console.log(
        "Max Supply:",
        tokenomics.MAX_SUPPLY.toLocaleString(),
        "LGC"
    );

    if (total !== tokenomics.MAX_SUPPLY) {

        throw new Error(
            "Tokenomics allocation does not equal MAX_SUPPLY."
        );

    }

    console.log(
        "✓ Tokenomics verified"
    );

    //-------------------------------------------------
    // Deployer Validation
    //-------------------------------------------------

    console.log("");
    console.log("Checking operator...");

    console.log(
        "Address:",
        deployer.address
    );

    const balance =
        await ethers.provider.getBalance(
            deployer.address
        );

    console.log(
        "Balance:",
        ethers.formatEther(balance),
        "ETH"
    );

    if (balance === 0n) {

        throw new Error(
            "Operator wallet has zero balance."
        );

    }

    console.log(
        "✓ Operator funded"
    );

    //-------------------------------------------------
    // Success
    //-------------------------------------------------

    console.log("");
    console.log("=====================================");
    console.log(" PRE-FLIGHT PASSED");
    console.log("=====================================");
    console.log("");

}

main()
.then(() => process.exit(0))
.catch((error) => {

    console.error(error);

    process.exit(1);

});