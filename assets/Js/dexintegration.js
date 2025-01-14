console.log("DEX Integration script loaded successfully!");

const DEX_CONTRACT_ADDRESS = "0x4456b0f017f6bf9b0aa7a0ac3d3f224902a1937a";
const ABI = [
    {
        "constant": false,
        "inputs": [
            { "name": "tokenIn", "type": "address" },
            { "name": "amountIn", "type": "uint256" },
            { "name": "tokenOut", "type": "address" },
            { "name": "amountOutMin", "type": "uint256" }
        ],
        "name": "swap",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
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
        await getTokenBalance(); // Fetch token balance after connecting
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

    if (connected) {
        connectButton.textContent = `Connected: ${address.substring(0, 6)}...${address.slice(-4)}`;
        connectButton.style.backgroundColor = "#28a745";
        disconnectButton.style.display = "inline-block";
    } else {
        connectButton.textContent = "Connect Wallet";
        connectButton.style.backgroundColor = "#007bff";
        disconnectButton.style.display = "none";
        document.getElementById("tokenBalance").textContent = "Your ASC Balance: N/A";
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
        document.getElementById("tokenBalance").textContent = `Your ASC Balance: ${formattedBalance}`;
    } catch (error) {
        console.error("Error fetching token balance:", error);
    }
}

async function swapTokens(inputAmount, tokenIn, tokenOut) {
    try {
        const network = await provider.getNetwork();
        if (network.chainId !== 11155111) {
            alert("Please switch to the Sepolia network.");
            return;
        }

        const contract = await getContract();
        if (!contract) return;

        console.log(`Initiating swap: ${inputAmount} ${tokenIn} -> ${tokenOut}`);
        const amountInWei = ethers.utils.parseUnits(inputAmount.toString(), 18);
        const amountOutMin = ethers.utils.parseUnits("0.1", 18);

        const tx = await contract.swap(tokenIn, amountInWei, tokenOut, amountOutMin, {
            gasLimit: 300000,
        });

        console.log("Swap transaction submitted:", tx.hash);
        await tx.wait();
        console.log("Swap completed:", tx.hash);

        alert("Swap successful!");
    } catch (error) {
        console.error("Error executing token swap:", error);
        alert("Swap failed. Check console for details.");
    }
}

function setupUI() {
    const connectButton = document.getElementById("connectWalletButton");
    const disconnectButton = document.getElementById("disconnectWalletButton");
    const swapButton = document.getElementById("swapButton");

    if (connectButton) {
        connectButton.addEventListener("click", initialize);
    }

    if (disconnectButton) {
        disconnectButton.addEventListener("click", disconnectWallet);
    }

    if (swapButton) {
        swapButton.addEventListener("click", async () => {
            const inputAmount = prompt("Enter the amount to swap:");
            const tokenIn = "<tokenIn_address>";
            const tokenOut = "<tokenOut_address>";

            if (inputAmount && tokenIn && tokenOut) {
                await swapTokens(inputAmount, tokenIn, tokenOut);
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    setupUI();
});
