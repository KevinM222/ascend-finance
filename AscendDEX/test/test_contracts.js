const { ethers } = require("hardhat");

async function main() {
    const contractAddress = "0xYourDeployedContractAddress"; // Replace with actual deployed contract address
    const ModularDEX = await ethers.getContractAt("ModularDEX", contractAddress);

    console.log("Connected to ModularDEX contract at:", contractAddress);

    // --- Testing Fee ---
    console.log("\n--- Testing Fee ---");
    const fee = await ModularDEX.fee();
    console.log(`Current transaction fee: ${fee} basis points (${fee / 10}% expected)`);

    // --- Testing Adding Liquidity ---
    console.log("\n--- Testing Adding Liquidity ---");
    try {
        const token1 = "ASC";
        const token2 = "POL";
        const amount1 = ethers.utils.parseUnits("10", 18); // Example amounts
        const amount2 = ethers.utils.parseUnits("5", 18);
        const tx = await ModularDEX.addLiquidity(token1, token2, amount1, amount2);
        await tx.wait();
        console.log("Liquidity added successfully.");
    } catch (error) {
        console.error("Error adding liquidity:", error.message);
    }

    // --- Testing Token Swap ---
    console.log("\n--- Testing Token Swap ---");
    try {
        const tokenIn = "POL";
        const tokenOut = "ASC";
        const amountIn = ethers.utils.parseUnits("1", 18);
        const amountOutMin = ethers.utils.parseUnits("0.1", 18);
        const tx = await ModularDEX.swap(tokenIn, tokenOut, amountIn, amountOutMin);
        await tx.wait();
        console.log("Token swapped successfully.");
    } catch (error) {
        console.error("Error swapping tokens:", error.message);
    }

    // --- Fetching Reserves ---
    console.log("\n--- Fetching Reserves ---");
    try {
        const token1 = "ASC";
        const token2 = "POL";
        const pairId = ethers.utils.solidityKeccak256(["string", "string"], [token1, token2]);
        const reserves = await ModularDEX.pairs(pairId);
        console.log(`Reserves for ${token1}-${token2}:`);
        console.log(`  ${token1}: ${ethers.utils.formatUnits(reserves.reserve1, 18)}`);
        console.log(`  ${token2}: ${ethers.utils.formatUnits(reserves.reserve2, 18)}`);
    } catch (error) {
        console.error("Error fetching reserves:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
