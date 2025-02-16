async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying AscStaking with the account:", deployer.address);

  // ✅ Use the latest deployed TestASC contract
  const ascTokenAddress = "0x9A676e781A523b5d0C0e43731313A708CB607508"; 

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
