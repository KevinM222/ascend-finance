// Load dependencies
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

// Define the contract address
const dexAddress = "0xf2c0E223B5A2A65933EE7F0bbb801c944cFa12C6";

// Load DEX Contract
async function loadDexContract() {
    try {
        console.log("Fetching ABI from ./dexABI.json...");
        const response = await fetch('./dexABI.json');
        const { abi: dexABI } = await response.json();
        console.log("ABI loaded successfully:", dexABI);

        const dexContract = new ethers.Contract(dexAddress, dexABI, signer);
        console.log("DEX contract initialized:", dexContract);
        return dexContract;
    } catch (error) {
        console.error("Failed to load the DEX ABI or contract:", error);
        return null;
    }
}

// Load Token Data from Sepolia JSON
async function loadTokenData() {
    try {
        const response = await fetch('./deployments/sepolia.json');
        const { ModularDEX } = await response.json();
        console.log("Token data loaded:", ModularDEX.tokens);
        return ModularDEX.tokens;
    } catch (error) {
        console.error("Error loading token data:", error);
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

function disconnectWallet() {
    document.getElementById("connectWalletButton").textContent = "Connect Wallet";
    document.getElementById("disconnectWalletButton").style.display = "none";
    document.getElementById("connectWalletButton").disabled = false;
}

// Get token balance functionality
async function getTokenBalance(token) {
    try {
        const tokens = await loadTokenData();
        const tokenData = tokens[token];
        if (!tokenData) throw new Error(`Token address for ${token} not found`);

        const tokenContract = new ethers.Contract(tokenData.address, erc20ABI, provider);
        const accounts = await provider.listAccounts();
        const balance = await tokenContract.balanceOf(accounts[0]);

        return ethers.utils.formatUnits(balance, tokenData.decimals);
    } catch (error) {
        console.error(`Error fetching balance for ${token}:', error);
        return "0";
    }
}

// Update balance display
async function updateBalance() {
    const token1 = document.getElementById("token1").value;
    const balance = await getTokenBalance(token1);
    document.getElementById("balanceDisplay").textContent = `Available Balance: ${balance}`;
}

// Swap functionality
async function swapTokens() {
    const token1 = document.getElementById("token1").value;
    const token2 = document.getElementById("token2").value;
    const amount1 = document.getElementById("amount1").value;
    const amount2 = 0;

    if (!token1 || !token2 || !amount1) {
        alert("Please select tokens and enter a valid amount.");
        return;
    }
    if (token1 === token2) {
        alert("You cannot swap the same tokens. Please select different tokens.");
        return;
    }

    try {
        const dexContract = await loadDexContract();
        if (!dexContract) {
            alert("DEX contract is not initialized.");
            return;
        }

        const tx = await dexContract.swap(token1, token2, ethers.utils.parseUnits(amount1, 6), amount2);
        await tx.wait();
        alert("Swap successful!");
    } catch (error) {
        console.error("Error during swap:", error);
        alert("Swap failed. Check console for details.");
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

// Get reserves functionality
async function getReserves(token1, token2) {
    try {
        const dexContract = await loadDexContract();
        if (!dexContract) return null;

        const pairKey = ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(["string", "string"], [token1, token2])
        );

        console.log(`Fetching reserves for pair: ${token1}-${token2}, key: ${pairKey}`);

        const reserves = await dexContract.pairs(pairKey);

        return reserves;
    } catch (error) {
        console.error("Error fetching reserves:", error);
        return null;
    }
}

// Estimate output functionality
async function estimateOutput() {
    const token1 = document.getElementById("token1").value;
    const token2 = document.getElementById("token2").value;
    const amount1 = document.getElementById("amount1").value;

    if (!amount1 || parseFloat(amount1) <= 0) {
        document.getElementById("estimatedOutput").textContent = "Estimated Output: --";
        return;
    }

    try {
        const reserves = await getReserves(token1, token2);
        if (!reserves) {
            document.getElementById("estimatedOutput").textContent = "Estimated Output: --";
            return;
        }

        const { reserve1, reserve2 } = reserves;
        const amountOut = (reserve2 * amount1) / (parseFloat(reserve1) + parseFloat(amount1));

        document.getElementById("estimatedOutput").textContent =
            `Estimated Output: ${amountOut.toFixed(6)} ${token2.toUpperCase()}`;
    } catch (error) {
        console.error("Error estimating output:", error);
        document.getElementById("estimatedOutput").textContent = "Estimated Output: --";
    }
}

// Attach event listeners
document.getElementById("connectWalletButton").addEventListener("click", connectWallet);
document.getElementById("disconnectWalletButton").addEventListener("click", disconnectWallet);
document.getElementById("swapButton").addEventListener("click", swapTokens);
document.getElementById("reverseButton").addEventListener("click", reverseTokens);
document.getElementById("amount1").addEventListener("input", estimateOutput);
document.getElementById("token1").addEventListener("change", updateBalance);
document.getElementById("token1").addEventListener("change", estimateOutput);
document.getElementById("token2").addEventListener("change", estimateOutput);
