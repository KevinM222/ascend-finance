// Load dependencies
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
const dexAddress = "0xD38f2f760f768Acd8122651baf3edfbD2814c1AF";

let dexContract = null;

// Load the DEX contract
async function loadDexContract() {
    if (dexContract) return dexContract;

    try {
        console.log("Loading DEX ABI...");
        const response = await fetch('./frontend/dexABI.json');
        const { abi: dexABI } = await response.json(); // Load the ABI
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
        console.log(`Loaded ABI from ${filePath}:`, abi); // Debug log
        if (!Array.isArray(abi.abi)) {
            throw new Error(`ABI at ${filePath} is not formatted as an array`);
        }
        return abi.abi; // Return the array inside the "abi" field
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
        const tokens = await loadTokenData(); // Load token data
        const tokenData = tokens[token];
        if (!tokenData) throw new Error(`Token address for ${token} not found`);

        const erc20ABI = await loadABI('./frontend/MockERC20ABI.json'); // Load the ABI
        if (!erc20ABI) throw new Error("Failed to load ERC20 ABI");

        const tokenContract = new ethers.Contract(tokenData.address, erc20ABI, provider);
        const accounts = await provider.listAccounts();
        const balance = await tokenContract.balanceOf(accounts[0]);

        return ethers.utils.formatUnits(balance, tokenData.decimals); // Format balance
    } catch (error) {
        console.error(`Error fetching balance for ${token}:`, error);
        return "0";
    }
}


// Update balance display
async function updateBalance() {
    const token1 = document.getElementById("token1").value;
    const balance = await getTokenBalance(token1);
    document.getElementById("balanceDisplay").textContent = `Available Balance: ${balance}`;
}

// Get reserves for token pair
async function getReserves(token1, token2) {
    try {
        const dex = await loadDexContract();
        const pairKey = ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(["string", "string"], [token1, token2])
        );
        const reserves = await dex.pairs(pairKey);
        console.log(`Reserves for ${token1}-${token2}:`, reserves);
        return reserves;
    } catch (error) {
        console.error("Error fetching reserves:", error);
        return null;
    }
}

// Estimate output functionality
async function estimateOutput() {
    const token1 = document.getElementById("token1").value; // Input token symbol (e.g., "ASC")
    const token2 = document.getElementById("token2").value; // Output token symbol (e.g., "POL")
    const amount1 = document.getElementById("amount1").value; // Input amount

    // Validate input amount
    if (!amount1 || parseFloat(amount1) <= 0) {
        document.getElementById("estimatedOutput").textContent = "Estimated Output: --";
        return;
    }

    try {
        const dex = await loadDexContract(); // Load the DEX contract
        if (!dex) throw new Error("DEX contract not loaded.");

        const tokens = await loadTokenData(); // Load token data from sepolia.json
        if (!tokens) throw new Error("Failed to load token data.");

        // Resolve token details
        const token1Data = tokens[token1];
        const token2Data = tokens[token2];
        if (!token1Data || !token2Data) {
            throw new Error(`Invalid token symbol(s): ${token1}, ${token2}`);
        }

        const token1Address = token1Data.address;
        const token2Address = token2Data.address;

        // Parse the input amount to the correct format (using token1 decimals)
        const parsedAmountIn = ethers.utils.parseUnits(amount1, token1Data.decimals);

        console.log("Estimating output with the following parameters:");
        console.log(`Token1 Address: ${token1Address}`);
        console.log(`Token2 Address: ${token2Address}`);
        console.log(`Input Amount: ${parsedAmountIn.toString()}`);

        // Call the contract's estimateOutput function
        const amountOut = await dex.estimateOutput(parsedAmountIn, token1Address, token2Address);

        // Format the output amount (using token2 decimals)
        const formattedAmountOut = ethers.utils.formatUnits(amountOut, token2Data.decimals);

        // Display the result
        document.getElementById("estimatedOutput").textContent =
            `Estimated Output: ${formattedAmountOut} ${token2.toUpperCase()}`;
    } catch (error) {
        console.error("Error estimating output:", error);
        document.getElementById("estimatedOutput").textContent = "Estimated Output: --";
    }
}



// Reverse token functionality
function reverseTokens() {
    const token1 = document.getElementById("token1");
    const token2 = document.getElementById("token2");
    const tempValue = token1.value;
    token1.value = token2.value;
    token2.value = tempValue;

    updateBalance();
    estimateOutput();
}

// Swap tokens functionality
async function swapTokens() {
    const token1 = document.getElementById("token1").value;
    const token2 = document.getElementById("token2").value;
    const amount1 = document.getElementById("amount1").value;

    if (!token1 || !token2 || !amount1) {
        alert("Please select tokens and enter a valid amount.");
        return;
    }
    if (token1 === token2) {
        alert("You cannot swap the same tokens. Please select different tokens.");
        return;
    }

    try {
        const dex = await loadDexContract();
        const tx = await dex.swap(
            token1,
            token2,
            ethers.utils.parseUnits(amount1, 18), // Use correct decimals for token1
            0 // Min output (set to 0 for testing)
        );
        await tx.wait();
        alert("Swap successful!");
    } catch (error) {
        console.error("Error during swap:", error);
        alert("Swap failed. Check console for details.");
    }
}

// Function to add liquidity to the DEX
async function addLiquidity(token1, token2, amount1, amount2) {
    try {
        const dex = await loadDexContract(); // Load the DEX contract

        // Parse amounts to the correct format (adjust decimals as needed)
        const parsedAmount1 = ethers.utils.parseUnits(amount1, 18); // Adjust decimals for token1
        const parsedAmount2 = ethers.utils.parseUnits(amount2, 18); // Adjust decimals for token2

        // Call the `addLiquidity` function on the contract
        const tx = await dex.addLiquidity(
            token1, // Token1 address
            token2, // Token2 address
            parsedAmount1, // Token1 amount
            parsedAmount2  // Token2 amount
        );

        console.log("Transaction sent:", tx.hash);
        await tx.wait(); // Wait for the transaction to be mined
        console.log(`Liquidity added successfully for pair: ${token1} - ${token2}`);
        alert("Liquidity added successfully!");
    } catch (error) {
        console.error("Error adding liquidity:", error);
        alert("Failed to add liquidity. Check console for details.");
    }
}



// Attach event listeners after DOM content is loaded
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("connectWalletButton").addEventListener("click", connectWallet);
    document.getElementById("disconnectWalletButton").addEventListener("click", disconnectWallet);
    document.getElementById("swapButton").addEventListener("click", swapTokens);
    document.getElementById("reverseButton").addEventListener("click", reverseTokens);
    document.getElementById("amount1").addEventListener("input", estimateOutput);
    document.getElementById("token1").addEventListener("change", updateBalance);
    document.getElementById("token1").addEventListener("change", estimateOutput);
    document.getElementById("token2").addEventListener("change", estimateOutput);
});
