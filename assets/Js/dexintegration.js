console.log("DEX Integration script loaded successfully!");

const DEX_CONTRACT_ADDRESS = "0x4456b0f017f6bf9b0aa7a0ac3d3f224902a1937a";
const TOKEN_ADDRESSES = {
    ASC: "0x4456b0f017f6bf9b0aa7a0ac3d3f224902a1937a",
    POL: "0x3Ef815f827c71E2e1C1604870FedDEF6e9BA85Ac",
    USDC: "0xADD81fF77b4Bd54259f0EB5f885862eF5920D165",
    ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" // Placeholder for ETH
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

        if (!(await validateNetwork())) {
            alert("Please switch to the Sepolia network.");
            disconnectWallet();
            return;
        }

        updateWalletUI(true, accounts[0]);

        // Event listener for account changes
        ethereum.on("accountsChanged", (newAccounts) => {
            if (newAccounts.length > 0) {
                console.log("Account changed:", newAccounts[0]);
                updateWalletUI(true, newAccounts[0]);
            } else {
                console.log("No accounts connected");
                disconnectWallet();
            }
        });

        console.log("Wallet connected successfully.");
    } catch (error) {
        console.error("Error connecting to MetaMask:", error.message);
    }
}

function disconnectWallet() {
    signer = null;
    updateWalletUI(false);
    console.log("Wallet disconnected.");
}

function updateWalletUI(connected, address = null) {
    const connectButton = document.getElementById("connectWalletButton");
    const disconnectButton = document.getElementById("disconnectWalletButton");

    connectButton.disabled = false;

    if (connected) {
        connectButton.textContent = `Connected: ${address.substring(0, 6)}...${address.slice(-4)}`;
        connectButton.style.backgroundColor = "#28a745";
        disconnectButton.style.display = "inline-block";
    } else {
        connectButton.textContent = "Connect Wallet";
        connectButton.style.backgroundColor = "#007bff";
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
    console.log("Updating token balances...");
    try {
        const tokenIn = document.getElementById("tokenIn").value;
        const tokenOut = document.getElementById("tokenOut").value;
        const userAddress = await signer.getAddress();

        if (tokenIn === TOKEN_ADDRESSES.ETH) {
            const ethBalance = await provider.getBalance(userAddress);
            document.getElementById("tokenInBalance").textContent = ethers.utils.formatEther(ethBalance);
        } else {
            const tokenInContract = new ethers.Contract(tokenIn, ABI, signer);
            const tokenInBalance = await tokenInContract.balanceOf(userAddress);
            document.getElementById("tokenInBalance").textContent = ethers.utils.formatUnits(tokenInBalance, 18);
        }

        if (tokenOut === TOKEN_ADDRESSES.ETH) {
            const ethBalance = await provider.getBalance(userAddress);
            document.getElementById("tokenOutBalance").textContent = ethers.utils.formatEther(ethBalance);
        } else {
            const tokenOutContract = new ethers.Contract(tokenOut, ABI, signer);
            const tokenOutBalance = await tokenOutContract.balanceOf(userAddress);
            document.getElementById("tokenOutBalance").textContent = ethers.utils.formatUnits(tokenOutBalance, 18);
        }
    } catch (error) {
        console.error("Error updating token balances:", error.message);
    }
}

async function swapTokens(inputAmount, tokenIn, tokenOut) {
    const swapButton = document.getElementById("confirmSwap");
    swapButton.disabled = true;
    swapButton.textContent = "Swapping...";

    try {
        console.log("Executing swap...");
        if (!(await validateNetwork())) {
            console.error("Swap aborted: Incorrect network.");
            return;
        }

        const contract = await getContract();
        if (!contract) {
            console.error("Contract instance not available.");
            return;
        }

        const amountInWei = ethers.utils.parseUnits(inputAmount.toString(), 18);
        const amountOutMin = ethers.utils.parseUnits("0.1", 18);

        let tx;
        if (tokenIn === TOKEN_ADDRESSES.ETH) {
            tx = await contract.swap(tokenIn, amountInWei, tokenOut, amountOutMin, {
                value: amountInWei,
                gasLimit: 300000,
            });
        } else {
            tx = await contract.swap(tokenIn, amountInWei, tokenOut, amountOutMin, {
                gasLimit: 300000,
            });
        }

        console.log("Transaction sent. Waiting for confirmation...");
        await tx.wait();
        alert("Swap successful!");
        updateTokenBalances();
    } catch (error) {
        console.error("Swap failed:", error.message);
        alert(`Swap failed: ${error.message}`);
    } finally {
        swapButton.disabled = false;
        swapButton.textContent = "Swap Tokens";
    }
}

async function switchToSepolia() {
    try {
        await ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0xaa36a7" }],
        });
        console.log("Switched to the Sepolia network.");
        return true;
    } catch (error) {
        console.error("Error switching networks:", error.message);
        return false;
    }
}

async function validateNetwork() {
    const network = await provider.getNetwork();
    if (network.chainId !== 11155111) {
        console.error(`Wrong network: Chain ID ${network.chainId}. Expected: 11155111.`);
        return await switchToSepolia();
    }
    console.log("Connected to the Sepolia network.");
    return true;
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
