// scripts/fund_ascStaking.js

async function main() {
    // Get the deployer account from Hardhat
    const [deployer] = await ethers.getSigners();
    console.log("Funding AscStaking using account:", deployer.address);
  
    // Get the ASC token contract instance (assuming your token contract is called EssentialToken)
    const ascTokenAddress = "0x4456B0F017F6bF9b0aa7a0ac3d3F224902a1937A";
    const AscToken = await ethers.getContractFactory("EssentialToken");
    const ascToken = await AscToken.attach(ascTokenAddress);
  
    // Set your deployed AscStaking contract address
    const ascStakingAddress = "0x2dFAb85508618735435046D125fD2A769D485c64"; // Replace with your actual staking contract address
  
    // Define the amount to mint: 300,000,000 ASC (with 18 decimals)
    const amountToMint = ethers.utils.parseUnits("300000000", 18);
  
    console.log(`Minting ${ethers.utils.formatUnits(amountToMint, 18)} ASC to the AscStaking contract...`);
  
    // Call the mint function on your ASC token contract to mint tokens directly to the staking contract
    const tx = await ascToken.mint(ascStakingAddress, amountToMint);
    await tx.wait();
    console.log(`Successfully minted ${ethers.utils.formatUnits(amountToMint, 18)} ASC to ${ascStakingAddress}`);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Funding error:", error);
      process.exit(1);
    });
  