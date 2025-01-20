const hre = require("hardhat");
const { ethers } = hre;
const fs = require('fs');
const prettier = require('prettier');

async function main() {
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const { network } = hre;

    console.log(`Deploying on ${network.name}`);

    const tokens = [
        { name: "Mock USD Coin", symbol: "USDC", supply: ethers.utils.parseUnits("1000000", 18) },
        { name: "Mock Polygon Token", symbol: "POL", supply: ethers.utils.parseUnits("1000000", 18) },
    ];

    const addresses = {};

    for (const token of tokens) {
        console.log(`Deploying ${token.name}...`);
        const mockToken = await MockERC20.deploy(token.name, token.symbol, token.supply);
        await mockToken.deployed();
        console.log(`${token.name} deployed to:`, mockToken.address);
        addresses[token.symbol] = mockToken.address;
    }

    // Format and save to JSON file
    try {
        const formattedAddresses = prettier.format(JSON.stringify(addresses), { parser: "json" });
        fs.writeFileSync('deployedAddresses.json', formattedAddresses);
        console.log("Addresses saved to deployedAddresses.json");
    } catch (err) {
        console.error("Error writing address file:", err);
        // Optionally, you might want to exit the script if this fails
        // process.exit(1);
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
        console.error(error.stack);
        process.exit(1);
    });