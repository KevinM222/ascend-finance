const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying AscStaking with the account: ${deployer.address}`);

  const ASC_TOKEN_ADDRESS = "0xE6D3d358CB0A63C6B0851a2b4107Ed20387bB923"; // Your ASC token address on Sepolia
  const INITIAL_REWARD_POOL = hre.ethers.utils.parseEther("1000000"); // 1M tokens

  const AscStaking = await hre.ethers.getContractFactory("AscStaking");
  const staking = await AscStaking.deploy(ASC_TOKEN_ADDRESS, INITIAL_REWARD_POOL);

  await staking.deployed();
  console.log(`✅ AscStaking deployed at: ${staking.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
