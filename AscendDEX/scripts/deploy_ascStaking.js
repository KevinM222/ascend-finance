require("dotenv").config();
const hre = require("hardhat");

async function main() {
    const { PRIVATE_KEY, SEPOLIA_RPC_URL, ASC_TOKEN_ADDRESS } = process.env;

    if (!PRIVATE_KEY || !SEPOLIA_RPC_URL || !ASC_TOKEN_ADDRESS) {
        throw new Error("Please set PRIVATE_KEY, SEPOLIA_RPC_URL, and ASC_TOKEN_ADDRESS in your .env file.");
    }

    console.log("Deploying AscStaking contract...");

    // Get the contract factory
    const AscStaking = await hre.ethers.getContractFactory("AscStaking");

    // Define the reward pool (modify as needed)
    const rewardPool = hre.ethers.utils.parseEther("1000000"); // Example: 1M ASC as rewards

    // Deploy the contract
    const ascStaking = await AscStaking.deploy(ASC_TOKEN_ADDRESS, rewardPool);

    await ascStaking.deployed();

    console.log(`✅ AscStaking deployed at: ${ascStaking.address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error.message);
        process.exit(1);
    });
