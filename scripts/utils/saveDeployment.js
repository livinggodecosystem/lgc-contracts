const fs = require("fs");
const path = require("path");

function saveDeployment(networkName, contracts) {

    const deploymentsDir = path.join(
        __dirname,
        "../../deployments"
    );

    if (!fs.existsSync(deploymentsDir)) {

        fs.mkdirSync(deploymentsDir, {
            recursive: true
        });

    }

    const filePath = path.join(
        deploymentsDir,
        `${networkName}.json`
    );

    fs.writeFileSync(

        filePath,

        JSON.stringify(
            contracts,
            null,
            4
        )

    );

    console.log(
        `\n✅ Deployment saved to:\n${filePath}`
    );

}

module.exports = {
    saveDeployment
};