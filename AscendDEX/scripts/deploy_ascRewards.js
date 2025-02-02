// scripts/deploy_ascRewards.js

async function main() {
    // Get deployer account from Hardhat
    const [deployer] = await ethers.getSigners();
    console.log("Deploying AscRewards with account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());
  
    // Set the ASC token contract address (update if necessary)
    const ascTokenAddress = "0x4456B0F017F6bF9b0aa7a0ac3d3F224902a1937A";
  
    // Define the pre-allocated reward pool for rewards: 100,000,000 ASC (with 18 decimals)
    const rewardPool = ethers.utils.parseUnits("100000000", 18);
  
    // Get the contract factory for AscRewards
    const AscRewards = await ethers.getContractFactory("AscRewards");
  
    // Deploy the AscRewards contract with constructor parameters:
    // ascTokenAddress and rewardPool
    const ascRewards = await AscRewards.deploy(ascTokenAddress, rewardPool);
    await ascRewards.deployed();
  
    console.log("AscRewards deployed to:", ascRewards.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Deployment error for AscRewards:", error);
      process.exit(1);
    });
  