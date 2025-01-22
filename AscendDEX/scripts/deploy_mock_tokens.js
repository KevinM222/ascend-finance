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

    // Format and save to JSON file
    const fileName = `deployedAddresses_${network.name}.json`;
    try {
        const jsonString = JSON.stringify(addresses, null, 2); // Create a JSON string
        const formattedAddresses = prettier.format(jsonString, { parser: "json" }); // Synchronous formatting
        fs.writeFileSync(fileName, formattedAddresses, "utf8"); // Write to file
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
