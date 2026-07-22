const sdk = require("../../sdk");

async function main() {

    console.log("");

    console.log("=====================================");
    console.log(" Living God SDK");
    console.log("=====================================");

    console.log("");

    console.log(

        "Token:",

        await sdk.token.name()

    );

    console.log(

        "Symbol:",

        await sdk.token.symbol()

    );

    console.log(

        "Total Supply:",

        await sdk.token.totalSupply()

    );

    console.log(

        "Total Pools:",

        await sdk.staking.totalPools()

    );

    console.log(
    "Launch Active:",
    await sdk.registry.isLaunchActive()
     );

    console.log("");

    console.log("=====================================");
    console.log(" SDK READY");
    console.log("=====================================");

}

main()
.then(()=>process.exit(0))
.catch(console.error);