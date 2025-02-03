// scripts/deploy_ascStaking.js

async function main() {
    // Get the deployer account from Hardhat
    const [deployer] = await ethers.getSigners();
    console.log("Deploying AscStaking with account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());
  
    // ASC token contract address (replace with your deployed token address)
    const ascTokenAddress = "0xf6c59C630b1bC07594D695c12b3E5f5F632E23dA";
  
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
  