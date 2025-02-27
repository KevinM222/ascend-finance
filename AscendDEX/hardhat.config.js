require("dotenv").config();
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");

// Debug: Show the selected network
console.log("Using network:", process.env.HARDHAT_NETWORK || "hardhat");

// Ensure required .env variables are set
if (!process.env.PRIVATE_KEY) {
  console.error("❌ ERROR: PRIVATE_KEY is not set in .env");
  process.exit(1);
}

// Only check POLYGON_RPC_URL if deploying to Polygon, but keep it optional with a default
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || "https://rpc-mainnet.maticvigil.com";

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
        version: "0.8.19",
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
      {
        version: "0.8.0",
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
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
      allowUnlimitedContractSize: true,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org", // Fallback URL
      chainId: 11155111,
      accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : [],
    },
    polygon: {
      url: POLYGON_RPC_URL, // Use default or env variable
      chainId: 137,
      accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : [],
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
};