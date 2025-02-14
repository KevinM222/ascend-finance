const hre = require("hardhat");
const fs = require("fs");
const prettier = require("prettier");

async function main() {
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const { network } = hre;

    console.log(`Deploying on ${network.name}`);

    const tokens = [
        { name: "Mock USD Coin", symbol: "USDC", decimals: 6, supply: hre.ethers.utils.parseUnits("1000000", 6) },
        { name: "Mock Polygon Token", symbol: "POL", decimals: 18, supply: hre.ethers.utils.parseUnits("1000000", 18) },
    ];

    const addresses = {};

    for (const token of tokens) {
        console.log(`Deploying ${token.name}...`);
        const mockToken = await MockERC20.deploy(token.name, token.symbol, token.decimals, token.supply);
        await mockToken.deployed();
        console.log(`${token.name} deployed to:`, mockToken.address);
        addresses[token.symbol] = mockToken.address;
    }

    // Save to JSON file
    const fileName = `deployedAddresses_${network.name}.json`;
    try {
        console.log("Preparing to save addresses...");

        // Create a JSON string
        const jsonString = JSON.stringify(addresses, null, 2);
        console.log("JSON stringified addresses:", jsonString);

        // Format using Prettier synchronously
        const formattedAddresses = prettier.format(jsonString, { parser: "json" });
        console.log("Formatted Addresses:", formattedAddresses);

        // Write the formatted string to file
        fs.writeFileSync(fileName, formattedAddresses, "utf8");
        console.log(`Addresses saved to ${fileName}`);
    } catch (err) {
        console.error("Error writing address file:", err);
    }

    return addresses;
}

main()
    .then((addresses) => {
        console.log("All tokens deployed successfully");
        console.log("Deployed addresses:", addresses);
        process.exit(0);
    })
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    });
