const hre = require("hardhat");

async function main() {
console.log("========================================");
console.log("Deploying Living God Coin...");
console.log("========================================");

```
const [deployer] = await hre.ethers.getSigners();

console.log("Deploying with account:");
console.log(deployer.address);

console.log(
    "Account balance:",
    hre.ethers.formatEther(
        await hre.ethers.provider.getBalance(deployer.address)
    ),
    "ETH"
);

const LivingGodCoin = await hre.ethers.getContractFactory(
    "LivingGodCoin"
);

const lgc = await LivingGodCoin.deploy();

await lgc.waitForDeployment();

console.log("----------------------------------------");
console.log("Living God Coin deployed successfully!");
console.log("----------------------------------------");

console.log("Contract Address:");
console.log(await lgc.getAddress());

console.log("Transaction Hash:");
console.log(lgc.deploymentTransaction().hash);

console.log("----------------------------------------");
```

}

main().catch((error) => {
console.error(error);
process.exitCode = 1;
});
