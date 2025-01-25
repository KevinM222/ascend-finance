// Load dependencies
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

// Define the contract address
const dexAddress = "0xf2c0E223B5A2A65933EE7F0bbb801c944cFa12C6";

// Function to load the ABI dynamically
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

//Get token balances functionality
async function getTokenBalance(token) {
    try {
        const dexContract = await loadDexContract();
        if (!dexContract) return null;

        const tokenAddress = await dexContract.tokenAddresses(token);
        const tokenContract = new ethers.Contract(tokenAddress, erc20ABI, provider);

        const accounts = await provider.listAccounts();
        const balance = await tokenContract.balanceOf(accounts[0]);

        return ethers.utils.formatUnits(balance, 18); // Assuming 18 decimals
    } catch (error) {
        console.error(`Error fetching balance for ${token}:`, error);
        return "0";
    }
}


// Swap functionality
async function swapTokens() {
    const tokenA = document.getElementById("tokenA").value;
    const tokenB = document.getElementById("tokenB").value;
    const amountA = document.getElementById("amountA").value;

    if (!tokenA || !tokenB || !amountA) {
        alert("Please select tokens and enter a valid amount.");
        return;
    }
    if (tokenA === tokenB) {
        alert("You cannot swap the same tokens. Please select different tokens.");
        return;
    }

    try {
        const dexContract = await loadDexContract();
        if (!dexContract) {
            alert("DEX contract is not initialized.");
            return;
        }

        const tx = await dexContract.swap(
            tokenA,
            tokenB,
            ethers.utils.parseUnits(amountA, 6)
        );

        await tx.wait();
        alert("Swap successful!");
    } catch (error) {
        console.error("Error during swap:", error);
        alert("Swap failed. Check console for details.");
    }
}

// Reverse token functionality
function reverseTokens() {
    const tokenA = document.getElementById("tokenA");
    const tokenB = document.getElementById("tokenB");
    const tempValue = tokenA.value;
    tokenA.value = tokenB.value;
    tokenB.value = tempValue;
}

// Get reserves functionality
async function getReserves(tokenA, tokenB) {
    try {
        const dexContract = await loadDexContract();
        if (!dexContract) return null;

        // Hash tokenA and tokenB to form the pair key
        const pairKey = ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(["string", "string"], [tokenA, tokenB])
        );

        // Fetch reserves from the contract
        const reserves = await dexContract.pairs(pairKey);
        return { reserve1: reserves.reserve1, reserve2: reserves.reserve2 };
    } catch (error) {
        console.error("Error fetching reserves:", error);
        return null;
    }
}


// Estimate output functionality
async function estimateOutput() {
    const tokenA = document.getElementById("tokenA").value;
    const tokenB = document.getElementById("tokenB").value;
    const amountA = document.getElementById("amountA").value;

    if (!amountA || parseFloat(amountA) <= 0) {
        document.getElementById("estimatedOutput").textContent = "Estimated Output: --";
        return;
    }

    try {
        const reserves = await getReserves(tokenA, tokenB);
        if (!reserves) {
            document.getElementById("estimatedOutput").textContent = "Estimated Output: --";
            return;
        }

        const { reserve1, reserve2 } = reserves;
        const amountOut = (reserve2 * amountA) / (parseFloat(reserve1) + parseFloat(amountA));

        // Format and display the estimated output
        document.getElementById("estimatedOutput").textContent =
            `Estimated Output: ${amountOut.toFixed(6)} ${tokenB.toUpperCase()}`;
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
document.getElementById("amountA").addEventListener("input", estimateOutput);
