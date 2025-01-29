// Load dependencies
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
const dexAddress = "0xFe47e61f416ff96eCb783b471c7395aBefabb702";
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
        return abi.abi;
    } catch (error) {
        console.error(`Error loading ABI from ${filePath}:`, error);
        return null;
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // Connect Wallet Button click event
    document.getElementById('connectWalletButton').addEventListener('click', connectWallet);
    // Disconnect Wallet Button click event
    document.getElementById('disconnectWalletButton').addEventListener('click', disconnectWallet);
});

// Connect Wallet function
async function connectWallet() {
    console.log("connectWallet() function started...");

    if (window.ethereum) {
        try {
            console.log("Checking network...");
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            console.log("Chain ID:", chainId);

            if (chainId !== '0xaa36a7') {
                alert("Please switch to the Sepolia test network in MetaMask.");
                return;
            }

            console.log("Requesting accounts...");
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

            if (accounts.length === 0) {
                console.warn("No accounts found. Please check MetaMask.");
                return;
            }

            const walletAddress = accounts[0];
            console.log("Wallet Address:", walletAddress);

            // ✅ Log where provider and signer are being assigned
            console.log("Initializing provider and signer...");
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();

            console.log("Fetching ETH balance...");
            const balanceWei = await provider.getBalance(walletAddress);
            const balanceEth = ethers.utils.formatEther(balanceWei);
            console.log("ETH Balance:", balanceEth);

            // Update UI
            document.getElementById("connectWalletButton").textContent = `Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
            document.getElementById("connectWalletButton").disabled = true;
            document.getElementById("disconnectWalletButton").style.display = "inline-block";

            console.log("Wallet Connected Successfully.");

        } catch (error) {
            console.error("Error connecting to wallet:", error);
        }
    } else {
        alert("MetaMask is not installed. Please install it to connect your wallet.");
    }
}



function disconnectWallet() {
    // Reset UI when disconnecting
    document.getElementById("connectWalletButton").textContent = "Connect Wallet";
    document.getElementById("disconnectWalletButton").style.display = "none";
    document.getElementById("connectWalletButton").disabled = false;
    document.getElementById("walletBalance").textContent = "Balance: --";

    console.log("Wallet disconnected.");
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

// Get token balance
async function getTokenBalance(token) {
    try {
        if (!provider) {
            console.warn(`Skipping balance fetch for ${token}: No wallet connected.`);
            return "0";  // Prevents unnecessary errors
        }

        const tokens = await loadTokenData();
        const tokenData = tokens[token];

        if (!tokenData) {
            throw new Error(`Token address for ${token} not found`);
        }

        const erc20ABI = await loadABI('./frontend/MockERC20ABI.json');
        const tokenContract = new ethers.Contract(tokenData.address, erc20ABI, provider);

        const accounts = await provider.listAccounts();
        if (accounts.length === 0) {
            console.warn(`Skipping balance fetch for ${token}: No wallet connected.`);
            return "0";  // No connected account
        }

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
        const balance = await getTokenBalance(token1);
        document.getElementById(`${tabPrefix}BalanceDisplay`).textContent = `Available Balance: ${balance}`;
    } catch (error) {
        console.error("Error updating balance:", error);
    }
}

// Reverse tokens in Swap or Pool tabs
function reverseTokens(tabPrefix) {
    const token1 = document.getElementById(`${tabPrefix}Token1`);
    const token2 = document.getElementById(`${tabPrefix}Token2`);
    const tempValue = token1.value;
    token1.value = token2.value;
    token2.value = tempValue;

    updateBalance(tabPrefix);
    estimateOutput(tabPrefix);
}

// Estimate token output for swaps or pools
async function estimateOutput(tabPrefix) {
    try {
        const token1 = document.getElementById(`${tabPrefix}Token1`).value;
        const token2 = document.getElementById(`${tabPrefix}Token2`).value;
        const amount1 = document.getElementById(`${tabPrefix}Amount1`).value;

        if (!amount1 || parseFloat(amount1) <= 0) {
            document.getElementById(`${tabPrefix}EstimatedOutput`).textContent = "Estimated Output: --";
            return;
        }

        const dex = await loadDexContract();
        const tokens = await loadTokenData();
        const token1Data = tokens[token1];
        const token2Data = tokens[token2];

        const parsedAmountIn = ethers.utils.parseUnits(amount1, token1Data.decimals);
        const amountOut = await dex.estimateOutput(parsedAmountIn, token1Data.address, token2Data.address);

        const formattedAmountOut = ethers.utils.formatUnits(amountOut, token2Data.decimals);
        document.getElementById(`${tabPrefix}EstimatedOutput`).textContent = `Estimated Output: ${formattedAmountOut} ${token2.toUpperCase()}`;
    } catch (error) {
        console.error("Error estimating output:", error);
        document.getElementById(`${tabPrefix}EstimatedOutput`).textContent = "Estimated Output: --";
    }
}

// Add liquidity with gas management
async function handleAddLiquidity() {
    try {
        const token1 = document.getElementById("poolToken1").value;
        const token2 = document.getElementById("poolToken2").value;
        const amount1 = document.getElementById("poolAmount1").value;
        const amount2 = document.getElementById("poolAmount2").value;

        if (!token1 || !token2 || token1 === token2 || !amount1 || !amount2) {
            alert("Invalid input. Ensure all fields are filled and tokens are different.");
            return;
        }

        const tokens = await loadTokenData();
        const token1Data = tokens[token1];
        const token2Data = tokens[token2];

        const erc20ABI = await loadABI('./frontend/MockERC20ABI.json');
        const token1Contract = new ethers.Contract(token1Data.address, erc20ABI, signer);
        const token2Contract = new ethers.Contract(token2Data.address, erc20ABI, signer);

        await token1Contract.approve(dexAddress, ethers.utils.parseUnits(amount1, token1Data.decimals));
        await token2Contract.approve(dexAddress, ethers.utils.parseUnits(amount2, token2Data.decimals));

        const dex = await loadDexContract();

        // Custom gas settings for adding liquidity
        const gasLimit = 250000; // Adjust based on complexity
        const gasPrice = await provider.getGasPrice();

        await dex.addLiquidity(token1, token2, ethers.utils.parseUnits(amount1, token1Data.decimals), ethers.utils.parseUnits(amount2, token2Data.decimals), {
            gasLimit: gasLimit,
            gasPrice: gasPrice
        });

        alert("Liquidity added successfully!");
    } catch (error) {
        console.error("Error adding liquidity:", error);
        alert("Failed to add liquidity. Check console for details.");
    }
}


// Slippage and swap functionality
let slippage = 1;

function toggleSettingsModal() {
    const modal = document.getElementById("settingsModal");
    modal.style.display = modal.style.display === "none" ? "block" : "none";
}

function saveSettings() {
    const slippageInput = document.getElementById("globalSlippage").value;
    if (slippageInput && parseFloat(slippageInput) > 0) {
        slippage = parseFloat(slippageInput);
        alert("Settings saved!");
    } else {
        alert("Invalid slippage value.");
    }
}

function updateSlippageValue(value) {
    document.getElementById("slippageValueDisplay").textContent = `Current Slippage: ${value}%`;
}

document.getElementById("saveSettingsButton").addEventListener("click", () => {
    const slippage = parseFloat(document.getElementById("slippageRange").value);
    localStorage.setItem("slippage", slippage);
    alert(`Slippage tolerance set to ${slippage}%`);
    document.getElementById("settingsModal").style.display = "none";
});


// Swap tokens with custom gas settings
async function swapTokens() {
    try {
        const token1 = document.getElementById("swapToken1").value;
        const token2 = document.getElementById("swapToken2").value;
        const amount1 = document.getElementById("swapAmount1").value;

        if (!token1 || !token2 || token1 === token2 || !amount1) {
            alert("Invalid input. Ensure all fields are filled and tokens are different.");
            return;
        }

        const tokens = await loadTokenData();
        const token1Data = tokens[token1];
        const token2Data = tokens[token2];

        const parsedAmountIn = ethers.utils.parseUnits(amount1, token1Data.decimals);
        const minAmountOut = parsedAmountIn.mul(100 - slippage).div(100);

        const dex = await loadDexContract();

        // Custom gas settings
        const gasLimit = 200000; // Adjust this depending on the function complexity
        const gasPrice = await provider.getGasPrice(); // You can also set this manually

        await dex.swap(token1, token2, parsedAmountIn, minAmountOut, slippage, {
            gasLimit: gasLimit,
            gasPrice: gasPrice // Use current gas price
        });

        alert("Swap completed successfully!");
    } catch (error) {
        console.error("Error swapping tokens:", error);
        alert("Failed to complete swap. Check console for details.");
    }
}



// Tab switching functionality
document.addEventListener("DOMContentLoaded", () => {
    const tabs = document.querySelectorAll(".tab-button");
    const contents = document.querySelectorAll(".tab-content");

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const target = tab.dataset.target;

            tabs.forEach((t) => t.classList.remove("active")); // Remove active class from all tabs
            tab.classList.add("active"); // Add active class to the clicked tab

            contents.forEach((content) => {
                content.style.display = content.id === target ? "block" : "none";
            });
        });
    });

    // Default tab: Show Swap Tab
    document.querySelector('[data-target="swap-tab"]').click();
});

// Settings Modal Toggle
document.addEventListener("DOMContentLoaded", () => {
    const settingsModal = document.getElementById("settingsModal");
    const closeSettingsButton = document.getElementById("closeSettingsButton");

    // Event listener for the Close button in the modal
    closeSettingsButton.addEventListener("click", () => {
        settingsModal.style.display = "none";
    });
});
// Dynamically populate token drop-downs
async function populateTokenDropdowns() {
    try {
        const tokens = await loadTokenData();
        if (!tokens || Object.keys(tokens).length === 0) {
            console.error("populateTokenDropdowns: No tokens found.");
            return;
        }

        const swapToken1 = document.getElementById("swapToken1");
        const swapToken2 = document.getElementById("swapToken2");
        const poolToken1 = document.getElementById("poolToken1");
        const poolToken2 = document.getElementById("poolToken2");

        if (!swapToken1 || !swapToken2) {
            console.error("populateTokenDropdowns: Token dropdown elements not found.");
            return;
        }

        // Clear existing options
        [swapToken1, swapToken2, poolToken1, poolToken2].forEach(dropdown => dropdown.innerHTML = "");

        // Populate the dropdowns
        Object.keys(tokens).forEach(token => {
            [swapToken1, swapToken2, poolToken1, poolToken2].forEach(dropdown => {
                const option = document.createElement("option");
                option.value = token;
                option.textContent = token;
                dropdown.appendChild(option);
            });
        });

        console.log("Token dropdowns populated.");
        
        // ✅ Call setDefaultPair only after tokens are populated
        setDefaultPair();

    } catch (error) {
        console.error("Error populating token dropdowns:", error);
    }
}

function updateSwapDetails() {
    try {
        const token1Element = document.getElementById("swapToken1");
        const token2Element = document.getElementById("swapToken2");

        if (!token1Element || !token2Element) {
            console.error("updateSwapDetails: Token dropdowns not found in the DOM.");
            return;
        }

        const token1 = token1Element.value;
        const token2 = token2Element.value;

        if (!token1 || !token2) {
            console.error("updateSwapDetails: One or both tokens not selected.");
            return;
        }

        // Call estimateOutput to update estimated swap amount
        estimateOutput("swap");

        // Update balance display
        updateBalance("swap");

        console.log(`Swap details updated: ${token1} -> ${token2}`);
    } catch (error) {
        console.error("Error updating swap details:", error);
    }
}

// Call this function when the page loads
document.addEventListener("DOMContentLoaded", () => {
    populateTokenDropdowns();
});

function setDefaultPair() {
    let inputElement = document.getElementById('swapToken1');
    let outputElement = document.getElementById('swapToken2');

    if (!inputElement || !outputElement) {
        console.error("setDefaultPair: Token dropdowns not found.");
        return;
    }

    // Ensure tokens are populated before setting defaults
    if (inputElement.options.length === 0 || outputElement.options.length === 0) {
        console.error("setDefaultPair: Token dropdowns are empty.");
        return;
    }

    inputElement.value = 'POL';  // Set default input token to POL
    outputElement.value = 'ASC'; // Set default output token to ASC

    console.log("Default pair set: POL -> ASC");

    updateSwapDetails(); // Ensure this only runs when tokens are available
}




// Tab switching and initialization
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("swap-tab").style.display = "block";
    document.getElementById("settingsButton").addEventListener("click", toggleSettingsModal);
    document.getElementById("saveSettingsButton").addEventListener("click", saveSettings);
    document.getElementById("swapButton").addEventListener("click", swapTokens);
    document.getElementById("addLiquidityButton").addEventListener("click", handleAddLiquidity);
});
