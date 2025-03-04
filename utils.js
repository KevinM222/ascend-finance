// C:\Users\User\Desktop\Ascend\frontend\utils.js
const ethers = require('ethers'); // Ensure ethers is installed (e.g., npm install ethers) or loaded via CDN

async function fetchASCPrice() {
    try {
        const POL_USD_FEED = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"; // Chainlink POL/USD feed
        const ascPOLPoolAddress = "0xeF85494A8d24ED93cC0f7a405Bb5616BFF18C235"; // ASC/POL Uniswap V3 pool
        const provider = new ethers.providers.JsonRpcProvider("https://polygon-rpc.com");

        // Fetch POL price in USD from Chainlink
        const priceFeed = new ethers.Contract(
            POL_USD_FEED,
            ["function latestAnswer() view returns (int256)"],
            provider
        );
        const polPriceRaw = await priceFeed.latestAnswer();
        const polPrice = parseFloat(ethers.utils.formatUnits(polPriceRaw, 8)); // 8 decimals for Chainlink
        console.log("✅ POL/USD Price:", polPrice);

        // Fetch ASC/POL price from Uniswap V3 pool
        const lpContract = new ethers.Contract(
            ascPOLPoolAddress,
            [
                "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16, uint16, uint16, uint8, bool)",
                "function token0() view returns (address)",
                "function token1() view returns (address)"
            ],
            provider
        );

        const slot0 = await lpContract.slot0();
        const sqrtPriceX96 = slot0[0];
        console.log("✅ sqrtPriceX96 from LP:", sqrtPriceX96.toString());

        if (sqrtPriceX96.eq(0)) {
            console.error("⚠️ No trades have happened yet in the pool.");
            return 0;
        }

        // Determine token order in the pool
        const token0 = await lpContract.token0();
        const token1 = await lpContract.token1();
        const ASC_TOKEN = "0x4456B0F017F6bF9b0aa7a0ac3d3F224902a1937A"; // From staking.js
        const isAscToken0 = token0.toLowerCase() === ASC_TOKEN.toLowerCase();

        // Calculate price from sqrtPriceX96
        // sqrtPriceX96 = sqrt(token1/token0) * 2^96
        const priceX96 = sqrtPriceX96.mul(sqrtPriceX96).div(ethers.BigNumber.from(2).pow(192));
        let ascPriceInPol;

        if (isAscToken0) {
            // ASC is token0, POL is token1: priceX96 is POL per ASC, so invert it
            const polPerAsc = parseFloat(ethers.utils.formatUnits(priceX96, 18)); // Assuming POL and ASC are 18 decimals
            ascPriceInPol = 1 / polPerAsc;
        } else {
            // ASC is token1, POL is token0: priceX96 is ASC per POL, so use directly
            ascPriceInPol = parseFloat(ethers.utils.formatUnits(priceX96, 18));
        }

        console.log("✅ ASC Price in POL:", ascPriceInPol);
        return ascPriceInPol; // Returns price of 1 ASC in POL (e.g., 0.0008)
    } catch (error) {
        console.error("❌ Failed to fetch ASC price:", error.message);
        return 0; // Fallback value
    }
}

module.exports = { fetchASCPrice };