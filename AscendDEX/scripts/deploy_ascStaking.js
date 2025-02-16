async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying AscStaking with the account:", deployer.address);

  // ✅ Use the latest deployed TestASC contract
  const ascTokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; 

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
