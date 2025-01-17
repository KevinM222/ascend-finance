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
        return;
    }

    try {
        const accounts = await ethereum.request({ method: "eth_requestAccounts" });
        if (!accounts || accounts.length === 0) {
            alert("No accounts found in MetaMask.");
            return;
        }

        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        if (!(await validateNetwork())) {
            alert("Please switch to the Sepolia network.");
            disconnectWallet();
            return;
        }

        updateWalletUI(true, accounts[0]);

        ethereum.on("accountsChanged", (newAccounts) => {
            if (newAccounts.length > 0) {
                updateWalletUI(true, newAccounts[0]);
            } else {
                disconnectWallet();
            }
        });

        ethereum.on("chainChanged", () => {
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
    const addToMetaMaskButton = document.getElementById("addToMetaMaskButton");

    if (!connectButton || !disconnectButton || !addToMetaMaskButton) return;

    connectButton.disabled = false;

    if (connected) {
        connectButton.textContent = `Connected: ${address.substring(0, 6)}...${address.slice(-4)}`;
        connectButton.style.backgroundColor = "#28a745";
        disconnectButton.style.display = "inline-block";
        addToMetaMaskButton.style.display = "inline-block";

        addToMetaMaskButton.addEventListener("click", () => {
            ethereum.request({
                method: "wallet_watchAsset",
                params: {
                    type: "ERC20",
                    options: {
                        address: TOKEN_ADDRESSES.ASC,
                        symbol: "ASC",
                        decimals: 18,
                    },
                },
            })
                .then(() => console.log("Token added to MetaMask"))
                .catch((error) => console.error("Error adding token:", error.message));
        });
    } else {
        connectButton.textContent = "Connect Wallet";
        connectButton.style.backgroundColor = "#007bff";
        disconnectButton.style.display = "none";
        addToMetaMaskButton.style.display = "none";
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

// Swap Token Functionality
async function swapTokens(tokenIn, tokenOut, amountIn, amountOutMin) {
    console.log("Performing token swap...");

    const contract = new ethers.Contract(DEX_CONTRACT_ADDRESS, ABI, signer);

    const tx = await contract.swap(tokenIn, amountIn, tokenOut, amountOutMin, {
        gasLimit: 300000,
    });

    console.log("Swap transaction sent, waiting for confirmation...");
    await tx.wait();
    console.log("Swap completed!");
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM fully loaded.");
    const connectButton = document.getElementById("connectWalletButton");
    const disconnectButton = document.getElementById("disconnectWalletButton");
    const sushiSwapButton = document.getElementById("sushiSwapButton");
    const roadmapButton = document.getElementById("roadmapButton");

    if (connectButton) connectButton.addEventListener("click", initialize);
    if (disconnectButton) disconnectButton.addEventListener("click", disconnectWallet);

    if (sushiSwapButton) {
        sushiSwapButton.addEventListener("click", () => {
            window.open(
                'https://sushi.com/swap?inputCurrency=0x4456b0f017f6bf9b0aa7a0ac3d3f224902a1937a&outputCurrency=POL',
                '_blank'
            );
        });
    }

    if (roadmapButton) {
        roadmapButton.addEventListener("click", () => {
            window.location.href = "roadmap.html";
        });
    }
});
