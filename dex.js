// Load dependencies
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

// Define the contract address
const dexAddress = "0xf2c0E223B5A2A65933EE7F0bbb801c944cFa12C6";

// Function to load the ABI dynamically
async function loadDexContract() {
    try {
        const response = await fetch('./dexABI.json');
        const { abi: dexABI } = await response.json();

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

// Estimate output functionality
async function estimateOutput() {
    const tokenA = document.getElementById("tokenA").value;
    const tokenB = document.getElementById("tokenB").value;
    const amountA = document.getElementById("amountA").value;

    try {
        const dexContract = await loadDexContract();
        if (!dexContract) return;

        const estimatedOutput = await dexContract.estimateSwap(
            tokenA,
            tokenB,
            ethers.utils.parseUnits(amountA, 6)
        );

        document.getElementById("estimatedOutput").textContent = 
            `Estimated Output: ${ethers.utils.formatUnits(estimatedOutput, 6)} ${tokenB}`;
    } catch (error) {
        console.error("Error estimating output:", error);
    }
}

// Attach event listeners
document.getElementById("connectWalletButton").addEventListener("click", connectWallet);
document.getElementById("disconnectWalletButton").addEventListener("click", disconnectWallet);
document.getElementById("swapButton").addEventListener("click", swapTokens);
document.getElementById("reverseButton").addEventListener("click", reverseTokens);
document.getElementById("amountA").addEventListener("input", estimateOutput);
