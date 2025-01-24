// Load dependencies
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

// Define the contract address
const dexAddress = "0xf2c0E223B5A2A65933EE7F0bbb801c944cFa12C6"; // Replace with your deployed Modular DEX contract address

// Function to load the ABI dynamically
async function loadDexContract() {
    try {
        // Fetch the ABI from the JSON file
        const response = await fetch('./dexABI.json'); // Ensure this file path is correct
        const { abi: dexABI } = await response.json();

        // Initialize the DEX contract
        const dexContract = new ethers.Contract(dexAddress, dexABI, signer);
        console.log("DEX contract initialized:", dexContract);
        return dexContract;
    } catch (error) {
        console.error("Failed to load the DEX ABI or contract:", error);
        return null; // Return null to handle errors gracefully
    }
}

// Example function to perform a swap
async function swapTokens() {
    const tokenA = document.getElementById("tokenA").value;
    const tokenB = document.getElementById("tokenB").value;
    const amountA = document.getElementById("amountA").value;

    try {
        const dexContract = await loadDexContract();

        if (!dexContract) {
            alert("DEX contract is not initialized.");
            return;
        }

        // Call the swap function on the contract
        const tx = await dexContract.swap(
            tokenA, 
            tokenB,
            ethers.utils.parseUnits(amountA, 6) // Assuming tokens like USDC have 6 decimals
        );

        await tx.wait();
        alert("Swap successful!");
    } catch (error) {
        console.error("Error during swap:", error);
        alert("Swap failed. Check the console for details.");
    }
}

// Function to reverse the selected tokens (for the reverse button)
function reverseTokens() {
    const tokenA = document.getElementById("tokenA");
    const tokenB = document.getElementById("tokenB");

    // Swap the selected values of the dropdowns
    const tempValue = tokenA.value;
    tokenA.value = tokenB.value;
    tokenB.value = tempValue;
}

// Function to estimate the output for a given swap
async function estimateOutput() {
    const tokenA = document.getElementById("tokenA").value;
    const tokenB = document.getElementById("tokenB").value;
    const amountA = document.getElementById("amountA").value;

    try {
        const dexContract = await loadDexContract();

        if (!dexContract) {
            console.error("DEX contract is not initialized for estimation.");
            return;
        }

        // Call a function to estimate the output on the contract (replace with actual method)
        const estimatedOutput = await dexContract.estimateSwap(
            tokenA,
            tokenB,
            ethers.utils.parseUnits(amountA, 6)
        );

        // Display the estimated output
        document.getElementById("estimatedOutput").textContent =
            `Estimated Output: ${ethers.utils.formatUnits(estimatedOutput, 6)} ${tokenB}`;
    } catch (error) {
        console.error("Error estimating output:", error);
    }
}

// Attach event listeners
document.getElementById("swapButton").addEventListener("click", swapTokens);
document.getElementById("reverseButton").addEventListener("click", reverseTokens);
document.getElementById("amountA").addEventListener("input", estimateOutput);
