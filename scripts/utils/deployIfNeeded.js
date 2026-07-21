const { saveDeployment } = require("./saveDeployment");

async function deployIfNeeded({

    name,
    deployment,
    network,
    contractFactory,
    constructorArgs = []

}) {

    //-------------------------------------------------
    // Already deployed?
    //-------------------------------------------------

    if (deployment[name]) {

        console.log(`✓ ${name} already deployed`);

        return deployment[name];

    }

    //-------------------------------------------------
    // Deploy
    //-------------------------------------------------

    console.log("");
    console.log(`Deploying ${name}...`);

    const contract =
        await contractFactory.deploy(
            ...constructorArgs
        );

    await contract.waitForDeployment();

    const address =
        await contract.getAddress();

    deployment[name] = address;

    //-------------------------------------------------
    // Save immediately
    //-------------------------------------------------

    await saveDeployment(
        network,
        deployment
    );

    console.log(`${name}: ${address}`);

    return address;

}

module.exports = {
    deployIfNeeded
};