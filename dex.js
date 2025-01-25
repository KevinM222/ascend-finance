// Load dependencies
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
const dexAddress = "0xf2c0E223B5A2A65933EE7F0bbb801c944cFa12C6";

let dexContract = null;

async function loadDexContract() {
    if (dexContract) return dexContract;

    try {
        const response = await fetch('./dexABI.json');
        const { abi: dexABI } = await response.json();
        dexContract = new ethers.Contract(dexAddress, dexABI, signer);
        console.log("DEX contract initialized:", dexContract);
        return dexContract;
    } catch (error) {
        console.error("Failed to load DEX contract:", error);
        return null;
    }
}

async function loadABI(filePath) {
    try {
        const response = await fetch(filePath);
        return await response.json();
    } catch (error) {
        console.error(`Error loading ABI from ${filePath}:`, error);
        return null;
    }
}

async function loadTokenData() {
    try {
        const response = await fetch('./deployments/sepolia.json');
        const data = await response.json();
        return data.ModularDEX.tokens;
    } catch (error) {
        console.error("Error loading token data:", error);
        return null;
    }
}

async function getTokenBalance(token) {
    try {
        const tokens = await loadTokenData();
        const tokenData = tokens[token];
        if (!tokenData) throw new Error(`Token address for ${token} not found`);

        const erc20ABI = await loadABI('./MockERC20ABI.json');
        const tokenContract = new ethers.Contract(tokenData.address, erc20ABI, provider);
        const accounts = await provider.listAccounts();
        const balance = await tokenContract.balanceOf(accounts[0]);
        return ethers.utils.formatUnits(balance, tokenData.decimals);
    } catch (error) {
        console.error(`Error fetching balance for ${token}:`, error);
        return "0";
    }
}

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
        if (!reserves) return;

        const tokens = await loadTokenData();
        const tokenData1 = tokens[token1];
        const tokenData2 = tokens[token2];
        const adjustedReserve1 = reserves.reserve1 / (10 ** tokenData1.decimals);
        const adjustedReserve2 = reserves.reserve2 / (10 ** tokenData2.decimals);

        const amountOut = (adjustedReserve2 * amount1) / (adjustedReserve1 + amount1);
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
