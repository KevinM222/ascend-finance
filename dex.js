// =========================
// Provider, Signer, and Global Variables
// =========================
let provider;
let signer;
let slippage = 1; // Global slippage value (default 1%)

provider = new ethers.providers.Web3Provider(window.ethereum);
signer = provider.getSigner();

const dexAddress = "0xFe47e61f416ff96eCb783b471c7395aBefabb702";
console.log("MetaMask Ethereum provider:", window.ethereum);

let dexContract = null;

// =========================
// Load DEX Contract
// =========================
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

// =========================
// Load ABI Dynamically (for ERC20 tokens)
// =========================
async function loadABI(filePath) {
  try {
    const response = await fetch(filePath);
    const abi = await response.json();
    console.log(`Loaded ABI from ${filePath}:`, abi);
    return abi.abi;
  } catch (error) {
    console.error(`Error loading ABI from ${filePath}:`, error);
    return null;
  }
}

// =========================
// Wallet Connection Functions
// =========================
document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('connectWalletButton').addEventListener('click', connectWallet);
  document.getElementById('disconnectWalletButton').addEventListener('click', disconnectWallet);
});

async function connectWallet() {
  console.log("connectWallet() function started...");
  if (window.ethereum) {
    try {
      console.log("Checking network...");
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      console.log("Chain ID:", chainId);
      if (chainId !== '0xaa36a7') {
        alert("Please switch to the Sepolia test network in MetaMask.");
        return;
      }
      console.log("Requesting accounts...");
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length === 0) {
        console.warn("No accounts found. Please check MetaMask.");
        return;
      }
      const walletAddress = accounts[0];
      console.log("Wallet Address:", walletAddress);
      // Reassign provider and signer
      provider = new ethers.providers.Web3Provider(window.ethereum);
      signer = provider.getSigner();
      console.log("Fetching ETH balance...");
      const balanceWei = await provider.getBalance(walletAddress);
      const balanceEth = ethers.utils.formatEther(balanceWei);
      console.log("ETH Balance:", balanceEth);
      document.getElementById("connectWalletButton").textContent =
        `Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
      document.getElementById("connectWalletButton").disabled = true;
      document.getElementById("disconnectWalletButton").style.display = "inline-block";
      console.log("Wallet Connected Successfully.");
    } catch (error) {
      console.error("Error connecting to wallet:", error);
    }
  } else {
    alert("MetaMask is not installed. Please install it to connect your wallet.");
  }
}

function disconnectWallet() {
  document.getElementById("connectWalletButton").textContent = "Connect Wallet";
  document.getElementById("disconnectWalletButton").style.display = "none";
  document.getElementById("connectWalletButton").disabled = false;
  document.getElementById("walletBalance").textContent = "Balance: --";
  console.log("Wallet disconnected.");
}

// =========================
// Token Data and Balance Functions
// =========================
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

async function getTokenBalance(token) {
  try {
    if (!provider) {
      console.warn(`Skipping balance fetch for ${token}: No wallet connected.`);
      return "0";
    }
    const tokens = await loadTokenData();
    const tokenData = tokens[token];
    if (!tokenData) {
      throw new Error(`Token address for ${token} not found`);
    }
    const erc20ABI = await loadABI('./frontend/MockERC20ABI.json');
    const tokenContract = new ethers.Contract(tokenData.address, erc20ABI, provider);
    const accounts = await provider.listAccounts();
    if (accounts.length === 0) {
      console.warn(`Skipping balance fetch for ${token}: No wallet connected.`);
      return "0";
    }
    const balance = await tokenContract.balanceOf(accounts[0]);
    return ethers.utils.formatUnits(balance, tokenData.decimals);
  } catch (error) {
    console.error(`Error fetching balance for ${token}:`, error);
    return "0";
  }
}

async function updateBalance(tabPrefix) {
  try {
    const token1 = document.getElementById(`${tabPrefix}Token1`).value;
    const balance = await getTokenBalance(token1);
    document.getElementById(`${tabPrefix}BalanceDisplay`).textContent = `Available Balance: ${balance}`;
  } catch (error) {
    console.error("Error updating balance:", error);
  }
}

// =========================
// Estimating Output for Swaps/Pools (UI Update)
// =========================
async function estimateOutput(tabPrefix) {
  try {
    const token1 = document.getElementById(`${tabPrefix}Token1`).value;
    const token2 = document.getElementById(`${tabPrefix}Token2`).value;
    const amount1 = document.getElementById(`${tabPrefix}Amount1`).value;
    if (!amount1 || parseFloat(amount1) <= 0) {
      document.getElementById(`${tabPrefix}EstimatedOutput`).textContent = "Estimated Output: --";
      return;
    }
    const dex = await loadDexContract();
    const tokens = await loadTokenData();
    const token1Data = tokens[token1];
    const token2Data = tokens[token2];
    const parsedAmountIn = ethers.utils.parseUnits(amount1, token1Data.decimals);
    // Call estimateOutput with token symbols as defined in the ABI
    const amountOut = await dex.estimateOutput(token1, token2, parsedAmountIn);
    // Format using 18 decimals because the contract normalizes amounts to 18 decimals
    const formattedAmountOut = ethers.utils.formatUnits(amountOut, 18);
    document.getElementById(`${tabPrefix}EstimatedOutput`).textContent =
      `Estimated Output: ${formattedAmountOut} ${token2.toUpperCase()}`;
  } catch (error) {
    console.error("Error estimating output:", error);
    document.getElementById(`${tabPrefix}EstimatedOutput`).textContent = "Estimated Output: --";
  }
}

// =========================
// Add Liquidity Function
// =========================
async function handleAddLiquidity() {
  try {
    const token1 = document.getElementById("poolToken1").value;
    const token2 = document.getElementById("poolToken2").value;
    const amount1 = document.getElementById("poolAmount1").value;
    const amount2 = document.getElementById("poolAmount2").value;
    if (!token1 || !token2 || token1 === token2 || !amount1 || !amount2) {
      alert("Invalid input. Ensure all fields are filled and tokens are different.");
      return;
    }
    const tokens = await loadTokenData();
    const token1Data = tokens[token1];
    const token2Data = tokens[token2];
    const erc20ABI = await loadABI('./frontend/MockERC20ABI.json');
    const token1Contract = new ethers.Contract(token1Data.address, erc20ABI, signer);
    const token2Contract = new ethers.Contract(token2Data.address, erc20ABI, signer);
    await token1Contract.approve(dexAddress, ethers.utils.parseUnits(amount1, token1Data.decimals));
    await token2Contract.approve(dexAddress, ethers.utils.parseUnits(amount2, token2Data.decimals));
    const dex = await loadDexContract();
    const gasLimit = 250000;
    const gasPrice = await provider.getGasPrice();
    await dex.addLiquidity(
      token1,
      token2,
      ethers.utils.parseUnits(amount1, token1Data.decimals),
      ethers.utils.parseUnits(amount2, token2Data.decimals),
      { gasLimit: gasLimit, gasPrice: gasPrice }
    );
    alert("Liquidity added successfully!");
  } catch (error) {
    console.error("Error adding liquidity:", error);
    alert("Failed to add liquidity. Check console for details.");
  }
}

// =========================
// Swap Function
// =========================
async function swapTokens() {
  try {
    const token1 = document.getElementById("swapToken1").value;
    const token2 = document.getElementById("swapToken2").value;
    const amount1 = document.getElementById("swapAmount1").value;
    if (!token1 || !token2 || token1 === token2 || !amount1) {
      alert("Invalid input. Ensure all fields are filled and tokens are different.");
      return;
    }
    const tokens = await loadTokenData();
    const token1Data = tokens[token1];
    const token2Data = tokens[token2];
    const parsedAmountIn = ethers.utils.parseUnits(amount1, token1Data.decimals);
    const dex = await loadDexContract();
    // Call estimateOutput with token symbols per ABI
    const estimatedOutput = await dex.estimateOutput(token1, token2, parsedAmountIn);
    if (estimatedOutput.eq(0)) {
      console.error("❌ Swap rejected: No estimated output available.");
      alert("Swap failed: Insufficient liquidity.");
      return;
    }
    const slippageTolerance = slippage || 1;
    const minAmountOut = estimatedOutput.mul(100 - slippageTolerance).div(100);
    console.log(`🔄 Estimated Output: ${ethers.utils.formatUnits(estimatedOutput, 18)}`);
    console.log(`⚠️ Minimum Output Allowed (After ${slippageTolerance}% Slippage): ${ethers.utils.formatUnits(minAmountOut, 18)}`);
    const gasLimit = 200000;
    const gasPrice = await provider.getGasPrice();
    await dex.swap(token1, token2, parsedAmountIn, minAmountOut, slippageTolerance, {
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    alert(`✅ Successfully swapped ${amount1} ${token1} for ${token2}.`);
  } catch (error) {
    console.error("❌ Error swapping tokens:", error);
    alert("Swap failed. Check console for details.");
  }
}

// =========================
// Utility Functions (Reverse, Update UI, Set Default Pair)
// =========================
function reverseTokens(tabPrefix) {
  const token1 = document.getElementById(`${tabPrefix}Token1`);
  const token2 = document.getElementById(`${tabPrefix}Token2`);
  const tempValue = token1.value;
  token1.value = token2.value;
  token2.value = tempValue;
  updateBalance(tabPrefix);
  estimateOutput(tabPrefix);
}

function updateSwapDetails() {
  try {
    const token1Element = document.getElementById("swapToken1");
    const token2Element = document.getElementById("swapToken2");
    if (!token1Element || !token2Element) {
      console.error("updateSwapDetails: Token dropdowns not found in the DOM.");
      return;
    }
    const token1 = token1Element.value;
    const token2 = token2Element.value;
    if (!token1 || !token2) {
      console.error("updateSwapDetails: One or both tokens not selected.");
      return;
    }
    estimateOutput("swap");
    updateBalance("swap");
    console.log(`Swap details updated: ${token1} -> ${token2}`);
  } catch (error) {
    console.error("Error updating swap details:", error);
  }
}

function setDefaultPair() {
  let inputElement = document.getElementById('swapToken1');
  let outputElement = document.getElementById('swapToken2');
  if (!inputElement || !outputElement) {
    console.error("setDefaultPair: Token dropdowns not found.");
    return;
  }
  if (inputElement.options.length === 0 || outputElement.options.length === 0) {
    console.error("setDefaultPair: Token dropdowns are empty.");
    return;
  }
  inputElement.value = 'POL';  // Default input token to POL
  outputElement.value = 'ASC'; // Default output token to ASC
  console.log("Default pair set: POL -> ASC");
  updateSwapDetails();
}

// =========================
// Tab Switching and Initialization
// =========================
document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab-button");
  const contents = document.querySelectorAll(".tab-content");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.target;
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      contents.forEach((content) => {
        content.style.display = content.id === target ? "block" : "none";
      });
    });
  });
  document.querySelector('[data-target="swap-tab"]').click();
  document.getElementById("swapButton").addEventListener("click", swapTokens);
  document.getElementById("addLiquidityButton").addEventListener("click", handleAddLiquidity);
});

document.addEventListener("DOMContentLoaded", () => {
  const settingsModal = document.getElementById("settingsModal");
  const closeSettingsButton = document.getElementById("closeSettingsButton");
  closeSettingsButton.addEventListener("click", () => {
    settingsModal.style.display = "none";
  });
});

async function populateTokenDropdowns() {
  try {
    const tokens = await loadTokenData();
    if (!tokens || Object.keys(tokens).length === 0) {
      console.error("populateTokenDropdowns: No tokens found.");
      return;
    }
    const swapToken1 = document.getElementById("swapToken1");
    const swapToken2 = document.getElementById("swapToken2");
    const poolToken1 = document.getElementById("poolToken1");
    const poolToken2 = document.getElementById("poolToken2");
    if (!swapToken1 || !swapToken2) {
      console.error("populateTokenDropdowns: Token dropdown elements not found.");
      return;
    }
    [swapToken1, swapToken2, poolToken1, poolToken2].forEach(dropdown => dropdown.innerHTML = "");
    Object.keys(tokens).forEach(token => {
      [swapToken1, swapToken2, poolToken1, poolToken2].forEach(dropdown => {
        const option = document.createElement("option");
        option.value = token;
        option.textContent = token;
        dropdown.appendChild(option);
      });
    });
    console.log("Token dropdowns populated.");
    setDefaultPair();
  } catch (error) {
    console.error("Error populating token dropdowns:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  populateTokenDropdowns();
});
