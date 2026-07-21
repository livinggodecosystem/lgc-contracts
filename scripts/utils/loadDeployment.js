const fs = require("fs");
const path = require("path");

function loadDeployment(networkName) {

    const filePath = path.join(
        __dirname,
        "../../deployments",
        `${networkName}.json`
    );

    //-------------------------------------------------
    // Existing deployment
    //-------------------------------------------------

    if (fs.existsSync(filePath)) {

        console.log("");
        console.log("📂 Existing deployment found.");

        return JSON.parse(
            fs.readFileSync(
                filePath,
                "utf8"
            )
        );

    }

    //-------------------------------------------------
    // Fresh deployment
    //-------------------------------------------------

    console.log("");
    console.log("📂 Starting fresh deployment.");

    return {};

}

module.exports = {
    loadDeployment
};