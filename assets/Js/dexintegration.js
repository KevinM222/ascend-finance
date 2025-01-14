console.log("DEX Integration script loaded successfully!");

const DEX_CONTRACT_ADDRESS = "0x4456b0f017f6bf9b0aa7a0ac3d3f224902a1937a";
const ABI = [
    {
        constant: true,
        inputs: [{ name: "_owner", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "balance", type: "uint256" }],
        type: "function"
    }
];

let provider, signer;

async function initialize() {
    if (!window.ethereum) {
        alert("MetaMask is not installed. Please install MetaMask to use this feature.");
        console.error("MetaMask not detected.");
        return;
    }

    try {
        const accounts = await ethereum.request({ method: "eth_requestAccounts" });
        if (!accounts || accounts.length === 0) {
            console.error("No accounts found in MetaMask.");
            return;
        }

        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        const address = accounts[0];

        console.log(`Connected to MetaMask: ${address}`);
        updateWalletUI(true, address);
        await updateTokenInfo();
    } catch (error) {
        console.error("Error connecting to MetaMask:", error);
        alert("Failed to connect to MetaMask. Please try again.");
    }
}

function disconnectWallet() {
    provider = null;
    signer = null;
    updateWalletUI(false);
    console.log("Disconnected from MetaMask.");
}

function updateWalletUI(connected, address = null) {
    const connectButton = document.getElementById("connectWalletButton");
    const disconnectButton = document.getElementById("disconnectWalletButton");
    const addToMetaMaskButton = document.getElementById("addToMetaMaskButton");

    if (connected) {
        connectButton.textContent = `Connected: ${address.substring(0, 6)}...${address.slice(-4)}`;
        connectButton.style.backgroundColor = "#28a745";
        disconnectButton.style.display = "inline-block";
        addToMetaMaskButton.style.display = "inline-block";
    } else {
        connectButton.textContent = "Connect Wallet";
        connectButton.style.backgroundColor = "#007bff";
        disconnectButton.style.display = "none";
        addToMetaMaskButton.style.display = "none";
        document.getElementById("tokenBalance").textContent = "Your ASC Balance: N/A";
        document.getElementById("tokenPrice").textContent = "ASC Price: Loading...";
    }
}

async function getContract() {
    if (!provider || !DEX_CONTRACT_ADDRESS || !ABI.length) {
        console.error("Provider, contract address, or ABI is missing.");
        return null;
    }
    return new ethers.Contract(DEX_CONTRACT_ADDRESS, ABI, signer);
}

async function getTokenBalance() {
    try {
        const contract = await getContract();
        if (!contract) return;

        const address = await signer.getAddress();
        const balance = await contract.balanceOf(address);
        const formattedBalance = ethers.utils.formatUnits(balance, 18);

        console.log(`Token Balance: ${formattedBalance}`);
        return formattedBalance;
    } catch (error) {
        console.error("Error fetching token balance:", error);
    }
}

function setupUI() {
    const connectButton = document.getElementById("connectWalletButton");
    const disconnectButton = document.getElementById("disconnectWalletButton");

    if (connectButton) {
        console.log("Connect Wallet button found.");
        connectButton.addEventListener("click", initialize);
    } else {
        console.error("Connect Wallet button not found!");
    }

    if (disconnectButton) {
        console.log("Disconnect Wallet button found.");
        disconnectButton.addEventListener("click", disconnectWallet);
    } else {
        console.error("Disconnect Wallet button not found!");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    setupUI();
});
