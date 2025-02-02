require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });
// Ensure this is the first line
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");

//debug statement 
console.log("SEPOLIA_RPC_URL:", process.env.SEPOLIA_RPC_URL);

const { task } = require("hardhat/config");

// Custom Task: Block Number
task("block-number", "Prints the current block number").setAction(async (taskArgs, hre) => {
    const blockNumber = await hre.ethers.provider.getBlockNumber();
    console.log("Current block number:", blockNumber);
});

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.19",
        settings: {
          optimizer: { enabled: true, runs: 200 }
        }
      },
      {
        version: "0.8.0",
        settings: {
          optimizer: { enabled: true, runs: 200 }
        }
      }
    ],
    overrides: {
      "contracts/Treasury.sol": { version: "0.8.0" },
      "contracts/ModularDEX.sol": { version: "0.8.0" },
      "contracts/MockERC20.sol": { version: "0.8.0" },
      "contracts/MockPriceFeeds.sol": { version: "0.8.0" }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337, // If using a local node
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      chainId: 11155111,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};