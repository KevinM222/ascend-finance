require('dotenv').config();
console.log(process.env.env);

const { ethers } = require("ethers");

const contractAddress = "0x4456b0f017f6bf9b0aa7a0ac3d3f224902a1937a";
const abi = [
    {
        "constant": true,
        "inputs": [{ "name": "_owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "balance", "type": "uint256" }],
        "type": "function"
    }
];

async function connectMetaMask() {
    try {
        if (!window.ethereum) {
            alert("Please install MetaMask!");
            return;
        }

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        console.log("Signer address:", await signer.getAddress());
    } catch (error) {
        console.error("Error connecting to MetaMask:", error);
    }
}

async function getTokenBalance() {
    try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const contract = new ethers.Contract(contractAddress, abi, provider);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        const balance = await contract.balanceOf(address);
        console.log("Token balance:", ethers.utils.formatUnits(balance, 18));
    } catch (error) {
        console.error("Error fetching token balance:", error);
    }
}

function disconnectMetaMask() {
    window.ethereum = null;
    console.log("Disconnected from MetaMask");
}

// Listen for MetaMask events
window.ethereum.on("accountsChanged", (accounts) => {
    console.log("Accounts changed:", accounts);
});

window.ethereum.on("chainChanged", (chainId) => {
    console.log("Network changed:", chainId);
    window.location.reload();
});
