import { ethers } from 'ethers';
import fs from 'fs';  // Add fs module to read local files
import path from 'path';  // Use path module to handle file paths

const rewardsAddress = "0xa2D979bF900C1Ccf153A2Ba6BB249B9e85a95690";

// Read ABI from the local file
const rewardsABI = JSON.parse(fs.readFileSync(path.resolve('../frontend/AscRewardsABI.json')));

// Use a provider like Infura, Alchemy, or another RPC service
const provider = new ethers.JsonRpcProvider('https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID');

// If you have a private key or want to use MetaMask (but in Node.js), you could also use a signer
const signer = new ethers.Wallet('YOUR_PRIVATE_KEY', provider); // Replace with your private key

const rewardsContract = new ethers.Contract(rewardsAddress, rewardsABI.abi, signer);

console.log("✅ Rewards contract loaded:", rewardsContract);
