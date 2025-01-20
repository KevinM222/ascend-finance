const hre = require("hardhat");

async function main() {
    const Treasury = await hre.ethers.getContractFactory("Treasury");

    console.log("Deploying Treasury...");
    const treasury = await Treasury.deploy();
    await treasury.deployed();

    console.log("Treasury deployed to:", treasury.address);

    // Optionally, transfer ownership if you have an owner address in mind
    const initialOwner = process.env.INITIAL_OWNER;
    if (initialOwner) {
        console.log("Transferring ownership to:", initialOwner);
        await treasury.transferOwnership(initialOwner);
    } else {
        console.log("Warning: INITIAL_OWNER not set. The contract owner is currently", await treasury.owner());
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
        console.error(error.stack);
        process.exit(1);
    });