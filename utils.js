// C:\Users\User\Desktop\Ascend\frontend\utils.js
async function fetchASCPrice() {
    try {
        const POL_USD_FEED = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"; 
        const ascPOLPoolAddress = "0xeF85494A8d24ED93cC0f7a405Bb5616BFF18C235"; 
        const provider = new ethers.providers.JsonRpcProvider("https://polygon-rpc.com");

        const priceFeed = new ethers.Contract(
            POL_USD_FEED,
            ["function latestAnswer() view returns (int256)"],
            provider
        );
        const polPriceRaw = await priceFeed.latestAnswer();
        const polPrice = parseFloat(ethers.utils.formatUnits(polPriceRaw, 8));
        console.log("✅ POL/USD Price:", polPrice);

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

        const token0 = await lpContract.token0();
        const token1 = await lpContract.token1();
        const ASC_TOKEN = "0x4456B0F017F6bF9b0aa7a0ac3d3F224902a1937A";
        const isAscToken0 = token0.toLowerCase() === ASC_TOKEN.toLowerCase();
        console.log("✅ Token0:", token0);
        console.log("✅ Token1:", token1);
        console.log("✅ Is ASC Token0?", isAscToken0);

        // Match index.js logic
        const priceRatio = Math.pow(sqrtPriceX96.toString() / Math.pow(2, 96), 2); // ASC/POL ≈ 0.000826
        const ascPriceInPol = priceRatio; // ASC/POL, not inverted

        console.log("✅ Raw Price (token1/token0):", priceRatio);
        console.log("✅ ASC Price in POL:", ascPriceInPol);
        return ascPriceInPol; // Returns ASC/POL to match index.js scale
    } catch (error) {
        console.error("❌ Failed to fetch ASC price:", error.message);
        return 0;
    }
}

export { fetchASCPrice };