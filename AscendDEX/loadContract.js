import { ethers } from 'ethers';
import fs from 'fs';  // Add fs module to read local files
import path from 'path';  // Use path module to handle file paths
import dotenv from 'dotenv';  // Import dotenv to read .env file

// Load environment variables from .env
dotenv.config();

const rewardsAddress = "0xa2D979bF900C1Ccf153A2Ba6BB249B9e85a95690";

// Read ABI from the local file
const rewardsABI = JSON.parse(fs.readFileSync(path.resolve('../frontend/AscRewardsABI.json')));

// Use Infura provider with the project ID from the .env file
const provider = new ethers.JsonRpcProvider(`https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`);

// Create a wallet using the private key from the .env file and connect it to the provider
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const rewardsContract = new ethers.Contract(rewardsAddress, rewardsABI.abi, signer);

console.log("✅ Rewards contract loaded:", rewardsContract);
