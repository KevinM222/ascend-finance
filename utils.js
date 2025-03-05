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

        // Correct Uniswap V3 price calculation
        const Q96 = ethers.BigNumber.from(2).pow(96);
        const price = sqrtPriceX96.mul(sqrtPriceX96).mul(ethers.BigNumber.from(10).pow(18)).div(Q96).div(Q96);
        let ascPriceInPol;

        if (isAscToken0) {
            // ASC is token0, POL is token1: price is POL per ASC
            ascPriceInPol = parseFloat(ethers.utils.formatUnits(price, 18));
        } else {
            // ASC is token1, POL is token0: price is ASC per POL, invert
            ascPriceInPol = 1 / parseFloat(ethers.utils.formatUnits(price, 18));
        }

        console.log("✅ ASC Price in POL:", ascPriceInPol);
        // Optional: Return ASC/USD to match index.js if desired
        // const ascPriceInUsd = ascPriceInPol * polPrice;
        // console.log("✅ ASC/USD Price:", ascPriceInUsd);
        return ascPriceInPol;
    } catch (error) {
        console.error("❌ Failed to fetch ASC price:", error.message);
        return 0;
    }
}

export { fetchASCPrice };
