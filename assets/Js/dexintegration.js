// Frontend DEX Integration for AscendDEX
console.log("DEX Integration script loaded successfully!");

// Define constants and configurations
const DEX_CONTRACT_ADDRESS = "0x4456b0f017f6bf9b0aa7a0ac3d3f224902a1937a"; // Deployed contract address
const ABI = [
    {
        "constant": true,
        "inputs": [{ "name": "_owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "balance", "type": "uint256" }],
        "type": "function"
    }
];

// Initialize provider and signer
let provider;
let signer;

/**
 * Initialize MetaMask connection and set up provider/signer
 */
async function initialize() {
    if (window.ethereum) {
        try {
            const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
            if (accounts.length === 0) {
                console.error("No accounts found in MetaMask.");
                return;
            }

            // Set up provider and signer
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();

            // Get the connected wallet address
            const address = accounts[0];
            console.log(`Connected to MetaMask: ${address}`);

            // Update UI
            const connectButton = document.getElementById('connect-wallet');
            const disconnectButton = document.getElementById('disconnect-wallet');
            const addToMetaMaskButton = document.getElementById('addToMetaMaskButton');

            connectButton.textContent = `Connected: ${address.substring(0, 6)}...${address.slice(-4)}`;
            connectButton.style.backgroundColor = "#28a745"; // Green when connected
            disconnectButton.style.display = 'inline-block';
            addToMetaMaskButton.style.display = 'inline-block';

        } catch (error) {
            console.error("Error connecting to MetaMask:", error);
            alert("Failed to connect to MetaMask. Please try again.");
        }
    } else {
        console.error("MetaMask not detected.");
        alert("MetaMask is not installed. Please install MetaMask to use this feature.");
    }
}

/**
 * Disconnect wallet and reset UI
 */
function disconnectWallet() {
    // Reset provider and signer
    provider = null;
    signer = null;

    // Reset UI
    const connectButton = document.getElementById('connect-wallet');
    const disconnectButton = document.getElementById('disconnect-wallet');
    const addToMetaMaskButton = document.getElementById('addToMetaMaskButton');

    connectButton.textContent = "Connect Wallet";
    connectButton.style.backgroundColor = "#007bff"; // Default blue
    disconnectButton.style.display = 'none';
    addToMetaMaskButton.style.display = 'none';

    console.log("Disconnected from MetaMask.");
}

/**
 * Connect to the deployed contract using the provider and signer
 */
async function getContract() {
    if (!provider || !DEX_CONTRACT_ADDRESS || !ABI.length) {
        console.error("Ensure provider, contract address, and ABI are set up");
        return null;
    }
    return new ethers.Contract(DEX_CONTRACT_ADDRESS, ABI, signer);
}

/**
 * Fetch and display the token balance of the connected wallet
 */
async function getTokenBalance() {
    try {
        const contract = await getContract();
        if (!contract) return;

        const address = await signer.getAddress();
        const balance = await contract.balanceOf(address);
        console.log("Token Balance:", ethers.utils.formatUnits(balance, 18));
        return ethers.utils.formatUnits(balance, 18);
    } catch (error) {
        console.error("Error fetching token balance:", error);
    }
}

/**
 * Swap tokens using the deployed DEX contract
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
 * Add liquidity to the DEX liquidity pool
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
 * Fetch the current price of a token using Chainlink Price Feeds
 */
async function getPrice(token) {
    try {
        const priceFeedAddress = {
            "MATIC": "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0",
            "USDC": "0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7"
        }[token];

        const priceFeed = new ethers.Contract(priceFeedAddress, [
            {
                "inputs": [],
                "name": "latestAnswer",
                "outputs": [{ "internalType": "int256", "name": "", "type": "int256" }],
                "stateMutability": "view",
                "type": "function"
            }
        ], provider);

        const price = await priceFeed.latestAnswer();
        console.log(`${token} price:`, ethers.utils.formatUnits(price, 8));
        return ethers.utils.formatUnits(price, 8);
    } catch (error) {
        console.error("Error fetching price data:", error);
    }
}

/**
 * Fetch and log pool information
 */
async function getPoolInfo() {
    try {
        const contract = await getContract();
        if (!contract) return;

        const poolData = await contract.getPoolInfo();
        console.log("Pool Information:", poolData);
    } catch (error) {
        console.error("Error fetching pool info:", error);
    }
}

// Listen for MetaMask events
if (window.ethereum) {
    window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) {
            console.log("MetaMask disconnected");
            disconnectWallet();
        } else {
            console.log("Connected to account:", accounts[0]);
            initialize();
        }
    });

    window.ethereum.on("chainChanged", (chainId) => {
        console.log("Network changed to:", chainId);
        window.location.reload();
    });
}

// UI Elements and Event Listeners
async function setupUI() {
    document.getElementById("connect-wallet").addEventListener("click", initialize);
    document.getElementById("disconnect-wallet").addEventListener("click", disconnectWallet);
}

// Initialize everything when the document loads
window.onload = async () => {
    setupUI();
};
