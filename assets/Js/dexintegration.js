console.log("DEX Integration script loaded successfully!");

const DEX_CONTRACT_ADDRESS = "0x4456b0f017f6bf9b0aa7a0ac3d3f224902a1937a";
const TOKEN_ADDRESSES = {
    ASC: "0x4456b0f017f6bf9b0aa7a0ac3d3f224902a1937a",
    POL: "0x3Ef815f827c71E2e1C1604870FedDEF6e9BA85Ac",
    USDC: "0xADD81fF77b4Bd54259f0EB5f885862eF5920D165"
};

const ABI = [
    {
        constant: false,
        inputs: [
            { name: "tokenIn", type: "address" },
            { name: "amountIn", type: "uint256" },
            { name: "tokenOut", type: "address" },
            { name: "amountOutMin", type: "uint256" }
        ],
        name: "swap",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    }
];

let provider, signer;

async function initialize() {
    console.log("Initializing wallet connection...");
    if (!window.ethereum) {
        alert("MetaMask is not installed. Please install MetaMask to use this feature.");
        console.error("MetaMask not detected.");
        return;
    }

    try {
        console.log("Requesting MetaMask accounts...");
        const accounts = await ethereum.request({ method: "eth_requestAccounts" });
        if (!accounts || accounts.length === 0) {
            alert("No accounts found in MetaMask.");
            return;
        }

        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        updateWalletUI(true, accounts[0]);
        console.log("Wallet connected successfully.");
    } catch (error) {
        console.error("Error connecting to MetaMask:", error.message);
    }
}

function disconnectWallet() {
    provider = null;
    signer = null;
    updateWalletUI(false);
}

function updateWalletUI(connected, address = null) {
    const connectButton = document.getElementById("connectWalletButton");
    const disconnectButton = document.getElementById("disconnectWalletButton");

    if (connected) {
        connectButton.textContent = `Connected: ${address.substring(0, 6)}...${address.slice(-4)}`;
        disconnectButton.style.display = "inline-block";
    } else {
        connectButton.textContent = "Connect Wallet";
        disconnectButton.style.display = "none";
    }
}

async function getContract() {
    if (!provider || !DEX_CONTRACT_ADDRESS || !ABI.length) {
        console.error("Provider, contract address, or ABI is missing.");
        return null;
    }
    return new ethers.Contract(DEX_CONTRACT_ADDRESS, ABI, signer);
}

async function previewSwap(inputAmount, tokenIn, tokenOut) {
    try {
        console.log("Previewing swap...");
        const estimatedOutput = calculateEstimatedOutput(inputAmount);
        console.log("Estimated Output:", estimatedOutput);
        document.getElementById("estimatedOutput").value = estimatedOutput.toFixed(6);

        const gasEstimate = await signer.estimateGas({
            to: DEX_CONTRACT_ADDRESS,
            data: new ethers.utils.Interface(ABI).encodeFunctionData("swap", [
                tokenIn,
                ethers.utils.parseUnits(inputAmount.toString(), 18),
                tokenOut,
                ethers.utils.parseUnits("0.1", 18)
            ])
        });
        console.log("Estimated Gas:", gasEstimate.toString());
    } catch (error) {
        console.error("Error previewing swap:", error.message);
    }
}

async function swapTokens(inputAmount, tokenIn, tokenOut) {
    try {
        console.log("Executing swap...");
        if (!(await validateNetwork())) return;

        const contract = await getContract();
        if (!contract) return;

        const amountInWei = ethers.utils.parseUnits(inputAmount.toString(), 18);
        const amountOutMin = ethers.utils.parseUnits("0.1", 18);

        const tx = await contract.swap(tokenIn, amountInWei, tokenOut, amountOutMin, {
            gasLimit: 300000,
        });

        console.log("Transaction sent. Waiting for confirmation...");
        await tx.wait();
        alert("Swap successful!");
        updateTokenBalances();
    } catch (error) {
        console.error("Error executing token swap:", error.message);
        alert(`Swap failed: ${error.message}`);
    }
}

function calculateEstimatedOutput(amountIn) {
    const feeRate = 0.003; // 0.3% fee
    return amountIn * (1 - feeRate); // Example calculation, replace with actual logic
}

async function validateNetwork() {
    const network = await provider.getNetwork();
    if (network.chainId !== 11155111) {
        alert("Please switch to the Sepolia network.");
        return false;
    }
    return true;
}

async function updateTokenBalances() {
    console.log("Updating token balances...");
    // Add logic to fetch and update balances dynamically
}

document.addEventListener("DOMContentLoaded", () => {
    const connectButton = document.getElementById("connectWalletButton");
    const disconnectButton = document.getElementById("disconnectWalletButton");
    const swapButton = document.getElementById("confirmSwap");

    if (connectButton) connectButton.addEventListener("click", initialize);
    if (disconnectButton) disconnectButton.addEventListener("click", disconnectWallet);

    if (swapButton) {
        swapButton.addEventListener("click", async () => {
            const inputAmount = document.getElementById("swapAmount").value;
            const tokenIn = document.getElementById("tokenIn").value;
            const tokenOut = document.getElementById("tokenOut").value;

            if (inputAmount && tokenIn && tokenOut) {
                await swapTokens(inputAmount, tokenIn, tokenOut);
            } else {
                alert("Please fill in all fields.");
            }
        });
    }
});
