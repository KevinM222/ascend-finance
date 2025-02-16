async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying AscStaking with the account:", deployer.address);

  // ✅ Use the latest deployed TestASC contract
  const ascTokenAddress = "0xE6D3d358CB0A63C6B0851a2b4107Ed20387bB923"; 

  // ✅ Define a starting reward pool (adjust as needed)
  const rewardPool = ethers.utils.parseEther("1000000"); // Example: 1 million ASC for rewards

  const AscStaking = await ethers.getContractFactory("AscStaking");
  const staking = await AscStaking.deploy(ascTokenAddress, rewardPool);

  await staking.deployed();

  console.log("✅ AscStaking deployed at:", staking.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
      console.error("Deployment error for AscStaking:", error);
      process.exit(1);
  });
