// Frontend DEX Integration for AscendDEX
console.log("DEX Integration script loaded successfully!");

// Define constants and configurations
const DEX_CONTRACT_ADDRESS = "0x4456b0f017f6bf9b0aa7a0ac3d3f224902a1937a"; // Deployed contract address
const ABI = [
    {
        constant: true,
        inputs: [{ name: "_owner", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "balance", type: "uint256" }],
        type: "function"
    }
];

let provider, signer; // Initialize provider and signer globally

/**
 * Initialize MetaMask connection and set up provider/signer
 */
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

/**
 * Disconnect wallet and reset UI
 */
function disconnectWallet() {
    provider = null;
    signer = null;
    updateWalletUI(false);
    console.log("Disconnected from MetaMask.");
}

/**
 * Update the wallet UI based on connection status
 */
function updateWalletUI(connected, address = null) {
    const connectButton = document.getElementById("connect-wallet");
    const disconnectButton = document.getElementById("disconnect-wallet");
    const addToMetaMaskButton = document.getElementById("addToMetaMaskButton");

    if (connected) {
        connectButton.textContent = `Connected: ${address.substring(0, 6)}...${address.slice(-4)}`;
        connectButton.style.backgroundColor = "#28a745"; // Green when connected
        disconnectButton.style.display = "inline-block";
        addToMetaMaskButton.style.display = "inline-block";
    } else {
        connectButton.textContent = "Connect Wallet";
        connectButton.style.backgroundColor = "#007bff"; // Default blue
        disconnectButton.style.display = "none";
        addToMetaMaskButton.style.display = "none";
        document.getElementById("tokenBalance").textContent = "Your ASC Balance: N/A";
        document.getElementById("tokenPrice").textContent = "ASC Price: Loading...";
    }
}

/**
 * Connect to the deployed contract
 */
async function getContract() {
    if (!provider || !DEX_CONTRACT_ADDRESS || !ABI.length) {
        console.error("Provider, contract address, or ABI is missing.");
        return null;
    }
    return new ethers.Contract(DEX_CONTRACT_ADDRESS, ABI, signer);
}

/**
 * Fetch and display the token balance
 */
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

/**
 * Swap tokens using the DEX contract
 */
async function swapTokens(inputAmount, tokenIn, tokenOut) {
    try {
        const contract = await getContract();
        if (!contract) return;

        const tx = await contract.swap(inputAmount, tokenIn, tokenOut, { gasLimit: 300000 });
        console.log("Swap transaction submitted:", tx.hash);
        await tx.wait();
        console.log("Swap completed:", tx.hash);
    } catch (error) {
        console.error("Error executing token swap:", error);
    }
}

/**
 * Add liquidity to the liquidity pool
 */
async function addLiquidity(tokenA, tokenB, amountA, amountB) {
    try {
        const contract = await getContract();
        if (!contract) return;

        const tx = await contract.addLiquidity(tokenA, tokenB, amountA, amountB, { gasLimit: 300000 });
        console.log("Add liquidity transaction submitted:", tx.hash);
        await tx.wait();
        console.log("Liquidity added:", tx.hash);
    } catch (error) {
        console.error("Error adding liquidity:", error);
    }
}

/**
 * Fetch and display the token price using Chainlink
 */
async function getPrice(token) {
    try {
        const priceFeedAddress = {
            MATIC: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0",
            USDC: "0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7"
        }[token];

        const priceFeed = new ethers.Contract(priceFeedAddress, [
            {
                inputs: [],
                name: "latestAnswer",
                outputs: [{ internalType: "int256", name: "", type: "int256" }],
                stateMutability: "view",
                type: "function"
            }
        ], provider);

        const price = await priceFeed.latestAnswer();
        const formattedPrice = ethers.utils.formatUnits(price, 8);

        console.log(`${token} price: ${formattedPrice}`);
        return formattedPrice;
    } catch (error) {
        console.error("Error fetching price:", error);
    }
}

/**
 * Update token balance and price
 */
async function updateTokenInfo() {
    const balance = await getTokenBalance();
    const price = await getPrice("ASC");

    document.getElementById("tokenBalance").textContent = `Your ASC Balance: ${balance}`;
    document.getElementById("tokenPrice").textContent = `ASC Price: $${price}`;
}

// Listen for MetaMask events
if (window.ethereum) {
    window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) {
            console.log("MetaMask disconnected");
            disconnectWallet();
        } else {
            console.log(`Account changed to ${accounts[0]}`);
            initialize();
        }
    });

    window.ethereum.on("chainChanged", () => {
        console.log("Network changed");
        window.location.reload();
    });
}

// Initialize UI elements
window.onload = () => {
    setupUI();
};

function setupUI() {
    document.getElementById("connect-wallet").addEventListener("click", initialize);
    document.getElementById("disconnect-wallet").addEventListener("click", disconnectWallet);
}
