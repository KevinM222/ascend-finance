async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying AscStaking with the account:", deployer.address);

  const testASCAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"; // ✅ Replace with the deployed TestASC address

  const AscStaking = await ethers.getContractFactory("AscStaking");
  const ascStaking = await AscStaking.deploy(testASCAddress, ethers.utils.parseEther("100000")); // Reward pool
  await ascStaking.deployed();

  console.log("✅ AscStaking deployed at:", ascStaking.address);
}

main()
.then(() => process.exit(0))
.catch((error) => {
    console.error("Deployment error for AscStaking:", error);
    process.exit(1);
});
