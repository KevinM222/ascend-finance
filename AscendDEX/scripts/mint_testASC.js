// scripts/mint_testASC.js

async function main() {
    // Get the deployer (owner) account from Hardhat
    const [deployer] = await ethers.getSigners();
    console.log("Minting test tokens using account:", deployer.address);
  
    // The TestASC token contract address (on Sepolia)
    const ascTokenAddress = "0xf6c59C630b1bC07594D695c12b3E5f5F632E23dA";
  
    // Minimal ABI that includes the mint function (and any other needed functions)
    const ascTokenAbi = [
      "function mint(address to, uint256 amount) external"
    ];
  
    // Create a contract instance using the deployer as the signer (must be owner)
    const ascToken = new ethers.Contract(ascTokenAddress, ascTokenAbi, deployer);
  
    // Define the recipient address (your wallet) to mint tokens to
    const recipient = "0x274af9bd0fEe424e2cd0Fed72cc3f2cA49B751F1";
    
    // Define the amount to mint. For example, mint 1,000,000 tokens (assuming 18 decimals)
    const amountToMint = ethers.utils.parseUnits("1000000", 18);
    console.log(`Minting ${ethers.utils.formatUnits(amountToMint, 18)} ASC to ${recipient}...`);
  
    // Execute the mint transaction
    const tx = await ascToken.mint(recipient, amountToMint);
    console.log("Transaction hash:", tx.hash);
    await tx.wait();
    console.log("Mint transaction confirmed.");
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Minting error:", error);
      process.exit(1);
    });
  