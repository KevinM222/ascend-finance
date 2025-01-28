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
let erc20ABI = null;

async function loadABI(filePath) {
    if (erc20ABI) return erc20ABI;
    try {
        const response = await fetch(filePath);
        const abi = await response.json();
        console.log(`Loaded ABI from ${filePath}:`, abi);
        if (!Array.isArray(abi.abi)) {
            throw new Error(`ABI at ${filePath} is not formatted as an array`);
        }
        erc20ABI = abi.abi; // Cache the ABI
        return erc20ABI;
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
        console.log("Loaded token data:", data.ModularDEX.tokens);
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
        if (!tokenData || !tokenData.address) {
            throw new Error(`Invalid token data for ${token}: ${JSON.stringify(tokenData)}`);
        }

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
async function updateBalance(tabPrefix) {
    try {
        const token1 = document.getElementById(`${tabPrefix}Token1`).value;
        const balanceDisplay = document.getElementById(`${tabPrefix}BalanceDisplay`);
        
        if (!balanceDisplay) {
            console.warn(`Balance display element not found for prefix ${tabPrefix}`);
            return;
        }

        const balance = await getTokenBalance(token1);
        balanceDisplay.textContent = `Available Balance: ${balance}`;
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

    async function swapTokens() {
        try {
            const token1 = document.getElementById("swapToken1").value;
            const token2 = document.getElementById("swapToken2").value;
            const amount1 = document.getElementById("swapAmount1").value;
    
            if (!token1 || !token2 || !amount1) {
                alert("Please select tokens and enter a valid amount.");
                return;
            }
    
            if (token1 === token2) {
                alert("You cannot swap the same tokens. Please select different tokens.");
                return;
            }
    
            const dex = await loadDexContract();
            const tokens = await loadTokenData();
    
            const token1Data = tokens[token1];
            const token2Data = tokens[token2];
            if (!token1Data || !token2Data) {
                alert("Invalid token data.");
                return;
            }
    
            const parsedAmountIn = ethers.utils.parseUnits(amount1, token1Data.decimals);
    
            // Estimate output amount
            const estimatedAmountOut = await dex.estimateOutput(parsedAmountIn, token1Data.address, token2Data.address);
    
            // Calculate minimum amount out with slippage
            const slippageAdjustedAmountOut = estimatedAmountOut.sub(
                estimatedAmountOut.mul(Math.round(slippage * 100)).div(10000)
            );
    
            console.log(`Estimated Output: ${ethers.utils.formatUnits(estimatedAmountOut, token2Data.decimals)}`);
            console.log(`Minimum Output (with ${slippage}% slippage): ${ethers.utils.formatUnits(slippageAdjustedAmountOut, token2Data.decimals)}`);
    
            // Approve token1 for the DEX
            const erc20ABI = await loadABI('./frontend/MockERC20ABI.json');
            const token1Contract = new ethers.Contract(token1Data.address, erc20ABI, signer);
    
            console.log("Approving token1...");
            const approveTx = await token1Contract.approve(dexAddress, parsedAmountIn);
            await approveTx.wait();
    
            console.log("Approval successful!");
    
            // Execute the swap
            console.log("Executing swap...");
            const tx = await dex.swap(
                token1,
                token2,
                parsedAmountIn,
                slippageAdjustedAmountOut
            );
            await tx.wait();
    
            alert("Swap successful!");
        } catch (error) {
            console.error("Error during swap:", error);
            alert("Swap failed. Check the console for details.");
        }
    }

    // Save settings
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

// Retrieve slippage
function getSlippage() {
    return parseFloat(localStorage.getItem("slippage") || "1"); // Default to 1% if not set
}


    
    // Event listeners
    document.getElementById("connectWalletButton").addEventListener("click", connectWallet);
    document.getElementById("disconnectWalletButton").addEventListener("click", disconnectWallet);
    document.getElementById("settingsButton").addEventListener("click", toggleSettingsModal);
    document.getElementById("saveSettingsButton").addEventListener("click", saveSettings);

    initializePage(); // Call this function when the page loads
});