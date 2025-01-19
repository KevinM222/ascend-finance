const hre = require("hardhat");

async function main() {
    // Define constructor arguments
    const feeRecipient = "0x274af9bd0fEe424e2cd0Fed72cc3f2cA49B751F1"; // Ascend-specific fee recipient address
    const initialOwner = "0x274af9bd0fEe424e2cd0Fed72cc3f2cA49B751F1"; // Initial owner address

    // Get the contract factory
    const ModularDEX = await hre.ethers.getContractFactory("ModularDEX");

    console.log("Deploying ModularDEX contract...");

    // Deploy the contract
    const modularDEX = await ModularDEX.deploy(feeRecipient, initialOwner);

    // Wait for the deployment to be mined
    await modularDEX.deployed();

    console.log("ModularDEX deployed to:", modularDEX.address);

    // Add initial tokens
    console.log("Adding initial tokens...");
    const tokenConfigs = [
        {
            symbol: "ASC",
            address: "0x4456b0f017f6bf9b0aa7a0ac3d3f224902a1937a", // ASC Token address
            priceFeed: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0" // Chainlink price feed address for POL/USD
        },
        {
            symbol: "POL",
            address: "0x3Ef815f827c71E2e1C1604870FedDEF6e9BA85Ac", // POL Token address
            priceFeed: "0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7" // Chainlink price feed address for USDC/USD
        },
        {
            symbol: "USDC",
            address: "0xADD81fF77b4Bd54259f0EB5f885862eF5920D165", // USDC Token address
            priceFeed: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6" // Chainlink price feed address for ETH/USD
        },
        {
            symbol: "ETH",
            address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // ETH address (Native token)
            priceFeed: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419" // Chainlink price feed address for LINK/USD
        },
        {
            symbol: "LINK",
            address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", // LINK Token address
            priceFeed: "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c" // Chainlink price feed address for LINK/USD
        }
    ];

    for (const token of tokenConfigs) {
        try {
            console.log(`Adding token: ${token.symbol}`);
            const tx = await modularDEX.addToken(token.symbol, token.address, token.priceFeed);
            await tx.wait();
            console.log(`Token ${token.symbol} added successfully!`);
        } catch (error) {
            console.error(`Error adding token ${token.symbol}:`, error.message);
        }
    }

    console.log("All tokens added successfully.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
