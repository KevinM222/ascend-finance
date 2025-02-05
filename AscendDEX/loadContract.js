// loadContract.js
const ethers = require('ethers');

const rewardsAddress = "0xa2D979bF900C1Ccf153A2Ba6BB249B9e85a95690"; // Your rewards contract address
const rewardsABI = require('./frontend/AscRewardsABI.json'); // Load ABI

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
const rewardsContract = new ethers.Contract(rewardsAddress, rewardsABI.abi, signer);

console.log("✅ Rewards contract loaded:", rewardsContract);
