const fs = require("fs");
const path = require("path");

function loadDeployment(networkName) {

    const filePath = path.join(
        __dirname,
        "../../deployments",
        `${networkName}.json`
    );

    if (!fs.existsSync(filePath)) {

        throw new Error(
            `Deployment file not found for network: ${networkName}`
        );

    }

    return JSON.parse(

        fs.readFileSync(
            filePath,
            "utf8"
        )

    );

}

module.exports = {
    loadDeployment
};