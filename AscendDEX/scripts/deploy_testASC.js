// scripts/deploy_testASC.js
async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying TestASC with account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());
  
    const initialSupply = ethers.utils.parseUnits("1000000000", 18); // Example: 1 billion tokens
    const TestASC = await ethers.getContractFactory("TestASC");
    const testASC = await TestASC.deploy(initialSupply);
    await testASC.deployed();
  
    console.log("TestASC deployed to:", testASC.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Deployment error for TestASC:", error);
      process.exit(1);
    });
  