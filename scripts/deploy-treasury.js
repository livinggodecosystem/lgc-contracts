const hre = require("hardhat");

async function main() {
console.log("========================================");
console.log("Deploying LGC Treasury...");
console.log("========================================");

```
const [deployer] = await hre.ethers.getSigners();

console.log("Deployer:", deployer.address);

// IMPORTANT:
// Replace this with your deployed LGC contract address.
const lgcAddress = "PASTE_LGC_ADDRESS_HERE";

// Replace these with your real treasury wallet addresses.
const ecosystemWallet = deployer.address;
const communityWallet = deployer.address;
const liquidityWallet = deployer.address;
const developmentWallet = deployer.address;
const reserveWallet = deployer.address;
const teamWallet = deployer.address;

const LGCTreasury = await hre.ethers.getContractFactory("LGCTreasury");

const treasury = await LGCTreasury.deploy(
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

console.log("----------------------------------------");
console.log("Treasury deployed successfully!");
console.log("----------------------------------------");

console.log("Treasury Address:");
console.log(await treasury.getAddress());

console.log("Transaction Hash:");
console.log(treasury.deploymentTransaction().hash);
```

}

main().catch((error) => {
console.error(error);
process.exitCode = 1;
});
