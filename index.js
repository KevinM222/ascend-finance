document.addEventListener('DOMContentLoaded', async () => {
    let provider;
    const connectWalletButton = document.getElementById('connectWalletButton');
    const disconnectWalletButton = document.getElementById('disconnectWalletButton');
    const balanceDisplay = document.getElementById('tokenBalance'); 
    const priceDisplay = document.getElementById('tokenPrice');
    const totalValueDisplay = document.getElementById('totalValue');

    if (window.ethereum) {
        provider = new ethers.providers.Web3Provider(window.ethereum);

        // 🚨 Ensure the user is on Polygon before allowing interactions
        await enforcePolygonNetwork();

        connectWalletButton.addEventListener('click', async () => {
            try {
                await window.ethereum.request({ method: 'eth_requestAccounts' });

                provider = new ethers.providers.Web3Provider(window.ethereum);
                const signer = provider.getSigner();
                const address = await signer.getAddress();

                connectWalletButton.style.display = 'none';
                disconnectWalletButton.style.display = 'block';
                disconnectWalletButton.style.backgroundColor = 'red';

                await fetchASCData(signer, address);

            } catch (error) {
                console.error("Error:", error);
            }
        });

        disconnectWalletButton.addEventListener('click', () => {
            connectWalletButton.style.display = 'block';
            disconnectWalletButton.style.display = 'none';
            balanceDisplay.innerText = "Your ASC Balance: N/A";
            totalValueDisplay.innerText = "Total Value: $0.00";
            console.log("Wallet disconnected");
        });

        async function enforcePolygonNetwork() {
            try {
                const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                if (chainId !== "0x89") {
                    console.warn("⚠️ Not on Polygon. Switching now...");
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x89' }], 
                    });
                    console.log("✅ Switched to Polygon Network");
                }
            } catch (error) {
                console.error("🚨 Failed to switch to Polygon:", error);
            }
        }

        async function fetchASCData(signer, userAddress) {
            try {
                const network = await provider.getNetwork();
                if (network.chainId !== 137) {
                    console.error("⚠️ Wrong network detected. Please switch to Polygon.");
                    return;
                }
        
                const ascContract = new ethers.Contract(
                    "0x4456b0f017f6bf9b0aa7a0ac3d3f224902a1937a",
                    ["function balanceOf(address owner) view returns (uint256)"],
                    provider
                );
        
                const balanceRaw = await ascContract.balanceOf(userAddress);
                const balance = parseFloat(ethers.utils.formatUnits(balanceRaw, 18)); // Convert BigNumber to Float
                const formattedBalance = balance.toFixed(balance >= 1 ? 2 : 6); // 2 decimals for large values, 6 for small
        
                console.log(`✅ User ASC Balance: ${formattedBalance}`);
        
                // ✅ Update UI with cleaned balance
                balanceDisplay.innerText = `Your ASC Balance: ${formattedBalance}`;
        
                if (balanceRaw.gt(0)) {
                    await addASCToWallet();
                }
        
                // 🔍 Fetch ASC price and update total value
                const ascPrice = await fetchASCPrice();
                const totalValue = balance * ascPrice;
                const formattedTotalValue = totalValue.toFixed(2); // Always 2 decimals for USD value
        
                console.log(`✅ Total USD Value: ${formattedTotalValue}`);
        
                // ✅ Update UI with total value
                totalValueDisplay.innerText = `Total Value: $${formattedTotalValue}`;
        
            } catch (error) {
                console.error("🚨 Error fetching ASC balance:", error);
                balanceDisplay.innerText = "Your ASC Balance: Unavailable";
                totalValueDisplay.innerText = "Total Value: $0.00";
            }
        }
        

        async function fetchASCPrice() {
            try {
                const POL_USD_FEED = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"; 
                const ascPOLPoolAddress = "0xeF85494A8d24ED93cC0f7a405Bb5616BFF18C235"; 
    
                const provider = new ethers.providers.JsonRpcProvider("https://polygon-rpc.com");
    
                // 🔍 Fetch POL price from Chainlink
                const priceFeed = new ethers.Contract(
                    POL_USD_FEED,
                    ["function latestAnswer() view returns (int256)"],
                    provider
                );
                const polPriceRaw = await priceFeed.latestAnswer();
                const polPrice = parseFloat(ethers.utils.formatUnits(polPriceRaw, 8)); 
                console.log("✅ POL/USD Price:", polPrice);
    
                // 🔍 Fetch ASC price data from Uniswap V3 LP
                const lpContract = new ethers.Contract(
                    ascPOLPoolAddress,
                    ["function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16, uint16, uint16, uint8, bool)"],
                    provider
                );
    
                const slot0 = await lpContract.slot0();
                const sqrtPriceX96 = slot0[0];
                console.log("✅ sqrtPriceX96 from LP:", sqrtPriceX96.toString());
    
                if (sqrtPriceX96 === 0) {
                    console.error("⚠️ No trades have happened yet.");
                    return 0;
                }
    
                // ✅ Fix: Invert the price ratio to get ASC price correctly
                const priceRatio = (sqrtPriceX96 / (2 ** 96)) ** 2;
                const ascPriceUSD = (1 / priceRatio) * polPrice;
                console.log("✅ Fixed ASC/USD Price:", ascPriceUSD);
    
                // ✅ Update UI with ASC price
                priceDisplay.innerText = `ASC Price: $${ascPriceUSD.toFixed(6)}`;
                return ascPriceUSD;
            } catch (error) {
                console.error("🚨 Error fetching ASC price:", error);
                priceDisplay.innerText = "ASC Price: Unavailable";
                return 0;
            }
        }

        async function addASCToWallet() {
            try {
                await window.ethereum.request({
                    method: 'wallet_watchAsset',
                    params: {
                        type: 'ERC20',
                        options: {
                            address: '0x4456b0f017f6bf9b0aa7a0ac3d3f224902a1937a',
                            symbol: 'ASC',
                            decimals: 18,
                            image: 'https://ascend.finance/logo.png'
                        },
                    },
                });
            } catch (error) {
                console.error('Error adding ASC to wallet:', error);
            }
        }

        // ✅ Call fetchASCPrice() **AFTER** function is defined
        fetchASCPrice();
    } else {
        console.error("Non-Ethereum browser detected. Install MetaMask.");
    }
});
