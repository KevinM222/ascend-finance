// Load dependencies
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

// Contract addresses
const dexAddress = "0xf2c0E223B5A2A65933EE7F0bbb801c944cFa12C6"; // ModularDEX address
const treasuryAddress = "YOUR_TREASURY_CONTRACT_ADDRESS"; // Treasury contract address

// Deployed token addresses (MockERC20)
const deployedAddresses = {
    USDC: "0xCd0FD2e6442C866161dBe07B5cbC13b16830FEF7",
    POL: "0xF8DBe46cCC145876c71F38d00c47d575E39F8772",
    // Add other tokens here
};

// ABIs
const erc20ABI = [
    {
        constant: true,
        inputs: [{ name: "account", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        type: "function",
    },
    {
        constant: true,
        inputs: [],
        name: "decimals",
        outputs: [{ name: "", type: "uint8" }],
        type: "function",
    },
    {
        constant: false,
        inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
        name: "transfer",
        outputs: [],
        type: "function",
    },
];

const treasuryABI = [
    {
        inputs: [{ name: "token", type: "address" }, { name: "amount", type: "uint256" }],
        name: "deposit",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
];

// Load DEX Contract
async function loadDexContract() {
    const response = await fetch("./dexABI.json");
    const { abi: dexABI } = await response.json();
    return new ethers.Contract(dexAddress, dexABI, signer);
}

// Load Treasury Contract
function loadTreasuryContract() {
    return new ethers.Contract(treasuryAddress, treasuryABI, signer);
}

// Wallet Connection
async function connectWallet() {
    if (window.ethereum) {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const accounts = await provider.listAccounts();
        const walletAddress = accounts[0];
        const network = await provider.getNetwork();

        console.log(`Connected to network: ${network.name}, chainId: ${network.chainId}`);
        document.getElementById("connectWalletButton").textContent = `Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
        document.getElementById("disconnectWalletButton").style.display = "inline-block";
    } else {
        alert("MetaMask is not installed.");
    }
}

// Get Token Balance
async function getTokenBalance(tokenSymbol) {
    const tokenAddress = deployedAddresses[tokenSymbol];
    if (!tokenAddress) throw new Error(`Token address for ${tokenSymbol} not found`);

    const tokenContract = new ethers.Contract(tokenAddress, erc20ABI, provider);
    const accounts = await provider.listAccounts();
    const balance = await tokenContract.balanceOf(accounts[0]);

    return ethers.utils.formatUnits(balance, 18); // Assuming 18 decimals
}

// Swap Tokens
async function swapTokens() {
    const token1 = document.getElementById("token1").value;
    const token2 = document.getElementById("token2").value;
    const amount1 = document.getElementById("amount1").value;

    if (!token1 || !token2 || !amount1 || token1 === token2) {
        alert("Invalid swap parameters.");
        return;
    }

    const dexContract = await loadDexContract();
    const amount1Wei = ethers.utils.parseUnits(amount1, 18);

    try {
        // Execute swap
        const tx = await dexContract.swap(token1, token2, amount1Wei, 0);
        await tx.wait();
        alert("Swap successful!");

        // Calculate fee and send to Treasury
        const fee = amount1Wei.mul(3).div(1000); // Example: 0.3% fee
        const treasuryContract = loadTreasuryContract();
        await treasuryContract.deposit(deployedAddresses[token1], fee);
        console.log("Fee sent to Treasury:", fee.toString());
    } catch (error) {
        console.error("Swap failed:", error);
        alert("Swap failed. See console for details.");
    }
}

// Update Balance
async function updateBalance() {
    const token1 = document.getElementById("token1").value;
    const balance = await getTokenBalance(token1);
    document.getElementById("balanceDisplay").textContent = `Available Balance: ${balance}`;
}

// Event Listeners
document.getElementById("connectWalletButton").addEventListener("click", connectWallet);
document.getElementById("swapButton").addEventListener("click", swapTokens);
document.getElementById("token1").addEventListener("change", updateBalance);

