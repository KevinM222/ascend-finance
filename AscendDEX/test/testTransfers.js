// test/testTransfers.js
const { ethers } = require("hardhat");

async function main() {
    // Assuming you've already defined these variables or functions elsewhere
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.attach("0x176f5a08c4c4cfC364C35a309c093a8979344600"); // Replace with your USDC address
    const dex = await ethers.getContractFactory("ModularDEX");
    const dexInstance = await dex.attach("0xf2c0E223B5A2A65933EE7F0bbb801c944cFa12C6"); // Replace with your DEX address
    const someAddress = "0xc89c6534021B0BC1e81af2518a1491a93f9659d8"; // Replace with the address you're testing from

    try {
        const tx = await usdc.transferFrom(someAddress, dexInstance.address, ethers.utils.parseUnits("1", 6));
        await tx.wait();
        console.log("USDC transferFrom test passed");
    } catch (error) {
        console.error("USDC transferFrom test failed:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });