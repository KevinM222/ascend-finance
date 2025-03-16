require("dotenv").config();
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@nomicfoundation/hardhat-verify"); // Replace @nomiclabs/hardhat-etherscan
require("hardhat-gas-reporter"); // Added from previous steps

console.log("Using network:", process.env.HARDHAT_NETWORK || "hardhat");

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
      url: SEPOLIA_RPC_URL,
      chainId: 11155111,
      accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : [],
    },
    polygon: {
      url: POLYGON_RPC_URL,
      chainId: 137,
      accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : [],
    },
  },
  verify: { // Replace etherscan with verify
    etherscan: {
      apiKey: {
        polygon: process.env.POLYGONSCAN_API_KEY,
        sepolia: process.env.ETHERSCAN_API_KEY,
      },
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
    currency: "USD",
    gasPrice: 35,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  mocha: {
    timeout: 40000,
    reporter: "spec",
  },
};