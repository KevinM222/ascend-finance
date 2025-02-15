async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying AscStaking with the account:", deployer.address);

  const ascTokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";  // Correct token
  const rewardPool = ethers.utils.parseEther("1000");

  const AscStaking = await ethers.getContractFactory("AscStaking");
  const staking = await AscStaking.deploy(ascTokenAddress, rewardPool);
  await staking.deployed();

  console.log("✅ AscStaking deployed at:", staking.address);
}

main().catch((error) => {
  console.error("Deployment error for AscStaking:", error);
  process.exitCode = 1;
});
