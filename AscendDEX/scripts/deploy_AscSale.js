// C:\Users\User\Desktop\Ascend\AscendDEX\scripts\deploy_AscSale.js (Sepolia)
const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", hre.ethers.utils.formatEther(await deployer.getBalance()));

    const ascTokenAddress = "0xE6D3d358CB0A63C6B0851a2b4107Ed20387bB923";
    const usdcAddress = "0x176f5a08c4c4cfC364C35a309c093a8979344600";
    const devWallet = "0x274af9bd0fEe424e2cd0Fed72cc3f2cA49B751F1";

    const AscTreasury = await hre.ethers.getContractFactory("AscTreasury");
    const treasury = await AscTreasury.deploy(usdcAddress, "0x05db234b00e782A8689E185A8A79E488CA070cC8"); // POL mock as WPOL
    await treasury.deployed();
    console.log("AscTreasury deployed to:", treasury.address);

    const AscSale = await hre.ethers.getContractFactory("AscSale");
    const sale = await AscSale.deploy(ascTokenAddress, usdcAddress, treasury.address, devWallet);
    await sale.deployed();
    console.log("AscSale deployed to:", sale.address);

    const ascAmount = hre.ethers.utils.parseUnits("150000000", 18);
    console.log("From 0x274af9bd0fEe424e2cd0Fed72cc3f2cA49B751F1:");
    console.log(`1. Approve: await ascToken.approve(${sale.address}, ${ascAmount.toString()})`);
    console.log(`2. Deposit: await sale.depositAsc(${ascAmount.toString()})`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment error:", error);
        process.exit(1);
    });