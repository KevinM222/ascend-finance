document.addEventListener('DOMContentLoaded', async () => {
  let provider;
  const connectWalletButton = document.getElementById('connectWalletButton');
  const disconnectWalletButton = document.getElementById('disconnectWalletButton');

  if (window.ethereum) {
      provider = new ethers.providers.Web3Provider(window.ethereum);
      
      connectWalletButton.addEventListener('click', async () => {
          try {
              await window.ethereum.request({ method: 'eth_requestAccounts' });
              connectWalletButton.style.display = 'none';
              disconnectWalletButton.style.display = 'block';
              disconnectWalletButton.style.backgroundColor = 'red'; 
              // Fetch and display balance here, after connection is confirmed
              const signer = provider.getSigner();
              const address = await signer.getAddress();
              const ascContract = new ethers.Contract('0x4456b0f017f6bf9b0aa7a0ac3d3f224902a1937a', [
                  "function balanceOf(address) view returns (uint256)"
              ], signer);
              const balance = await ascContract.balanceOf(address);
              console.log('ASC Balance:', ethers.utils.formatUnits(balance, 18));
          } catch (error) {
              console.error("User denied account access", error);
          }
      });

      disconnectWalletButton.addEventListener('click', () => {
          connectWalletButton.style.display = 'block';
          disconnectWalletButton.style.display = 'none';
          // Implement actual disconnect logic here if needed
      });
  } else {
      console.error("Non-Ethereum browser detected. You should consider trying MetaMask!");
  }
});