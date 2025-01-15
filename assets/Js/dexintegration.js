console.log("DEX Integration script loaded successfully!");

const DEX_CONTRACT_ADDRESS = "0x4456b0f017f6bf9b0aa7a0ac3d3f224902a1937a";
const TOKEN_ADDRESSES = {
    ASC: "0x4456b0f017f6bf9b0aa7a0ac3d3f224902a1937a", // ASC token address
    POL: "0x3Ef815f827c71E2e1C1604870FedDEF6e9BA85Ac", // POL token address
    USDC: "0xADD81fF77b4Bd54259f0EB5f885862eF5920D165"  // USDC token address
};

const PRICE_FEEDS = {
    POL: "0x85b29C03A07e4F280804B06d5055d5348FEd1ed1", // PriceFeed_POL
    USDC: "0x910D009468cf226949A76Be8dF5E1c56E6313692"  // PriceFeed_USDC
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
    if (!window.ethereum) {
        alert("MetaMask is not installed. Please install MetaMask to use this feature.");
        return;
    }

    try {
        const accounts = await ethereum.request({ method: "eth_requestAccounts" });
        if (!accounts || accounts.length === 0) {
            alert("No accounts found in MetaMask.");
            return;
        }

        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        updateWalletUI(true, accounts[0]);
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

async function updateTokenBalances() {
    try {
        const tokenIn = document.getElementById("tokenIn").value;
        const tokenOut = document.getElementById("tokenOut").value;

        const tokenInContract = new ethers.Contract(tokenIn, ABI, signer);
        const tokenOutContract = new ethers.Contract(tokenOut, ABI, signer);

        const userAddress = await signer.getAddress();
        const tokenInBalance = await tokenInContract.balanceOf(userAddress);
        const tokenOutBalance = await tokenOutContract.balanceOf(userAddress);

        document.getElementById("tokenInBalance").textContent = ethers.utils.formatUnits(tokenInBalance, 18);
        document.getElementById("tokenOutBalance").textContent = ethers.utils.formatUnits(tokenOutBalance, 18);
    } catch (error) {
        console.error("Error updating token balances:", error.message);
    }
}

async function swapTokens(inputAmount, tokenIn, tokenOut) {
    try {
        if (!(await validateNetwork())) return;

        const contract = await getContract();
        if (!contract) return;

        const amountInWei = ethers.utils.parseUnits(inputAmount.toString(), 18);
        const amountOutMin = ethers.utils.parseUnits("0.1", 18); // Adjust dynamically if needed

        const tx = await contract.swap(tokenIn, amountInWei, tokenOut, amountOutMin, {
            gasLimit: 300000,
        });

        await tx.wait();
        alert("Swap successful!");
        updateTokenBalances();
    } catch (error) {
        console.error("Error executing token swap:", error.message);
        alert(`Swap failed: ${error.message}`);
    }
}

async function validateNetwork() {
    const network = await provider.getNetwork();
    if (network.chainId !== 11155111) {
        alert("Please switch to the Sepolia network.");
        return false;
    }
    return true;
}

document.addEventListener("DOMContentLoaded", () => {
    setupUI();
});

function setupUI() {
    const connectButton = document.getElementById("connectWalletButton");
    const disconnectButton = document.getElementById("disconnectWalletButton");
    const swapButton = document.getElementById("confirmSwap");
    const reverseButton = document.getElementById("reverseTokens");
    const openModalButton = document.getElementById("openSwapModal");
    const closeModalButton = document.getElementById("closeSwapModal");

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

    if (reverseButton) {
        reverseButton.addEventListener("click", () => {
            const tokenInSelect = document.getElementById("tokenIn");
            const tokenOutSelect = document.getElementById("tokenOut");

            // Swap the selected tokens
            const tempValue = tokenInSelect.value;
            tokenInSelect.value = tokenOutSelect.value;
            tokenOutSelect.value = tempValue;

            updateTokenBalances();
        });
    }

    if (openModalButton) {
        openModalButton.addEventListener("click", () => {
            document.getElementById("swapModal").style.display = "block";
            updateTokenBalances();
        });
    }

    if (closeModalButton) {
        closeModalButton.addEventListener("click", () => {
            document.getElementById("swapModal").style.display = "none";
        });
    }

    // Close modal when clicking outside
    window.addEventListener("click", (event) => {
        const modal = document.getElementById("swapModal");
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });
}
