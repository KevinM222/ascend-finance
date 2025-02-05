// loadContract.js
import { ethers } from 'ethers';

const rewardsAddress = "0xa2D979bF900C1Ccf153A2Ba6BB249B9e85a95690";
const rewardsABI = await fetch("./AscRewardsABI.json").then(res => res.json());

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
const rewardsContract = new ethers.Contract(rewardsAddress, rewardsABI.abi, signer);

console.log("✅ Rewards contract loaded:", rewardsContract);
