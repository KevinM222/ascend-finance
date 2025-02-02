// scripts/deploy_ascStaking.js

async function main() {
    // Get the deployer account from Hardhat
    const [deployer] = await ethers.getSigners();
    console.log("Deploying AscStaking with account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());
  
    // ASC token contract address (replace with your deployed token address)
    const ascTokenAddress = "0x4456B0F017F6bF9b0aa7a0ac3d3F224902a1937A";
  
    // Define the pre-allocated reward pool for staking rewards: 300,000,000 ASC (18 decimals)
    const stakingRewardPool = ethers.utils.parseUnits("300000000", 18);
  
    // Get the contract factory for AscStaking
    const AscStaking = await ethers.getContractFactory("AscStaking");
  
    // Deploy the contract with constructor parameters: ascTokenAddress and stakingRewardPool
    const ascStaking = await AscStaking.deploy(ascTokenAddress, stakingRewardPool);
    await ascStaking.deployed();
  
    console.log("AscStaking deployed to:", ascStaking.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Deployment error for AscStaking:", error);
      process.exit(1);
    });
  