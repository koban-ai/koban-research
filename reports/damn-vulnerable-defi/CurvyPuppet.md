# CurvyPuppetLending Security Audit Report

## 1. Manipulation of `get_virtual_price()` Allows Attacker to Undercollateralize Loans and Force Liquidations

### **Severity**: High

### **Description**
The `CurvyPuppetLending` contract relies on the Curve pool's `get_virtual_price()` function to determine the price of LP tokens (`borrowAsset`). This function is susceptible to manipulation through large trades or liquidity shifts, allowing an attacker to:

1. **Lower the LP Token Price**: By executing large swaps or adding/removing liquidity in an imbalanced manner, the attacker can artificially reduce the `get_virtual_price()`, making the LP token appear cheaper. This allows them to borrow more than they should, undercollateralizing their position.
2. **Increase the LP Token Price Before Liquidation**: The attacker can then reverse their actions to inflate the `get_virtual_price()`, making their `borrowValue` appear higher than their `collateralValue`, forcing liquidations of their own or other users' positions.

### **Impact**
- **Undercollateralized Loans**: Attackers can borrow more than allowed, risking the solvency of the lending protocol.
- **Forced Liquidations**: Attackers can manipulate the LP token price to force healthy positions into liquidation.
- **Financial Losses**: Honest users may lose their collateral due to manipulated liquidations, and the protocol may incur losses due to bad debt.

### **Fix**
- **Use a Reliable Oracle for LP Token Price**: Replace `get_virtual_price()` with a trusted oracle service (e.g., Chainlink) that provides tamper-resistant LP token pricing.
- **Implement Price Smoothing or Limits**: Introduce mechanisms to smooth out sudden changes in LP token price and set reasonable bounds on price movements within a short time frame.
- **Monitor Pool Manipulation**: Implement on-chain monitoring to detect and mitigate large liquidity shifts that could impact `get_virtual_price()`.

---

## 2. Storage Collision Leading to Oracle Manipulation in `CurvyPuppetOracle`

### **Severity**: High

### **Description**
The `CurvyPuppetOracle` contract suffers from a storage collision between the `Ownable` contract's owner storage slot and the mapping used to store asset prices. This allows an attacker to overwrite the owner of the oracle contract, enabling them to manipulate asset prices.

### **Impact**
- **Price Manipulation**: The attacker can set arbitrary prices for assets, leading to:
  - **Forced Liquidations**: By reducing collateral prices or inflating borrow asset prices, attackers can liquidate other users unfairly.
  - **Manipulated Borrowing**: Attackers can adjust prices to borrow more than they should or avoid liquidation.
- **Loss of Funds**: Users may lose their collateral due to manipulated liquidations.

### **Fix**
- **Use OpenZeppelin's Ownable Contract**: Replace the Solady `Ownable` contract with OpenZeppelin's well-tested version, which correctly manages storage slots.
- **Avoid Fixed Storage Slots**: Do not use fixed storage slots that are low and can overlap with other variables.
- **Audit Storage Layout**: Always verify the storage layout when using multiple inheritance or importing contracts to prevent similar issues.

---

## 3. Price Manipulation via Flash Loans Leading to Under-Collateralization and Liquidation

### **Severity**: High

### **Description**
The `CurvyPuppetLending` contract allows users to borrow LP tokens from a Curve pool by depositing `Damn Valuable Tokens (DVT)` as collateral. The loan's health is determined by comparing the `borrowValue` and the `collateralValue`, calculated using prices obtained from an oracle and the Curve pool's `get_virtual_price()`.

An attacker can use flash loans to manipulate `get_virtual_price()` within a single transaction, allowing them to:
1. **Borrow Excessive Tokens**: By lowering `get_virtual_price()`, the attacker can borrow more LP tokens than they should be able to.
2. **Force Liquidations**: By inflating `get_virtual_price()`, attackers can make other users' positions appear undercollateralized and liquidate them.

### **Impact**
- **Over-Borrowing**: Attackers can borrow more than allowed, potentially draining the pool of its LP tokens.
- **Forced Liquidations**: Honest users may have their positions unfairly liquidated, leading to loss of their collateral.
- **Financial Loss**: The protocol and its users can suffer significant financial losses due to these manipulations.

### **Fix**
- **Use Time-Weighted Averages (TWAP)**: Implement price oracles that provide TWAPs for the LP token price to mitigate short-term manipulations.
- **Introduce Price Feeds**: Integrate with reliable on-chain oracles (e.g., Chainlink) that provide secure and manipulation-resistant price feeds for the LP tokens.
- **Add Slippage Checks**: Implement slippage or price deviation checks to detect and prevent drastic changes in `get_virtual_price()` within a single transaction.
- **Borrow Limits**: Impose strict borrow limits per transaction to reduce the impact of any potential manipulation.

---

## 4. Reentrancy Attack in `borrow()` Function Due to Missing `nonReentrant` Modifier

### **Severity**: High

### **Description**
The `CurvyPuppetLending` contract's `borrow()` function lacks the `nonReentrant` modifier, making it susceptible to reentrancy attacks if the `borrowAsset` (the LP token) has a `transfer()` function that allows for reentrant calls.

An attacker could craft a malicious contract that re-enters the `borrow()` function during the `IERC20(borrowAsset).transfer(msg.sender, amount);` call, allowing them to:
- Re-enter the `borrow()` function multiple times before the first call completes.
- Increase their `positions[msg.sender].borrowAmount` without corresponding increases in collateral.
- Drain the contract of its LP tokens without providing sufficient collateral.

### **Impact**
- **Collateral Drain**: Attackers can repeatedly borrow without proper collateralization, leading to significant losses for the protocol.
- **State Inconsistency**: The contract's internal accounting can be manipulated, leading to incorrect balances and potential insolvency.

### **Fix**
- **Add `nonReentrant` Modifier**: Protect the `borrow()` function with the `nonReentrant` modifier to prevent reentrancy attacks.
```solidity
function borrow(uint256 amount) external nonReentrant {
  // ... function logic ...
}
```
- **Follow Checks-Effects-Interactions Pattern**: Ensure that state variables are updated before making external calls to prevent reentrancy vulnerabilities.

---

# Conclusion

The `CurvyPuppetLending` and `CurvyPuppetOracle` contracts contain multiple high-severity vulnerabilities that could lead to financial losses, forced liquidations, and protocol insolvency. The most critical issues include:

1. **Manipulation of `get_virtual_price()`**: Allows attackers to undercollateralize loans and force liquidations.
2. **Storage Collision in `CurvyPuppetOracle`**: Enables attackers to take control of the oracle and manipulate asset prices.
3. **Flash Loan-Based Price Manipulation**: Allows attackers to borrow excessive tokens or liquidate users unfairly.
4. **Reentrancy in `borrow()`**: Enables attackers to repeatedly borrow without proper collateralization.

### **Recommended Fixes**
- Replace `get_virtual_price()` with a trusted oracle (e.g., Chainlink).
- Use OpenZeppelin's `Ownable` contract to prevent storage collisions.
- Implement TWAP oracles to mitigate flash loan-based price manipulation.
- Add the `nonReentrant` modifier to the `borrow()` function.

By implementing these fixes, the protocol can significantly improve its security and protect users from potential exploits.