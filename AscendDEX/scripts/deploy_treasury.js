const hre = require("hardhat");

async function main() {
    // Use the fully qualified name for the Treasury contract
    const Treasury = await hre.ethers.getContractFactory("contracts/Treasury.sol:Treasury");

    console.log("Deploying Treasury...");
    const treasury = await Treasury.deploy();
    await treasury.deployed();

    console.log("Treasury deployed to:", treasury.address);

    // Transfer ownership if INITIAL_OWNER is set
    const initialOwner = process.env.INITIAL_OWNER;
    if (initialOwner) {
        try {
            console.log("Transferring ownership to:", initialOwner);
            const tx = await treasury.transferOwnership(initialOwner);
            await tx.wait();
            console.log("Ownership transferred to:", initialOwner);
        } catch (error) {
            console.error("Error transferring ownership:", error);
        }
    } else {
        console.log(
            "Warning: INITIAL_OWNER not set. The contract owner is currently",
            await treasury.owner()
        );
    }

    return treasury.address;
}

main()
    .then((treasuryAddress) => {
        console.log("Treasury deployment successful!");
        console.log("Treasury Address:", treasuryAddress);
        process.exit(0);
    })
    .catch((error) => {
        console.error("Error deploying Treasury:", error);
        process.exit(1);
    });
