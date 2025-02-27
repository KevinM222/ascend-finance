const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Funding AscStaking using account:", deployer.address);

  const ascTokenAddress = "0x4456B0F017F6bF9b0aa7a0ac3d3F224902a1937A";
  const ascTokenAbi = [
    "function mint(address to, uint256 amount) public",
    "function balanceOf(address account) public view returns (uint256)",
    "function owner() public view returns (address)"
  ];
  const ascToken = new ethers.Contract(ascTokenAddress, ascTokenAbi, deployer);

  // Verify deployer is the owner
  const owner = await ascToken.owner();
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error("Deployer is not the owner of the ASC token contract");
  }

  const ascStakingAddress = "0x6a663C5e104AAB49b5E09A0d2De94B4b340a4Aef"; // Replace with your latest deployed AscStaking address
  const amountToMint = ethers.utils.parseUnits("300000000", 18);

  console.log(`Minting ${ethers.utils.formatUnits(amountToMint, 18)} ASC to AscStaking contract at ${ascStakingAddress}...`);

  const balanceBefore = await ascToken.balanceOf(ascStakingAddress);
  console.log(`Staking contract balance before: ${ethers.utils.formatUnits(balanceBefore, 18)} ASC`);

  const tx = await ascToken.mint(ascStakingAddress, amountToMint);
  await tx.wait();

  const balanceAfter = await ascToken.balanceOf(ascStakingAddress);
  console.log(`Successfully minted ${ethers.utils.formatUnits(amountToMint, 18)} ASC. New balance: ${ethers.utils.formatUnits(balanceAfter, 18)} ASC`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Funding error:", error);
    process.exit(1);
  });