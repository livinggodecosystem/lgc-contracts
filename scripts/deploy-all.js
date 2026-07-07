const hre = require("hardhat");

async function main() {
console.log("========================================");
console.log("Living God Ecosystem Deployment");
console.log("========================================");

```
const [deployer] = await hre.ethers.getSigners();

console.log("Deployer:", deployer.address);

console.log(
    "Balance:",
    hre.ethers.formatEther(
        await hre.ethers.provider.getBalance(deployer.address)
    ),
    "ETH"
);

console.log("\nDeploying Living God Coin...");

const LivingGodCoin = await hre.ethers.getContractFactory("LivingGodCoin");
const lgc = await LivingGodCoin.deploy();

await lgc.waitForDeployment();

const lgcAddress = await lgc.getAddress();

console.log("LGC deployed:", lgcAddress);

console.log("\nDeploying Treasury...");

const LGCTreasury = await hre.ethers.getContractFactory("LGCTreasury");

const treasury = await LGCTreasury.deploy(
    deployer.address,
    lgcAddress,
    deployer.address,
    deployer.address,
    deployer.address,
    deployer.address,
    deployer.address,
    deployer.address
);

await treasury.waitForDeployment();

console.log("Treasury deployed:", await treasury.getAddress());

console.log("\n========================================");
console.log("Deployment Complete");
console.log("========================================");

console.log("Living God Coin:", lgcAddress);
console.log("Treasury:", await treasury.getAddress());

console.log("\nLGC Deployment TX:");
console.log(lgc.deploymentTransaction().hash);

console.log("\nTreasury Deployment TX:");
console.log(treasury.deploymentTransaction().hash);
```

}

main().catch((error) => {
console.error(error);
process.exitCode = 1;
});
