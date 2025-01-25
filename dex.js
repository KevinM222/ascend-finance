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

const erc20ABI = [
    // balanceOf function
    {
        "constant": true,
        "inputs": [
            {
                "name": "account",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "type": "function"
    },
    // decimals function (optional but useful)
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [
            {
                "name": "",
                "type": "uint8"
            }
        ],
        "type": "function"
    }
];


//Get token balances functionality
async function getTokenBalance(token) {
    try {
        const dexContract = await loadDexContract();
        if (!dexContract) return null;

        const tokenAddress = await dexContract.tokenAddresses(token); // token should be a string here
        const tokenContract = new ethers.Contract(tokenAddress, erc20ABI, provider);

        const accounts = await provider.listAccounts();
        const balance = await tokenContract.balanceOf(accounts[0]);

        return ethers.utils.formatUnits(balance, 18); // Assuming 18 decimals
    } catch (error) {
        console.error(`Error fetching balance for ${token}:`, error); // Pass the actual token value for debugging
        return "0";
    }
}

async function updateBalance() {
    const token1 = document.getElementById("token1").value; // Ensure we get the value, not the element
    const balance = await getTokenBalance(token1); // Pass the token string to `getTokenBalance`
    document.getElementById("balanceDisplay").textContent = `Available Balance: ${balance}`;
}


document.getElementById("token1").addEventListener("change", updateBalance);


function disconnectWallet() {
    document.getElementById("connectWalletButton").textContent = "Connect Wallet";
    document.getElementById("disconnectWalletButton").style.display = "none";
    document.getElementById("connectWalletButton").disabled = false;
}

// Swap functionality
async function swapTokens() {
    const token1 = document.getElementById("token1").value; // First token
    const token2 = document.getElementById("token2").value; // Second token
    const amount1 = document.getElementById("amount1").value; // Amount of token1 to swap
    const amount2 = 0; // Output amount (optional)

    // Validation
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

        // Correct parameter names
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
    const tokenA = document.getElementById("token1");
    const tokenB = document.getElementById("token2");
    const tempValue = token1.value;
    token1.value = token2.value;
    token2.value = tempValue;

    // Update balance and estimate output
    updateBalance();
    estimateOutput();
}


// Get reserves functionality
async function getReserves(token1, token2) {
    try {
        const dexContract = await loadDexContract();
        if (!dexContract) return null;

        // Generate the pair key
        const pairKey = ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(["string", "string"], [token1, token2])
        );

        console.log(`Fetching reserves for pair: ${token1}-${token2}, key: ${pairKey}`);

        // Fetch reserves from the contract
        const reserves = await dexContract.pairs(pairKey);

        console.log(`Reserves fetched for ${token1}-${token2}:`, reserves);
        return { reserve1: reserves.reserve1, reserve2: reserves.reserve2 };
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

        // Log reserve values for debugging
        console.log(`Reserves for ${token1}-${token2}:`, reserves);

        if (!reserves || reserves.reserve1 === 0 || reserves.reserve2 === 0) {
            document.getElementById("estimatedOutput").textContent = "Estimated Output: --";
            return;
        }

        const { reserve1, reserve2 } = reserves;

        // Calculate the estimated output
        const amountOut = (reserve2 * amount1) / (parseFloat(reserve1) + parseFloat(amount1));

        // Update the display
        document.getElementById("estimatedOutput").textContent =
            `Estimated Output: ${amountOut.toFixed(6)} ${token2.toUpperCase()}`;
    } catch (error) {
        console.error("Error estimating output:", error);
        document.getElementById("estimatedOutput").textContent = "Estimated Output: --";
    }
}
async function getPrice(token) {
    try {
        const dexContract = await loadDexContract();
        if (!dexContract) return null;

        // Get the price feed address for the token
        const priceFeedAddress = await dexContract.priceFeeds(token);

        if (priceFeedAddress === ethers.constants.AddressZero) {
            console.warn(`No price feed found for token: ${token}`);
            return null;
        }

        const priceFeed = new ethers.Contract(priceFeedAddress, priceFeedABI, provider);

        // Fetch the latest price
        const latestRoundData = await priceFeed.latestRoundData();
        const price = ethers.utils.formatUnits(latestRoundData.answer, 8); // Assuming 8 decimals
        console.log(`Price for ${token}: ${price}`);
        return parseFloat(price);
    } catch (error) {
        console.error(`Error fetching price for ${token}:`, error);
        return null;
    }
}





// Attach event listeners
document.getElementById("connectWalletButton").addEventListener("click", connectWallet);
document.getElementById("disconnectWalletButton").addEventListener("click", disconnectWallet);
document.getElementById("swapButton").addEventListener("click", swapTokens);
document.getElementById("reverseButton").addEventListener("click", reverseTokens);
document.getElementById("amount1").addEventListener("input", estimateOutput);

// Attach event listeners to update estimation dynamically
document.getElementById("token1").addEventListener("change", estimateOutput);
document.getElementById("token2").addEventListener("change", estimateOutput);
document.getElementById("amount1").addEventListener("input", estimateOutput);
