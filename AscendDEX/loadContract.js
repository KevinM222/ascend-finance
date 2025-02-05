// loadContract.js
import { ethers } from 'ethers';
import fs from 'fs';  // Add fs module to read local files
import path from 'path';  // Use path module to handle file paths

const rewardsAddress = "0xa2D979bF900C1Ccf153A2Ba6BB249B9e85a95690";

// Read the ABI from the local file
const rewardsABI = JSON.parse(fs.readFileSync(path.resolve('../Ascend/AscRewardsABI.json')));


const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
const rewardsContract = new ethers.Contract(rewardsAddress, rewardsABI.abi, signer);

console.log("✅ Rewards contract loaded:", rewardsContract);
