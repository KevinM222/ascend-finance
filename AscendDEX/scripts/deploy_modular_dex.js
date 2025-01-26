const hre = require("hardhat");
const fs = require("fs");

async function main() {
    // Treasury address
    const treasuryAddress = "0xeF19B3eeaAaEB86503a1DcEF6bB1c45A9d49AbBd";
    if (!treasuryAddress) {
        throw new Error("Treasury address is missing!");
    }

    // Fee recipient (same as the initial owner for now)
    const feeRecipient = "0x274af9bd0fEe424e2cd0Fed72cc3f2cA49B751F1";

    // Initial owner address
    const initialOwner = "0x274af9bd0fEe424e2cd0Fed72cc3f2cA49B751F1";

    // Load token data from sepolia.json
    const sepoliaConfig = JSON.parse(fs.readFileSync("./deployments/sepolia.json", "utf8"));
    const tokens = sepoliaConfig.ModularDEX.tokens;

    // Deploy ModularDEX
    const ModularDEX = await hre.ethers.getContractFactory("ModularDEX");
    console.log("Deploying ModularDEX contract...");

    const modularDEX = await ModularDEX.deploy(
        treasuryAddress,   // Treasury address
        feeRecipient,      // Fee recipient address
        initialOwner       // Initial owner address
    );

    await modularDEX.deployed();

    console.log("ModularDEX deployed to:", modularDEX.address);

    // Add tokens to ModularDEX
    console.log("Adding tokens to ModularDEX...");
    for (const [symbol, config] of Object.entries(tokens)) {
        try {
            console.log(`Adding token: ${symbol}`);
            const tx = await modularDEX.addToken(
                symbol,
                config.address.trim(),
                config.priceFeed.trim(),
                config.decimals
            );
            await tx.wait();
            console.log(`Token ${symbol} added successfully!`);
        } catch (error) {
            console.error(`Error adding token ${symbol}:`, error.message);
        }
    }

    console.log("All tokens added successfully!");

    // Update sepolia.json with new ModularDEX address
    sepoliaConfig.ModularDEX.address = modularDEX.address;
    fs.writeFileSync("./deployments/sepolia.json", JSON.stringify(sepoliaConfig, null, 4));
    console.log("Updated sepolia.json with new ModularDEX address.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
