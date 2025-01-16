console.log("DEX Integration script loaded successfully!");

const DEX_CONTRACT_ADDRESS = "0x4456b0f017f6bf9b0aa7a0ac3d3f224902a1937a";
const TOKEN_ADDRESSES = {
    ASC: "0x4456b0f017f6bf9b0aa7a0ac3d3f224902a1937a",
    POL: "0x3Ef815f827c71E2e1C1604870FedDEF6e9BA85Ac",
    USDC: "0xADD81fF77b4Bd54259f0EB5f885862eF5920D165",
    ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
};

const ABI = [
    {
        constant: false,
        inputs: [
            { name: "tokenIn", type: "address" },
            { name: "amountIn", type: "uint256" },
            { name: "tokenOut", type: "address" },
            { name: "amountOutMin", type: "uint256" }
        ],
        name: "swap",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    }
];

let provider = null;
let signer = null;

async function initialize() {
    console.log("Initializing wallet connection...");
    if (!window.ethereum) {
        alert("MetaMask is not installed. Please install MetaMask to use this feature.");
        console.error("MetaMask not detected.");
        return;
    }

    try {
        console.log("Requesting MetaMask accounts...");
        const accounts = await ethereum.request({ method: "eth_requestAccounts" });
        if (!accounts || accounts.length === 0) {
            alert("No accounts found in MetaMask.");
            console.error("No accounts found.");
            return;
        }

        console.log("MetaMask accounts:", accounts);

        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        console.log("Signer address:", await signer.getAddress());

        if (!(await validateNetwork())) {
            alert("Please switch to the Sepolia network.");
            disconnectWallet();
            return;
        }

        updateWalletUI(true, accounts[0]);

        ethereum.on("accountsChanged", (newAccounts) => {
            console.log("Accounts changed:", newAccounts);
            if (newAccounts.length > 0) {
                updateWalletUI(true, newAccounts[0]);
            } else {
                console.log("No accounts connected.");
                disconnectWallet();
            }
        });

        ethereum.on("chainChanged", () => {
            console.log("Network changed. Reloading...");
            window.location.reload();
        });

        console.log("Wallet connected successfully.");
    } catch (error) {
        console.error("Error connecting to MetaMask:", error.message);
        alert(`Error connecting to MetaMask: ${error.message}`);
    }
}

function disconnectWallet() {
    signer = null;
    updateWalletUI(false);
    console.log("Wallet disconnected.");
}

function updateWalletUI(connected, address = null) {
    const connectButton = document.getElementById("connectWalletButton");
    const disconnectButton = document.getElementById("disconnectWalletButton");

    if (!connectButton || !disconnectButton) {
        console.error("UI buttons not found in the DOM.");
        return;
    }

    connectButton.disabled = false;

    if (connected) {
        connectButton.textContent = `Connected: ${address.substring(0, 6)}...${address.slice(-4)}`;
        connectButton.style.backgroundColor = "#28a745";
        disconnectButton.style.display = "inline-block";
    } else {
        connectButton.textContent = "Connect Wallet";
        connectButton.style.backgroundColor = "#007bff";
        disconnectButton.style.display = "none";
    }
}

async function validateNetwork() {
    if (!provider) {
        console.error("Provider not initialized.");
        return false;
    }

    const network = await provider.getNetwork();
    console.log("Current network chain ID:", network.chainId);

    if (network.chainId !== 11155111) {
        console.error(`Wrong network: Chain ID ${network.chainId}. Expected: 11155111.`);
        return await switchToSepolia();
    }

    console.log("Connected to the Sepolia network.");
    return true;
}

async function switchToSepolia() {
    try {
        await ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0xaa36a7" }],
        });
        console.log("Switched to the Sepolia network.");
        return true;
    } catch (error) {
        console.error("Error switching networks:", error.message);
        return false;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const connectButton = document.getElementById("connectWalletButton");
    const disconnectButton = document.getElementById("disconnectWalletButton");

    if (!connectButton) {
        console.error("Connect Wallet button not found in the DOM.");
        return;
    }

    connectButton.addEventListener("click", () => {
        console.log("Connect Wallet button clicked.");
        initialize();
    });

    if (!disconnectButton) {
        console.error("Disconnect Wallet button not found in the DOM.");
        return;
    }

    disconnectButton.addEventListener("click", () => {
        console.log("Disconnect Wallet button clicked.");
        disconnectWallet();
    });
});
