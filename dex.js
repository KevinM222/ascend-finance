// Load dependencies
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

// Define the contract address
const dexAddress = "0xf2c0E223B5A2A65933EE7F0bbb801c944cFa12C6"; // Replace with your deployed Modular DEX contract address

// Function to load the ABI dynamically
async function loadDexContract() {
    try {
        // Fetch the ABI from the JSON file
        const response = await fetch('./ABI/dexABI.json');
        const dexABI = await response.json();

        // Initialize the DEX contract
        const dexContract = new ethers.Contract(dexAddress, dexABI, signer);

        console.log("DEX contract initialized:", dexContract);
        return dexContract;
    } catch (error) {
        console.error("Failed to load the DEX ABI or contract:", error);
    }
}

// Example function to perform a swap (adjust as needed)
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

// Attach event listener for the swap button
document.getElementById("swapButton").addEventListener("click", swapTokens);
