document.addEventListener('DOMContentLoaded', async () => {
    let provider;
    const connectWalletButton = document.getElementById('connectWalletButton');
    const disconnectWalletButton = document.getElementById('disconnectWalletButton');
    const balanceDisplay = document.getElementById('ascBalance'); 
    const priceDisplay = document.getElementById('ascPrice');

    if (window.ethereum) {
        provider = new ethers.providers.Web3Provider(window.ethereum);

        connectWalletButton.addEventListener('click', async () => {
            try {
                await window.ethereum.request({ method: 'eth_requestAccounts' });

                provider = new ethers.providers.Web3Provider(window.ethereum);
                const signer = provider.getSigner();
                const address = await signer.getAddress();

                connectWalletButton.style.display = 'none';
                disconnectWalletButton.style.display = 'block';
                disconnectWalletButton.style.backgroundColor = 'red';

                // Get current network
                const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                if (chainId !== "0x89") {
                    await switchToPolygon();
                }

                await fetchASCBalance(signer, address);

            } catch (error) {
                console.error("Error:", error);
            }
        });

        disconnectWalletButton.addEventListener('click', () => {
            connectWalletButton.style.display = 'block';
            disconnectWalletButton.style.display = 'none';
            balanceDisplay.innerText = "N/A";
            console.log("Wallet disconnected");
        });

        async function switchToPolygon() {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x89' }], 
                });
                console.log("Switched to Polygon Network");
            } catch (error) {
                console.error("Failed to switch network:", error);
            }
        }

        async function fetchASCBalance(signer, userAddress) {
            try {
                const ascContract = new ethers.Contract(
                    '0x4456b0f017f6bf9b0aa7a0ac3d3f224902a1937a',
                    ["function balanceOf(address owner) view returns (uint256)"],
                    provider
                );

                const balance = await ascContract.balanceOf(userAddress);
                const formattedBalance = ethers.utils.formatUnits(balance, 18);
                balanceDisplay.innerText = `${formattedBalance} ASC`;

                if (balance.gt(0)) {
                    await addASCToWallet();
                }

            } catch (error) {
                console.error("Error fetching balance:", error);
                balanceDisplay.innerText = "N/A";
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
    } else {
        console.error("Non-Ethereum browser detected. Install MetaMask.");
    }

    // Fetch ASC Price from PolygonScan
    async function fetchASCPrice() {
        try {
            const response = await fetch(`https://api.polygonscan.com/api?module=stats&action=tokensupply&contractaddress=0x4456b0f017f6bf9b0aa7a0ac3d3f224902a1937a&apikey=YOUR_POLYGONSCAN_API_KEY`);
            const data = await response.json();

            if (data.status === "1") {
                const totalSupply = ethers.utils.formatUnits(data.result, 18);

                // Replace with an actual price source (e.g., CoinGecko, Chainlink, etc.)
                const pricePerASC = 0.01; // Example: $0.01 per ASC (hardcoded for now)

                priceDisplay.innerText = `$${pricePerASC} per ASC`;
            } else {
                throw new Error("Failed to fetch ASC price.");
            }

        } catch (error) {
            console.error("Error fetching ASC price:", error);
            priceDisplay.innerText = "Price unavailable";
        }
    }

    // Run price fetch on page load
    fetchASCPrice();
});
