require("dotenv").config();
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");

// Ensure required .env variables are set
if (!process.env.SEPOLIA_RPC_URL) {
  console.error("❌ ERROR: SEPOLIA_RPC_URL is not set in .env");
  process.exit(1);
}

if (!process.env.PRIVATE_KEY) {
  console.error("❌ ERROR: PRIVATE_KEY is not set in .env");
  process.exit(1);
}

// Debug statement to verify env loading
console.log("SEPOLIA_RPC_URL:", process.env.SEPOLIA_RPC_URL);

// Custom Task: Block Number
const { task } = require("hardhat/config");
task("block-number", "Prints the current block number").setAction(async (taskArgs, hre) => {
  const blockNumber = await hre.ethers.provider.getBlockNumber();
  console.log("Current block number:", blockNumber);
});

module.exports = {
  defaultNetwork: "hardhat",  // ✅ Ensures Hardhat is always used for tests
  solidity: {
    compilers: [
      {
        version: "0.8.19",
        settings: { optimizer: { enabled: true, runs: 200 } }
      },
      {
        version: "0.8.0",
        settings: { optimizer: { enabled: true, runs: 200 } }
      }
    ],
    overrides: Object.fromEntries(
      ["Treasury.sol", "ModularDEX.sol", "MockERC20.sol", "MockPriceFeeds.sol"].map(contract => [
        `contracts/${contract}`, { version: "0.8.0" }
      ])
    ),
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      chainId: 11155111,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
