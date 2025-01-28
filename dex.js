// Load dependencies

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
const dexAddress = "0xFe47e61f416ff96eCb783b471c7395aBefabb702"; // Assuming this is your contract address on Sepolia
console.log("MetaMask Ethereum provider:", window.ethereum);

let dexContract = null;

// Load the DEX contract
async function loadDexContract() {
    if (dexContract) return dexContract;

    try {
        console.log("Loading DEX ABI...");
        const response = await fetch('./frontend/dexABI.json');
        const { abi: dexABI } = await response.json();
        dexContract = new ethers.Contract(dexAddress, dexABI, signer);
        console.log("DEX contract initialized:", dexContract);
        return dexContract;
    } catch (error) {
        console.error("Failed to load DEX contract:", error);
        return null;
    }
}

// Load ABI dynamically
async function loadABI(filePath) {
    try {
        const response = await fetch(filePath);
        const abi = await response.json();
        console.log(`Loaded ABI from ${filePath}:`, abi);
        if (!Array.isArray(abi.abi)) {
            throw new Error(`ABI at ${filePath} is not formatted as an array`);
        }
        return abi.abi;
    } catch (error) {
        console.error(`Error loading ABI from ${filePath}:`, error);
        return null;
    }
}

// Wallet connection functionality
async function connectWallet() {
    if (window.ethereum) {
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            const accounts = await provider.listAccounts();
            const walletAddress = accounts[0];

            // Verify network (Sepolia)
            const network = await provider.getNetwork();
            if (network.chainId !== 11155111) { // Sepolia's chain ID
                alert("Please switch to Sepolia Testnet to use this DApp.");
                return;
            }
            console.log(`Connected to network: ${network.name}, chainId: ${network.chainId}`);

            document.getElementById("connectWalletButton").textContent = `Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
            document.getElementById("disconnectWalletButton").style.display = "inline-block";
            document.getElementById("connectWalletButton").disabled = true;
        } catch (error) {
            console.error("Failed to connect wallet:", error);
            alert("Failed to connect wallet. Please check if MetaMask is installed and you're on the Sepolia network.");
        }
    } else {
        alert("MetaMask is not installed. Please install it to use this DApp.");
    }
}

// Disconnect wallet functionality
function disconnectWallet() {
    document.getElementById("connectWalletButton").textContent = "Connect Wallet";
    document.getElementById("disconnectWalletButton").style.display = "none";
    document.getElementById("connectWalletButton").disabled = false;
}

// Load token data from sepolia.json
async function loadTokenData() {
    try {
        const response = await fetch('./AscendDEX/deployments/sepolia.json');
        const data = await response.json();
        return data.ModularDEX.tokens;
    } catch (error) {
        console.error("Error loading token data:", error);
        return null;
    }
}

// Get token balance functionality
async function getTokenBalance(token) {
    try {
        const tokens = await loadTokenData();
        const tokenData = tokens[token];
        if (!tokenData) throw new Error(`Token address for ${token} not found`);

        const erc20ABI = await loadABI('./frontend/MockERC20ABI.json');
        if (!erc20ABI) throw new Error("Failed to load ERC20 ABI");

        const tokenContract = new ethers.Contract(tokenData.address, erc20ABI, provider);
        const accounts = await provider.listAccounts();
        const balance = await tokenContract.balanceOf(accounts[0]);

        return ethers.utils.formatUnits(balance, tokenData.decimals);
    } catch (error) {
        console.error(`Error fetching balance for ${token}:`, error);
        return "0";
    }
}

// Update balance display
async function updateBalance(tabPrefix, token) {
    try {
        const balance = await getTokenBalance(token);
        document.getElementById(`${tabPrefix}BalanceDisplay`).textContent = `Available Balance: ${balance}`;
    } catch (error) {
        console.error("Error updating balance:", error);
    }
}

// Initialize page with default tokens
async function initializePage() {
    const tokens = await loadTokenData();
    if(tokens) {
        document.getElementById("swapToken1").value = "POL"; // Default input token
        document.getElementById("swapToken2").value = "ASC"; // Default output token
        document.getElementById("poolToken1").value = "POL";
        document.getElementById("poolToken2").value = "ASC";
        
        updateBalance("swap", "POL"); // Update POL balance for swap
        updateBalance("swap", "ASC"); // Update ASC balance for swap
        updateBalance("pool", "POL"); // Update POL balance for pool
        updateBalance("pool", "ASC"); // Update ASC balance for pool
    }
}

// Tab switching functionality
document.addEventListener("DOMContentLoaded", () => {
    const tabs = document.querySelectorAll(".tab-button");
    const contents = document.querySelectorAll(".tab-content");

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const target = tab.dataset.target;

            contents.forEach((content) => {
                content.style.display = content.id === target ? "block" : "none";
            });
        });
    });

    // Default tab: Swap
    document.getElementById("swap-tab").style.display = "block";

    // Slippage settings
    let slippage = 1; // Default slippage 1%

    function toggleSettingsModal() {
        const modal = document.getElementById("settingsModal");
        modal.style.display = modal.style.display === "none" ? "block" : "none";
    }

    function saveSettings() {
        const newSlippage = document.getElementById("globalSlippage").value;
        if (!newSlippage || parseFloat(newSlippage) <= 0) {
            alert("Please enter a valid slippage tolerance.");
            return;
        }
        slippage = parseFloat(newSlippage);
        localStorage.setItem("slippage", slippage);
        alert("Settings saved!");
        toggleSettingsModal();
    }

    // Event listeners
    document.getElementById("connectWalletButton").addEventListener("click", connectWallet);
    document.getElementById("disconnectWalletButton").addEventListener("click", disconnectWallet);
    document.getElementById("settingsButton").addEventListener("click", toggleSettingsModal);
    document.getElementById("saveSettingsButton").addEventListener("click", saveSettings);

    initializePage(); // Call this function when the page loads
});