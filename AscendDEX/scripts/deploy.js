const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy TestASC
  const TestASC = await hre.ethers.getContractFactory("TestASC");
  const ascToken = await TestASC.deploy(hre.ethers.utils.parseEther("1000000")); // 1M ASC
  await ascToken.deployed();
  console.log("TestASC deployed to:", ascToken.address);

  // Deploy AscStaking
  const AscStaking = await hre.ethers.getContractFactory("AscStaking");
  const staking = await AscStaking.deploy(ascToken.address);
  await staking.deployed();
  console.log("✅ AscStaking deployed at:", staking.address);

  // Fund staking contract
  await ascToken.transfer(staking.address, hre.ethers.utils.parseEther("10000"));
  console.log("Transferred 10,000 ASC to staking contract");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment error:", error);
    process.exit(1);
  });