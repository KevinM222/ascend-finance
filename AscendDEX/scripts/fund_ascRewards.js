// scripts/fund_ascRewards.js

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Funding AscRewards using account:", deployer.address);
  
    // Use the TestASC token address on Sepolia
    const ascTokenAddress = "0xf6c59C630b1bC07594D695c12b3E5f5F632E23dA";
  
    // Full ABI for the mint function (you can include additional functions if needed)
    const ascTokenAbi = [
      "function mint(address to, uint256 amount) external",
      "function balanceOf(address account) view returns (uint256)",
      "function decimals() view returns (uint8)"
    ];
  
    // Create a contract instance using the deployer as the signer
    const ascToken = new ethers.Contract(ascTokenAddress, ascTokenAbi, deployer);
  
    // Set the AscRewards contract address (the one you just deployed)
    const ascRewardsAddress = "0xa2D979bF900C1Ccf153A2Ba6BB249B9e85a95690";
  
    // Define the reward pool: 100,000,000 ASC (using 18 decimals)
    const rewardPool = ethers.utils.parseUnits("100000000", 18);
  
    console.log(`Minting ${ethers.utils.formatUnits(rewardPool, 18)} ASC to AscRewards contract at ${ascRewardsAddress}...`);
  
    const tx = await ascToken.mint(ascRewardsAddress, rewardPool);
    console.log("Transaction hash:", tx.hash);
    await tx.wait();
    console.log("Mint transaction confirmed.");
  
    // Optionally, verify the balance
    const decimals = await ascToken.decimals();
    const balance = await ascToken.balanceOf(ascRewardsAddress);
    console.log("ASC in AscRewards contract:", ethers.utils.formatUnits(balance, decimals));
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Funding error:", error);
      process.exit(1);
    });
  