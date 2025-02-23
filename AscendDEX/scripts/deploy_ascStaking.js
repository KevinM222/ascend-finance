const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying AscStaking with the account:", deployer.address);

  const ascTokenAddress = "0xE6D3d358CB0A63C6B0851a2b4107Ed20387bB923"; // Sepolia ASC token

  const AscStaking = await hre.ethers.getContractFactory("AscStaking");
  const staking = await AscStaking.deploy(ascTokenAddress); // Only one arg

  await staking.deployed();
  console.log("✅ AscStaking deployed at:", staking.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment error for AscStaking:", error);
    process.exit(1);
  });