require("dotenv").config();
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");

// Debug: Show the selected network
console.log("Using network:", process.env.HARDHAT_NETWORK || "hardhat");

// Ensure required .env variables are set for non-hardhat networks
if (!process.env.PRIVATE_KEY && process.env.HARDHAT_NETWORK !== "hardhat") {
  console.error("❌ ERROR: PRIVATE_KEY is not set in .env");
  process.exit(1);
}

const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || "https://polygon-rpc.com";
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://rpc2.sepolia.org";

const { task } = require("hardhat/config");
task("block-number", "Prints the current block number").setAction(async (taskArgs, hre) => {
  const blockNumber = await hre.ethers.provider.getBlockNumber();
  console.log("Current block number:", blockNumber);
});

module.exports = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [
      {
        version: "0.8.20", // Updated to latest stable version
        settings: { 
          optimizer: { 
            enabled: true, 
            runs: 200 
          },
          evmVersion: "paris" // Specify EVM version
        },
      },
      {
        version: "0.8.0", // Keep for backwards compatibility
        settings: { 
          optimizer: { 
            enabled: true, 
            runs: 200 
          }
        },
      },
    ],
    overrides: Object.fromEntries(
      ["Treasury.sol", "ModularDEX.sol", "MockERC20.sol", "MockPriceFeeds.sol"].map(contract => [
        `contracts/${contract}`, { 
          version: "0.8.0",
          settings: { optimizer: { enabled: true, runs: 200 } }
        }
      ])
    ),
  },
  networks: {
    hardhat: {
      chainId: 31337,
      allowUnlimitedContractSize: true,
      // Add forking capability for testing with real data
      forking: {
        enabled: false, // Enable this if you want to fork Polygon
        url: POLYGON_RPC_URL,
      },
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        count: 10,
      },
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      chainId: 11155111,
      accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : [],
      gasPrice: 20000000000, // 20 gwei
    },
    polygon: {
      url: POLYGON_RPC_URL,
      chainId: 137,
      accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : [],
      gasPrice: 35000000000, // 35 gwei - adjust based on network conditions
    },
  },
  etherscan: {
    apiKey: {
      polygon: process.env.POLYGONSCAN_API_KEY,
      sepolia: process.env.ETHERSCAN_API_KEY,
    },
    customChains: [
      {
        network: "polygon",
        chainId: 137,
        urls: {
          apiURL: "https://api.polygonscan.com/api",
          browserURL: "https://polygonscan.com",
        },
      },
    ],
  },
  // Add mocha configuration for better test output
  mocha: {
    timeout: 40000,
    reporter: 'spec'
  },
};