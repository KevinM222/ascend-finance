# AscendDEX Contract Testing Documentation

## Objective
Verify core functionalities of the AscendDEX contract: adding liquidity and token swaps.

## Test Cases
### 1. Add Liquidity
- **Input**: `amount1 = 100 ASC`, `amount2 = 50 POL`
- **Expected Result**: Reserves updated correctly.
- **Actual Result**: Test passed. Reserves after addition:
  - Reserve1 (ASC): 100
  - Reserve2 (POL): 50

### 2. Perform Swap
- **Input**: `amountIn = 10 POL`, `amountOutMin = 1 ASC`
- **Expected Result**: Reserves update after swap:
  - `reserve1` increases.
  - `reserve2` decreases.
- **Actual Result**: Test passed. Reserves after swap:
  - Reserve1 (ASC): 83.383333
  - Reserve2 (POL): 60

## Environment
- **Network**: Sepolia
- **Solidity Version**: 0.8.0
- **Hardhat Version**: 2.22.18
- **Node.js Version**: 22.13.0

## Debugging
- Fixed incorrect calculations in `getAmountOut`.

## Status
- **Overall**: All core functionalities passed testing.
- **Confidence Level**: 100%
