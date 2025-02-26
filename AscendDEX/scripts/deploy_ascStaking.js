const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying AscStaking with the account:", deployer.address);

  const ascTokenAddress = "0x4456B0F017F6bF9b0aa7a0ac3d3F224902a1937A"; // Polygon mainnet ASC token

  const AscStaking = await hre.ethers.getContractFactory("AscStaking");
  const staking = await AscStaking.deploy(ascTokenAddress);

  await staking.deployed();
  console.log("✅ AscStaking deployed at:", staking.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment error for AscStaking:", error);
    process.exit(1);
  });