const hre = require("hardhat");

async function main() {
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");

    console.log("Deploying Mock USDC...");
    const usdc = await MockERC20.deploy("Mock USD Coin", "USDC", ethers.utils.parseUnits("1000000", 18));
    await usdc.deployed();
    console.log("Mock USDC deployed to:", usdc.address);

    console.log("Deploying Mock POL...");
    const pol = await MockERC20.deploy("Mock Polygon Token", "POL", ethers.utils.parseUnits("1000000", 18));
    await pol.deployed();
    console.log("Mock POL deployed to:", pol.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
