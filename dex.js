// Load dependencies
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
const dexAddress = "0x735b7eEe2005a2C0E51827329ECCfC2163F2AfFF";

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
async function updateBalance() {
    try {
        const token1 = document.getElementById("token1").value;
        const balance = await getTokenBalance(token1);
        document.getElementById("balanceDisplay").textContent = `Available Balance: ${balance}`;
    } catch (error) {
        console.error("Error updating balance:", error);
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

// Estimate output functionality
async function estimateOutput() {
    try {
        const token1 = document.getElementById("token1").value;
        const token2 = document.getElementById("token2").value;
        const amount1 = document.getElementById("amount1").value;

        if (!amount1 || parseFloat(amount1) <= 0) {
            document.getElementById("estimatedOutput").textContent = "Estimated Output: --";
            return;
        }

        const dex = await loadDexContract();
        const tokens = await loadTokenData();
        const token1Data = tokens[token1];
        const token2Data = tokens[token2];

        const parsedAmountIn = ethers.utils.parseUnits(amount1, token1Data.decimals);
        const amountOut = await dex.estimateOutput(parsedAmountIn, token1Data.address, token2Data.address);

        const formattedAmountOut = ethers.utils.formatUnits(amountOut, token2Data.decimals);
        document.getElementById("estimatedOutput").textContent = `Estimated Output: ${formattedAmountOut} ${token2.toUpperCase()}`;
    } catch (error) {
        console.error("Error estimating output:", error);
        document.getElementById("estimatedOutput").textContent = "Estimated Output: --";
    }
}

// Handle adding liquidity
async function handleAddLiquidity() {
    try {
        const token1 = document.getElementById("token1").value;
        const token2 = document.getElementById("token2").value;
        const amount1 = document.getElementById("amount1").value;
        const amount2 = document.getElementById("amount2").value;

        if (!token1 || !token2 || !amount1 || !amount2) {
            alert("Please fill in all fields.");
            return;
        }

        const tokens = await loadTokenData();
        const erc20ABI = await loadABI('./frontend/MockERC20ABI.json');
        const token1Contract = new ethers.Contract(tokens[token1].address, erc20ABI, signer);
        const token2Contract = new ethers.Contract(tokens[token2].address, erc20ABI, signer);

        console.log("Approving tokens...");
        await token1Contract.approve(dexAddress, ethers.utils.parseUnits(amount1, tokens[token1].decimals));
        await token2Contract.approve(dexAddress, ethers.utils.parseUnits(amount2, tokens[token2].decimals));

        const dex = await loadDexContract();
        await dex.addLiquidity(token1, token2, ethers.utils.parseUnits(amount1, tokens[token1].decimals), ethers.utils.parseUnits(amount2, tokens[token2].decimals));

        alert("Liquidity added successfully!");
    } catch (error) {
        console.error("Error in handleAddLiquidity:", error);
        alert("Failed to add liquidity. Check the console for details.");
    }
}

// Attach event listeners
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
