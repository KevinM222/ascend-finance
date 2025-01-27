// Load dependencies
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
const dexAddress = "0x735b7eEe2005a2C0E51827329ECCfC2163F2AfFF";
console.log("MetaMask Ethereum provider:", window.ethereum);
<script src="dex.js" defer></script>

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

            // Verify network
            const network = await provider.getNetwork();
            console.log(`Connected to network: ${network.name}, chainId: ${network.chainId}`);

            document.getElementById("connectWalletButton").textContent = `Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
            document.getElementById("disconnectWalletButton").style.display = "inline-block";
            document.getElementById("connectWalletButton").disabled = true;
        } catch (error) {
            console.error("Failed to connect wallet:", error);
            alert("Failed to connect wallet.");
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
async function updateBalance(tabPrefix) {
    try {
        const token1 = document.getElementById(`${tabPrefix}Token1`).value;
        const balance = await getTokenBalance(token1);
        document.getElementById(`${tabPrefix}BalanceDisplay`).textContent = `Available Balance: ${balance}`;
    } catch (error) {
        console.error("Error updating balance:", error);
    }
}

// Reverse token functionality
function reverseTokens(tabPrefix) {
    const token1 = document.getElementById(`${tabPrefix}Token1`);
    const token2 = document.getElementById(`${tabPrefix}Token2`);
    const tempValue = token1.value;
    token1.value = token2.value;
    token2.value = tempValue;

    updateBalance(tabPrefix);
    estimateOutput(tabPrefix);
}

// Estimate output functionality
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

// Handle adding liquidity
async function handleAddLiquidity() {
    console.log("handleAddLiquidity function called.");
    try {
        // Retrieve input values
        const token1 = document.getElementById("poolToken1").value;
        const token2 = document.getElementById("poolToken2").value;
        let amount1 = document.getElementById("poolAmount1").value;
        let amount2 = document.getElementById("poolAmount2").value;

        // Validate inputs
        if (!token1 || !token2 || (!amount1 && !amount2)) {
            alert("Please fill in all fields.");
            return;
        }

        if (token1 === token2) {
            alert("Token1 and Token2 cannot be the same.");
            return;
        }

        // Load token data
        const tokens = await loadTokenData();

        if (!tokens[token1] || !tokens[token2]) {
            alert("Invalid tokens selected.");
            return;
        }

        // Calculate missing amounts if necessary
        if (!amount1) {
            amount1 = await calculateOtherAmount(tokens[token2], tokens[token1], amount2);
            document.getElementById("poolAmount1").value = amount1;
        } else if (!amount2) {
            amount2 = await calculateOtherAmount(tokens[token1], tokens[token2], amount1);
            document.getElementById("poolAmount2").value = amount2;
        }

        // Check wallet balances
        const balance1 = await getTokenBalance(token1);
        const balance2 = await getTokenBalance(token2);

        if (parseFloat(amount1) > parseFloat(balance1) || parseFloat(amount2) > parseFloat(balance2)) {
            alert("Insufficient token balance.");
            return;
        }

        // Approve tokens for transfer
        const erc20ABI = await loadABI('./frontend/MockERC20ABI.json');
        const token1Contract = new ethers.Contract(tokens[token1].address, erc20ABI, signer);
        const token2Contract = new ethers.Contract(tokens[token2].address, erc20ABI, signer);

        console.log("Approving tokens...");
        const approveTx1 = await token1Contract.approve(dexAddress, ethers.utils.parseUnits(amount1, tokens[token1].decimals));
        await approveTx1.wait();
        const approveTx2 = await token2Contract.approve(dexAddress, ethers.utils.parseUnits(amount2, tokens[token2].decimals));
        await approveTx2.wait();

        console.log("Tokens approved successfully!");

        // Call `addLiquidity` on the contract
        const parsedAmount1 = ethers.utils.parseUnits(amount1, tokens[token1].decimals);
        const parsedAmount2 = ethers.utils.parseUnits(amount2, tokens[token2].decimals);
        const dex = await loadDexContract();

        const tx = await dex.addLiquidity(token1, token2, parsedAmount1, parsedAmount2);
        await tx.wait();

        alert("Liquidity added successfully!");
    } catch (error) {
        console.error("Error in handleAddLiquidity:", error);
        alert("Failed to add liquidity. Check the console for details.");
    }
}


// Swap tokens functionality
// Toggle settings modal
function toggleSettingsModal() {
    const modal = document.getElementById("settingsModal");
    modal.style.display = modal.style.display === "none" ? "block" : "none";
}

// Save settings (for now, just slippage)
function saveSettings() {
    const slippage = document.getElementById("globalSlippage").value;
    if (!slippage || parseFloat(slippage) <= 0) {
        alert("Please enter a valid slippage tolerance.");
        return;
    }
    localStorage.setItem("slippage", slippage); // Save to local storage
    alert("Settings saved!");
    toggleSettingsModal();
}

// Retrieve slippage from settings
function getSlippage() {
    return parseFloat(localStorage.getItem("slippage") || "1"); // Default to 1% if not set
}

// Use global slippage in functions
async function swapTokens() {
    try {
        const token1 = document.getElementById("token1").value;
        const token2 = document.getElementById("token2").value;
        const amount1 = document.getElementById("amount1").value;
        const slippage = getSlippage(); // Retrieve saved slippage

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

        const parsedAmountIn = ethers.utils.parseUnits(amount1, token1Data.decimals);

        // Estimate output and calculate minimum amount with slippage
        const estimatedAmountOut = await dex.estimateOutput(parsedAmountIn, token1, token2);
        const slippageAdjustedAmountOut = estimatedAmountOut.sub(
            estimatedAmountOut.mul(Math.round(slippage * 100)).div(10000)
        );

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
        alert("Swap failed. Check console for details.");
    }
}


// Calculate other token amount based on price
async function calculateOtherAmount(tokenFrom, tokenTo, amountFrom) {
    try {
        const dex = await loadDexContract();
        const priceFrom = await dex.getPrice(tokenFrom.address);
        const priceTo = await dex.getPrice(tokenTo.address);

        const calculatedAmount = (amountFrom * priceFrom) / priceTo;
        console.log(`Calculated equivalent amount: ${calculatedAmount}`);
        return calculatedAmount.toFixed(6);
    } catch (error) {
        console.error("Error calculating other amount:", error);
        alert("Failed to calculate the required token amount.");
        return null;
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

    // Event listeners for Swap
    document.getElementById("swapButton").addEventListener("click", swapTokens);
    document.getElementById("reverseButton").addEventListener("click", () => reverseTokens("swap"));
    document.getElementById("swapAmount1").addEventListener("input", () => estimateOutput("swap"));
    document.getElementById("swapToken1").addEventListener("change", () => updateBalance("swap"));
    document.getElementById("swapToken2").addEventListener("change", () => estimateOutput("swap"));

    // Event listeners for Pools
    document.getElementById("addLiquidityButton").addEventListener("click", handleAddLiquidity);
    document.getElementById("poolAmount1").addEventListener("input", () => estimateOutput("pool"));
    document.getElementById("poolToken1").addEventListener("change", () => updateBalance("pool"));
    document.getElementById("poolToken2").addEventListener("change", () => estimateOutput("pool"));

    // Attach event listeners for slippage settings
document.addEventListener("DOMContentLoaded", () => {
    const settingsButton = document.getElementById("settingsButton");
    const slippageModal = document.getElementById("slippageModal");
    const closeSettingsButton = document.getElementById("closeSettingsButton");

    settingsButton.addEventListener("click", () => {
        slippageModal.style.display = "block";
    });

    closeSettingsButton.addEventListener("click", () => {
        slippageModal.style.display = "none";
    });

    // Save slippage settings
    document.getElementById("saveSettingsButton").addEventListener("click", saveSettings);

    //add event listener for connectwalletbutton
    document.addEventListener("DOMContentLoaded", () => {
        const connectWalletButton = document.getElementById("connectWalletButton");
        const settingsButton = document.getElementById("settingsButton");
    
        if (connectWalletButton) {
            console.log("Connect Wallet button found and event listener attached.");
            connectWalletButton.addEventListener("click", connectWallet);
        } else {
            console.error("Connect Wallet button not found.");
        }
    
        if (settingsButton) {
            console.log("Settings button found and event listener attached.");
            settingsButton.addEventListener("click", toggleSettingsModal);
        } else {
            console.error("Settings button not found.");
        }
    });
    
});

});
