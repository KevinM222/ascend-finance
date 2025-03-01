// scripts/deploy_AscSale.js
const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", hre.ethers.utils.formatEther(await deployer.getBalance()));

    // Deploy TestASC
    const initialSupply = hre.ethers.utils.parseUnits("1000000000", 18); // 1B ASC
    const TestASC = await hre.ethers.getContractFactory("TestASC");
    const testASC = await TestASC.deploy(initialSupply);
    await testASC.deployed();
    console.log("TestASC deployed to:", testASC.address);

    // Deploy MockUSDC
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const mockUsdc = await MockUSDC.deploy();
    await mockUsdc.deployed();
    console.log("MockUSDC deployed to:", mockUsdc.address);

    // Deploy MockWPOL
    const MockWPOL = await hre.ethers.getContractFactory("MockWPOL");
    const mockWpol = await MockWPOL.deploy();
    await mockWpol.deployed();
    console.log("MockWPOL deployed to:", mockWpol.address);

    // Deploy AscTreasury
    const AscTreasury = await hre.ethers.getContractFactory("AscTreasury");
    const treasury = await AscTreasury.deploy(mockUsdc.address, mockWpol.address);
    await treasury.deployed();
    console.log("AscTreasury deployed to:", treasury.address);

    // Deploy AscSale
    const AscSale = await hre.ethers.getContractFactory("AscSale");
    const sale = await AscSale.deploy(testASC.address, mockUsdc.address, treasury.address);
    await sale.deployed();
    console.log("AscSale deployed to:", sale.address);

    // Fund AscSale with 150M ASC
    const ascAmount = hre.ethers.utils.parseUnits("150000000", 18); // 150M ASC
    await testASC.approve(sale.address, ascAmount);
    await sale.depositAsc(ascAmount);
    console.log("Funded AscSale with 150M ASC");

    // Test buying with POL
    const polAmount = hre.ethers.utils.parseUnits("10", 18); // 10 POL
    await sale.buyWithPol({ value: polAmount });
    console.log("Bought 500 ASC with 10 POL (8 POL to treasury, 2 POL to dev)");

    // Test buying with USDC
    const usdcAmount = hre.ethers.utils.parseUnits("10", 6); // 10 USDC
    await mockUsdc.approve(sale.address, usdcAmount);
    await sale.buyWithUsdc(usdcAmount);
    console.log("Bought 500 ASC with 10 USDC (8 USDC to treasury, 2 USDC to dev)");

    // Send more POL to treasury to trigger staking
    await deployer.sendTransaction({
        to: treasury.address,
        value: hre.ethers.utils.parseUnits("102", 18) // 102 POL to hit threshold
    });
    await treasury.autoStake();
    console.log("Treasury POL balance after staking:", hre.ethers.utils.formatEther(await hre.ethers.provider.getBalance(treasury.address)));
    console.log("Treasury staked amount:", hre.ethers.utils.formatEther(await treasury.stakedAmount()));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment error:", error);
        process.exit(1);
    });