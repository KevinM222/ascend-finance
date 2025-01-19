const { ethers } = require("hardhat");

async function main() {
    console.log("Starting deployment process...");

    // Get the account to deploy from
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying contract with account: ${deployer.address}`);

    // Log deployer's initial balance
    const initialBalance = await ethers.provider.getBalance(deployer.address);
    console.log(`Deployer initial balance: ${ethers.utils.formatEther(initialBalance)} ETH`);

    // Get current nonce
    const nonce = await ethers.provider.getTransactionCount(deployer.address, "latest");
    console.log(`Using nonce: ${nonce}`);

    // Get gas price dynamically with fallback
    let gasPrice = await ethers.provider.getGasPrice();
    if (gasPrice.isZero()) {
        console.log("Gas price reported as 0. Using fallback gas price.");
        gasPrice = ethers.utils.parseUnits("10", "gwei"); // Fallback gas price: 10 gwei
    }
    console.log(`Using Gas Price: ${ethers.utils.formatUnits(gasPrice, "gwei")} gwei`);

    // Deploy Mock Tokens
    console.log("Deploying Mock Tokens...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");

    const token1 = await MockERC20.deploy("Mock Token 1", "MT1", ethers.utils.parseUnits("100000", 18));
    await token1.deployed();
    console.log("Token1 Address:", token1.address);

    const token2_POL = await MockERC20.deploy("Mock Token 2", "MT2", ethers.utils.parseUnits("100000", 18));
    await token2_POL.deployed();
    console.log("Token2_POL Address:", token2_POL.address);

    const token2_USDC = await MockERC20.deploy("Mock Token 3", "MT3", ethers.utils.parseUnits("100000", 18));
    await token2_USDC.deployed();
    console.log("Token2_USDC Address:", token2_USDC.address);

    // Deploy Mock Price Feeds
    console.log("Deploying Mock Price Feeds...");
    const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");

    const priceFeed_POL = await MockPriceFeed.deploy(
        8,                                  // Decimals
        "Mock POL/USD Price Feed",          // Description
        1,                                  // Version
        ethers.utils.parseUnits("1", 8)     // Initial Price
    );
    await priceFeed_POL.deployed();
    console.log("PriceFeed_POL Address:", priceFeed_POL.address);

    const priceFeed_USDC = await MockPriceFeed.deploy(
        8,                                  // Decimals
        "Mock USDC/USD Price Feed",         // Description
        1,                                  // Version
        ethers.utils.parseUnits("1", 8)     // Initial Price
    );
    await priceFeed_USDC.deployed();
    console.log("PriceFeed_USDC Address:", priceFeed_USDC.address);

    // Deploy AscendDEX Contract
    console.log("Deploying AscendDEX Contract...");
    const AscendDEX = await ethers.getContractFactory("AscendDEX");

    try {
        const ascendDEX = await AscendDEX.deploy(
            token1.address,           // _token1
            token2_POL.address,       // _token2_POL
            token2_USDC.address,      // _token2_USDC
            priceFeed_POL.address,    // _priceFeed_POL
            priceFeed_USDC.address,   // _priceFeed_USDC
            deployer.address          // initialOwner
        );
        await ascendDEX.deployed();
        console.log("AscendDEX Address:", ascendDEX.address);

        // Post-Deployment Validation
        console.log("Validating contract state...");
        const token1Address = await ascendDEX.token1();
        const token2POLAddress = await ascendDEX.token2_POL();
        const token2USDCAddress = await ascendDEX.token2_USDC();
        const ownerAddress = await ascendDEX.owner();

        if (
            token1Address === token1.address &&
            token2POLAddress === token2_POL.address &&
            token2USDCAddress === token2_USDC.address &&
            ownerAddress === deployer.address
        ) {
            console.log("Validation complete. Contract is correctly initialized.");
        } else {
            console.error("Validation failed. Contract state is incorrect.");
        }
    } catch (error) {
        console.error("Error deploying AscendDEX:", error);
        throw error; // Exit the script with an error
    }

    // Log deployer's balance after deployment
    const finalBalance = await ethers.provider.getBalance(deployer.address);
    console.log(`Deployer balance after deployment: ${ethers.utils.formatEther(finalBalance)} ETH`);

    // Calculate and log deployment cost
    const deploymentCost = initialBalance.sub(finalBalance);
    console.log(`Deployment cost: ${ethers.utils.formatEther(deploymentCost)} ETH`);
}

// Execute the script
main().catch((error) => {
    console.error("Deployment failed:", error);
    process.exitCode = 1;
});
