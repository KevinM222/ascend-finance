// C:\Users\User\Desktop\Ascend\frontend\Staking.js
import { fetchASCPrice } from './utils.js'; // Use ES Module import

const STAKING_CONTRACT = "0x6a663C5e104AAB49b5E09A0d2De94B4b340a4Aef";
const ASC_TOKEN = "0x4456B0F017F6bF9b0aa7a0ac3d3F224902a1937A";
const POLYGON_RPC = "https://polygon-rpc.com";

let provider, signer, stakingContract, ascContract, userAddress, updateInterval;

async function updateGlobalStats() {
    const polygonProvider = new ethers.providers.JsonRpcProvider("https://polygon-rpc.com");
    try {
        const stakingResponse = await fetch("AscStakingABI.json");
        const stakingData = await stakingResponse.json();
        const stakingAbi = stakingData.abi || stakingData;
        if (!Array.isArray(stakingAbi)) throw new Error("Staking ABI is not an array");

        const contract = new ethers.Contract(STAKING_CONTRACT, stakingAbi, polygonProvider);
        const globalTotalStaked = await contract.totalStaked();
        console.log("Global total staked:", ethers.utils.formatEther(globalTotalStaked));

        const ascPriceInPol = await fetchASCPrice();
        document.getElementById("globalTotalStaked").innerText = `${parseFloat(ethers.utils.formatEther(globalTotalStaked)).toFixed(4)} ASC`;
        document.getElementById("tokenPrice").innerText = `${ascPriceInPol.toFixed(4)} POL`;
    } catch (error) {
        console.error("Failed to fetch global stats:", error);
        document.getElementById("globalTotalStaked").innerText = "Loading...";
        document.getElementById("tokenPrice").innerText = "Loading...";
    }
}

// Run on page load, independent of wallet
try {
    updateGlobalStats();
} catch (error) {
    console.error("Initial updateGlobalStats failed:", error);
}

// ... rest of your Staking.js code unchanged


async function init() {
  if (!window.ethereum) {
    console.error("MetaMask is required for wallet features. Global stats should still load.");
    return;
  }
  try {
    provider = new ethers.providers.Web3Provider(window.ethereum, { name: "matic", chainId: 137 });
    signer = provider.getSigner();
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x89" }],
    }).catch((error) => {
      if (error.code === 4902) {
        window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0x89",
            chainName: "Polygon Mainnet",
            rpcUrls: ["https://polygon-rpc.com"],
            nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
            blockExplorerUrls: ["https://polygonscan.com/"]
          }],
        });
      } else if (error.code !== 4001) {
        console.error("Switch to Polygon failed:", error);
        alert("Please switch to Polygon Mainnet in MetaMask to use this app.");
      }
    });
    await initializeContracts();
    // Keep updateGlobalStats in interval for periodic refresh
    await updateGlobalStats();
    let lastUpdate = 0;
    updateInterval = setInterval(async () => {
      const now = Date.now();
      if (now - lastUpdate >= 30000) {
        console.log("Running 30-second update...");
        await updateGlobalStats();
        if (userAddress && ascContract) {
          try {
            await debounceUpdateStakingData(userAddress);
            const balance = await ascContract.balanceOf(userAddress);
            const formattedBalance = parseFloat(ethers.utils.formatEther(balance)).toFixed(4);
            console.log(`Updating balance for ${userAddress}: ${formattedBalance} ASC`);
            const balanceEl = document.getElementById("walletBalance");
            if (balanceEl) balanceEl.innerText = `Balance: ${formattedBalance} ASC`;
          } catch (error) {
            console.error("Failed to update balance:", error.message);
          }
        }
        lastUpdate = now;
      }
    }, 1000);
    const accounts = await provider.listAccounts();
    if (accounts.length > 0) {
      userAddress = accounts[0];
      await debounceUpdateStakingData(userAddress);
    }
  } catch (error) {
    console.error("Init failed:", error);
  }
}


async function initializeContracts() {
  try {
    const stakingResponse = await fetch("AscStakingABI.json");
    if (!stakingResponse.ok) throw new Error(`Failed to fetch AscStakingABI.json: ${stakingResponse.statusText}`);
    const stakingData = await stakingResponse.json(); // Read once
    let stakingAbi = stakingData.abi || stakingData; // Use .abi if present, otherwise assume the whole object is the ABI
    if (!Array.isArray(stakingAbi)) throw new Error("Staking ABI is not an array");

    const ascResponse = await fetch("AscTokenABI.json");
    if (!ascResponse.ok) throw new Error(`Failed to fetch AscTokenABI.json: ${ascResponse.statusText}`);
    const ascData = await ascResponse.json(); // Read once
    let ascAbi = ascData.abi || ascData; // Use .abi if present, otherwise assume the whole object is the ABI
    if (!Array.isArray(ascAbi)) throw new Error("ASC Token ABI is not an array");

    stakingContract = new ethers.Contract(STAKING_CONTRACT, stakingAbi, signer);
    ascContract = new ethers.Contract(ASC_TOKEN, ascAbi, signer);
    console.log("Contracts initialized successfully");
  } catch (error) {
    console.error("Error initializing contracts:", error);
    throw error;
  }
}

// Debounce to prevent UI flicker
let debounceTimeout;
function debounceUpdateStakingData(userAddress) {
  clearTimeout(debounceTimeout);
  return new Promise((resolve) => {
    debounceTimeout = setTimeout(async () => {
      await updateStakingData(userAddress);
      // Add balance update here
      if (ascContract && userAddress) {
        const balance = await ascContract.balanceOf(userAddress);
        const formattedBalance = parseFloat(ethers.utils.formatEther(balance)).toFixed(4);
        console.log(`Debounced balance update for ${userAddress}: ${formattedBalance} ASC`);
        const balanceEl = document.getElementById("walletBalance");
        if (balanceEl) balanceEl.innerText = `Balance: ${formattedBalance} ASC`;
      }
      resolve();
    }, 500);
  });
}

async function connectWallet() {
  if (!window.ethereum) throw new Error("MetaMask is required.");
  if (!provider) {
    provider = new ethers.providers.Web3Provider(window.ethereum, { name: "matic", chainId: 137 });
    signer = provider.getSigner();
  }
  console.log("Checking chain ID...");
  const chainId = await provider.getNetwork().then(net => net.chainId);
  console.log("Chain ID:", chainId);
  if (chainId !== 137) {
    console.log("Switching to Polygon...");
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x89" }],
    }).catch((error) => {
      if (error.code === 4902) {
        window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0x89",
            chainName: "Polygon Mainnet",
            rpcUrls: ["https://polygon-rpc.com"],
            nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
            blockExplorerUrls: ["https://polygonscan.com/"]
          }],
        });
      } else {
        throw new Error("Please switch to Polygon Mainnet in MetaMask.");
      }
    });
  }
  console.log("Requesting accounts...");
  const accounts = await provider.send("eth_requestAccounts", []);
  userAddress = accounts[0];
  console.log("Connected address:", userAddress);
  await initializeContracts();
  console.log("Updating UI...");
  const connectBtn = document.getElementById("connectWalletButton");
  const disconnectBtn = document.getElementById("disconnectWalletButton");
  const balanceEl = document.getElementById("walletBalance");
  if (!connectBtn || !disconnectBtn || !balanceEl) {
    console.error("DOM elements missing:", { connectBtn, disconnectBtn, balanceEl });
    return;
  }
  connectBtn.style.display = "none";
  disconnectBtn.style.display = "inline";
  const balance = await ascContract.balanceOf(userAddress); // Already here, just ensure it’s fresh
  console.log("Balance:", ethers.utils.formatEther(balance));
  balanceEl.innerText = `Balance: ${parseFloat(ethers.utils.formatEther(balance)).toFixed(4)} ASC`;
  await debounceUpdateStakingData(userAddress);
  console.log("UI updated!");
}

async function disconnectWallet() {
  userAddress = null;
  document.getElementById("connectWalletButton").style.display = "inline";
  document.getElementById("disconnectWalletButton").style.display = "none";
  document.getElementById("walletBalance").innerText = "Balance: Connect Wallet";
  document.getElementById("stakingPositions").innerHTML = "<p>Connect wallet to view stakes.</p>";
}

window.ethereum.on("accountsChanged", (accounts) => {
  if (accounts.length === 0) disconnectWallet();
  else connectWallet();
});

async function displayStakingPositions(userStakes) {
  const stakingTable = document.getElementById("stakingPositions");
  stakingTable.innerHTML = "";
  if (!userStakes || userStakes.length === 0) {
    stakingTable.innerHTML = "<p>No active stakes.</p>";
    return;
  }

  const activeStakes = userStakes.map((stake, originalIndex) => ({ stake, originalIndex })).filter(item => item.stake.amount > 0);
  if (activeStakes.length === 0) {
    stakingTable.innerHTML = "<p>No active stakes.</p>";
    return;
  }

  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Amount</th>
        <th>Start Time</th>
        <th>Lock Until</th>
        <th>APY</th>
        <th>Days Left</th>
        <th>Rewards</th>
        <th>Auto-Reinvest</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody id="stakesBody"></tbody>
  `;
  const tbody = table.querySelector("#stakesBody");

  for (let i = 0; i < activeStakes.length; i++) {
    const { stake, originalIndex } = activeStakes[i];
    console.log("Stake data:", { originalIndex, ...stake });
    const amount = ethers.utils.formatEther(stake.amount);
    const startTime = new Date(stake.startTime.toNumber() * 1000).toLocaleDateString();
    const lockUntil = stake.lockPeriod.toNumber() === 0 ? "No Lock" : new Date(stake.lockPeriod.toNumber() * 1000).toLocaleDateString();
    const apy = stake.apy.toNumber();
    const daysLeft = stake.lockPeriod.toNumber() === 0 ? "N/A" : Math.max(0, Math.ceil((stake.lockPeriod - Math.floor(Date.now() / 1000)) / (24 * 60 * 60)));
    
    const amountBN = ethers.BigNumber.from(stake.amount);
    const apyBN = ethers.BigNumber.from(stake.apy);
    const startTimeBN = ethers.BigNumber.from(stake.startTime);
    const lockUntilBN = stake.lockPeriod.toNumber() === 0 ? ethers.BigNumber.from(Math.floor(Date.now() / 1000)) : ethers.BigNumber.from(stake.lockPeriod);
    const currentTimeBN = ethers.BigNumber.from(Math.floor(Date.now() / 1000));
    const stakingTimeBN = currentTimeBN.lt(lockUntilBN) ? currentTimeBN.sub(startTimeBN) : lockUntilBN.sub(startTimeBN);
    const secondsPerYearBN = ethers.BigNumber.from(365 * 24 * 60 * 60);
    const hundredBN = ethers.BigNumber.from(100);
    const rewardsBN = amountBN.mul(apyBN).mul(stakingTimeBN).div(hundredBN.mul(secondsPerYearBN));
    const claimedRewardsBN = ethers.BigNumber.from(stake.rewardsClaimed);
    const pendingReinvestBN = ethers.BigNumber.from(stake.pendingReinvestRewards);
    const totalRewardsBN = rewardsBN.sub(claimedRewardsBN).add(pendingReinvestBN);
    const rewards = ethers.utils.formatEther(totalRewardsBN);

    const autoReinvest = await stakingContract.autoReinvestStatus(userAddress, originalIndex);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${parseFloat(amount).toFixed(4)} ASC</td>
      <td>${startTime}</td>
      <td>${lockUntil}</td>
      <td>${apy}%</td>
      <td>${daysLeft}</td>
      <td>${parseFloat(rewards).toFixed(4)} ASC</td>
      <td><button class="auto-reinvest-btn" data-index="${originalIndex}" style="background-color: ${autoReinvest ? '#ff4444' : '#44ff44'}">${autoReinvest ? "Disable" : "Enable"} Auto-Reinvest</button></td>
      <td><button onclick="unstake(${originalIndex})" ${daysLeft === "N/A" || daysLeft <= 0 ? "" : "disabled"}>Unstake</button></td>
    `;
    tbody.appendChild(row);
  }
  stakingTable.appendChild(table);

  document.querySelectorAll(".auto-reinvest-btn").forEach(btn => {
    btn.addEventListener("click", () => toggleAutoReinvest(parseInt(btn.dataset.index)));
  });
}

async function updateStakingData(userAddress) {
  if (!stakingContract || !userAddress) return;
  try {
    const totalRewards = await stakingContract.calculateRewards(userAddress);
    document.getElementById("rewardBalance").innerText = `Pending Rewards: ${parseFloat(ethers.utils.formatEther(totalRewards)).toFixed(4)} ASC`;
    const userStakes = await stakingContract.getAllUserStakes(userAddress);
    if (!userStakes) throw new Error("getAllUserStakes returned undefined");
    await displayStakingPositions(userStakes);
  } catch (error) {
    console.error("❌ Failed to update staking data:", error);
  }
}


const tiers = {
  0: { days: 0, apy: 2 },
  30: { days: 30, apy: 5 },
  90: { days: 90, apy: 8 },
  180: { days: 180, apy: 12 },
  365: { days: 365, apy: 16 },
  730: { days: 730, apy: 20 }
};

async function stakeASC() {
  const amount = document.getElementById("stakeAmount").value;
  const durationDays = parseInt(document.getElementById("stakeLock").value);
  if (!amount || amount <= 0 || !tiers[durationDays]) return alert("Invalid amount or duration.");

  const parsedAmount = ethers.utils.parseEther(amount.toString());
  const durationSeconds = durationDays * 24 * 60 * 60;

  try {
    const allowance = await ascContract.allowance(userAddress, STAKING_CONTRACT);
    console.log("Current allowance:", ethers.utils.formatEther(allowance));
    if (allowance.lt(parsedAmount)) {
      const approveTx = await ascContract.approve(STAKING_CONTRACT, ethers.constants.MaxUint256, { gasLimit: 100000 });
      await approveTx.wait(1);
      console.log("Approval tx confirmed:", approveTx.hash);
    }
    const stakeTx = await stakingContract.stakeWithAutoApproval(parsedAmount, durationSeconds, { gasLimit: 300000 });
    await stakeTx.wait(1);
    console.log("Staking tx confirmed:", stakeTx.hash);
    alert("Stake successful!");
    await debounceUpdateStakingData(userAddress);
    await updateGlobalStats();
  } catch (error) {
    console.error("❌ Staking failed:", error);
    alert(`Staking failed: ${error.message || "Check console"}`);
    throw error;
  }
  console.log("Staking with:", { amount, durationDays, durationSeconds });
}

async function unstake(index) {
  try {
    const contractBalance = await ascContract.balanceOf(STAKING_CONTRACT);
    console.log("Contract ASC balance before unstake:", ethers.utils.formatEther(contractBalance));
    const userStakes = await stakingContract.getAllUserStakes(userAddress);
    console.log("All user stakes:", userStakes.map((s, i) => ({
      index: i,
      amount: ethers.utils.formatEther(s.amount),
      lockPeriod: s.lockPeriod.toString(),
      startTime: new Date(s.startTime.toNumber() * 1000).toLocaleDateString(),
      apy: s.apy.toString()
    })));
    if (!userStakes[index]) throw new Error(`No stake at index ${index}`);
    const stake = userStakes[index];
    const blockTimestamp = (await provider.getBlock("latest")).timestamp;
    console.log(`Unstaking stake at index ${index}:`, {
      amount: ethers.utils.formatEther(stake.amount),
      lockPeriod: stake.lockPeriod.toString(),
      startTime: new Date(stake.startTime.toNumber() * 1000).toLocaleDateString(),
      blockTimestamp,
      isLocked: stake.lockPeriod > 0 && blockTimestamp < stake.lockPeriod.toNumber()
    });
    const amountToUnstake = ethers.BigNumber.from(stake.amount);
    if (contractBalance.lt(amountToUnstake)) {
      alert(`Insufficient contract balance (${ethers.utils.formatEther(contractBalance)} ASC) to unstake ${ethers.utils.formatEther(amountToUnstake)} ASC (excluding rewards).`);
      return;
    }
    console.log("Simulating unstake...");
    try {
      await stakingContract.callStatic.unstake(index, { gasLimit: 300000 });
      console.log("Simulation passed, executing unstake...");
    } catch (simError) {
      console.error("Simulation failed:", simError);
      throw simError;
    }
    const unstakeTx = await stakingContract.unstake(index, { gasLimit: 300000 });
    await unstakeTx.wait(1);
    console.log("Unstake tx confirmed:", unstakeTx.hash);
    alert("Unstake successful!");
    await debounceUpdateStakingData(userAddress);
    await updateGlobalStats();
  } catch (error) {
    console.error("❌ Unstaking failed:", error);
    if (error.reason) console.log("Revert reason:", error.reason);
    alert("Unstaking failed. Check console for details.");
  }
}

async function toggleAutoReinvest(index) {
  try {
    const currentStatus = await stakingContract.autoReinvestStatus(userAddress, index);
    const tx = await stakingContract.setAutoReinvest(index, !currentStatus, { gasLimit: 100000 });
    await tx.wait(1);
    console.log("Toggle auto-reinvest tx confirmed:", tx.hash);
    alert(`Auto-Reinvest ${!currentStatus ? "Enabled" : "Disabled"} for stake #${index}`);
    await debounceUpdateStakingData(userAddress);
  } catch (error) {
    console.error("❌ Toggle failed:", error);
    alert("Toggle failed. Check console.");
  }
}

async function claimRewards() {
  try {
    const totalRewards = await stakingContract.calculateRewards(userAddress);
    console.log("Total rewards before claim:", ethers.utils.formatEther(totalRewards));
    if (totalRewards.lte(ethers.utils.parseEther("0.00001"))) {
      alert("Rewards too small to claim yet (less than 0.00001 ASC). Wait longer!");
      return;
    }
    const contractBalance = await ascContract.balanceOf(STAKING_CONTRACT);
    console.log("Contract ASC balance before claim:", ethers.utils.formatEther(contractBalance));
    if (contractBalance.lt(totalRewards)) {
      alert(`Insufficient contract balance (${ethers.utils.formatEther(contractBalance)} ASC) to claim ${ethers.utils.formatEther(totalRewards)} ASC.`);
      return;
    }
    await stakingContract.callStatic.claimRewards({ gasLimit: 500000 });
    const claimTx = await stakingContract.claimRewards({ gasLimit: 500000 });
    const claimReceipt = await claimTx.wait(1);
    console.log("Claim rewards tx confirmed:", claimReceipt.transactionHash);

    const choiceDiv = document.createElement("div");
    choiceDiv.innerHTML = `
      <style>
        .choice-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.5); z-index: 1000; }
        .choice-btn { padding: 10px 20px; margin: 0 10px; cursor: pointer; }
        #reinvestBtn { background-color: #44ff44; }
        #claimBtn { background-color: #ff4444; }
      </style>
      <div class="choice-modal">
        <p>Rewards processed! Choose an action:</p>
        <button id="reinvestBtn" class="choice-btn">Reinvest All</button>
        <button id="claimBtn" class="choice-btn">Claim to Wallet</button>
      </div>
    `;
    document.body.appendChild(choiceDiv);

    const reinvestBtn = document.getElementById("reinvestBtn");
    const claimBtn = document.getElementById("claimBtn");

    return new Promise((resolve) => {
      reinvestBtn.onclick = async () => {
        reinvestBtn.disabled = true; // Prevent multiple clicks
        claimBtn.disabled = true;
        document.body.removeChild(choiceDiv); // Clear modal immediately
        try {
          const userStakes = await stakingContract.getAllUserStakes(userAddress);
          const activeStakes = userStakes.filter(s => s.amount > 0 && s.pendingReinvestRewards > 0);
          if (activeStakes.length === 0) {
            alert("No rewards to reinvest!");
            resolve(true);
            return;
          }
          for (let i = 0; i < activeStakes.length; i++) {
            const index = userStakes.indexOf(activeStakes[i]);
            const pending = ethers.utils.formatEther(activeStakes[i].pendingReinvestRewards);
            console.log(`Reinvesting ${pending} ASC for index ${index}...`);
            const reinvestTx = await stakingContract.reinvestRewards(index, { gasLimit: 200000 });
            const receipt = await reinvestTx.wait(1);
            console.log(`Reinvest tx confirmed for index ${index}:`, receipt.transactionHash);
          }
          alert("All rewards reinvested!");
        } catch (error) {
          if (error.code === "TRANSACTION_REPLACED" && error.replacement && error.replacement.status === 1) {
            console.log("Reinvest succeeded via replacement:", error.replacement.hash);
            alert("All rewards reinvested (via replacement)!");
          } else {
            console.error("Reinvest failed:", error);
            alert("Reinvest failed. Check console.");
          }
        }
        resolve(true);
        await debounceUpdateStakingData(userAddress);
        await updateGlobalStats();
      };

      claimBtn.onclick = async () => {
        claimBtn.disabled = true; // Prevent multiple clicks
        reinvestBtn.disabled = true;
        document.body.removeChild(choiceDiv); // Clear modal immediately
        try {
          const claimTx = await stakingContract.claimOnlyRewards({ gasLimit: 150000 });
          const receipt = await claimTx.wait(1);
          console.log("Claim to wallet tx confirmed:", receipt.transactionHash);
          alert("Rewards claimed to wallet!");
        } catch (error) {
          console.error("Claim to wallet failed:", error);
          alert("Claim to wallet failed. Check console.");
        }
        resolve(false);
        await debounceUpdateStakingData(userAddress);
        await updateGlobalStats();
      };
    });
  } catch (error) {
    console.error("❌ Claim failed:", error);
    alert("Claim failed. Check console for details.");
  }
}

window.unstake = unstake;
window.toggleAutoReinvest = toggleAutoReinvest;

document.getElementById("connectWalletButton").addEventListener("click", connectWallet);
document.getElementById("disconnectWalletButton").addEventListener("click", disconnectWallet);
document.getElementById("stakeButton").addEventListener("click", stakeASC);
document.getElementById("claimRewardsButton").addEventListener("click", claimRewards);
