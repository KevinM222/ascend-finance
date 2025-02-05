// index.js
document.addEventListener('DOMContentLoaded', async () => {
    const connectWalletButton = document.getElementById('connectWalletButton');
    const disconnectWalletButton = document.getElementById('disconnectWalletButton');
    
    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      
      connectWalletButton.addEventListener('click', async () => {
        try {
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          connectWalletButton.style.display = 'none';
          disconnectWalletButton.style.display = 'block';
          disconnectWalletButton.style.backgroundColor = 'red'; // Makes button reddish
          // Here you would fetch and display the balance of ASC
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

  const ascContractAddress = '0x4456b0f017f6bf9b0aa7a0ac3d3f224902a1937a'; // Polygon ASC token address
const contract = new ethers.Contract(ascContractAddress, [
  "function balanceOf(address) view returns (uint256)"
], provider.getSigner());

const balance = await contract.balanceOf(connectedAddress);
console.log('ASC Balance:', ethers.utils.formatUnits(balance, 18));

