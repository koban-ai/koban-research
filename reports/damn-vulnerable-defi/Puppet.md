# **Synthesized Security Audit Report**

## **Vulnerability: Oracle Manipulation Leading to Under-Collateralized Loans**

### **Severity:** High

### **Description**

The `PuppetPool` contract relies on a price oracle derived from a Uniswap V1 pair to determine the required ETH collateral for borrowing Damn Valuable Tokens (DVTs). The oracle price is computed using the `_computeOraclePrice()` function:

```solidity
function _computeOraclePrice() private view returns (uint256) {
  return uniswapPair.balance * (10 ** 18) / token.balanceOf(uniswapPair);
}
```

This function calculates the price of DVT tokens based on the ETH and DVT reserves of the Uniswap V1 pair (`uniswapPair`). The issue arises because this on-chain oracle is **directly influenced by the immediate state of the Uniswap pair's reserves**, which can be **manipulated by an attacker** through trades.

### **Attack Scenario**

1. **Manipulate the Oracle Price:**
   - The attacker swaps a large amount of DVT for ETH on the Uniswap V1 pair.
   - This increases the DVT token reserves (`token.balanceOf(uniswapPair)`) and decreases the ETH reserves (`uniswapPair.balance`).
   - As a result, the oracle price computed by `_computeOraclePrice()` **decreases significantly**.

2. **Borrow DVT Tokens with Minimal Collateral:**
   - With the manipulated low oracle price, the `calculateDepositRequired(amount)` function returns a **much smaller `depositRequired`** than intended for the desired `amount` of DVT tokens.
   - The attacker calls the `borrow()` function on the `PuppetPool`, supplying the minimal ETH collateral now required.
   - The pool transfers the requested amount of DVT tokens to the attacker.

3. **Profit:**
   - The attacker can then reverse the manipulation by swapping ETH back for DVT tokens if desired, or simply keep the borrowed DVT tokens.
   - The attacker gains a large amount of DVT tokens while only locking a minimal amount of ETH as collateral.

### **Impact**

- **Loss of Funds:** The attacker can drain the `PuppetPool` of its DVT token liquidity by borrowing tokens with insufficient collateral.
- **Collateral Undercollateralization:** The pool's security model is compromised as borrowers are no longer providing adequate collateral, leading to potential insolvency.

### **Proof of Concept**

1. **Obtain DVT Tokens:**
   - The attacker acquires a significant amount of DVT (e.g., through prior holdings or another mechanism).

2. **Manipulate Uniswap Price:**
   ```solidity
   // Approve Uniswap exchange to spend attacker's DVTs
   dvtToken.approve(uniswapExchange.address, attackerDVTBalance);

   // Swap DVTs for ETH, manipulating the reserves
   uniswapExchange.tokenToEthSwapInput(
       attackerDVTBalance,
       minEth,
       deadline
   );
   ```

3. **Calculate Manipulated Oracle Price:**
   - The new oracle price reflects the manipulated reserves.

4. **Borrow DVTs with Minimal Collateral:**
   ```solidity
   uint256 amountToBorrow = puppetPool.token.balanceOf(puppetPool.address);
   uint256 manipulatedDepositRequired = puppetPool.calculateDepositRequired(amountToBorrow);

   // Borrow all tokens from the pool
   puppetPool.borrow{value: manipulatedDepositRequired}(
       amountToBorrow,
       attackerAddress
   );
   ```

5. **Outcome:**
   - The attacker drains the pool’s DVT tokens.
   - The collateral deposited is significantly less than the value of borrowed tokens.

### **Recommendation**

- **Use a Reliable Oracle:** Avoid relying on instantaneous on-chain metrics that can be manipulated within a single transaction. Instead, integrate a time-weighted average price (TWAP) oracle or use a trusted external oracle service that is resistant to manipulation.
- **Validate Price Feeds:** Implement checks to ensure that price inputs used for critical calculations are within acceptable boundaries and have not changed drastically within a short period.
- **Add Rate Limiting:** Limit the amount that can be borrowed or the frequency of borrowing to reduce the impact of any potential manipulation.
- **Monitor Pool Activities:** Implement monitoring for unusual trading patterns or large swaps that could indicate price manipulation attempts.

### **References**

- [Uniswap V1 Price Manipulation Attacks](https://uniswap.org/docs/v1/frontend-integration/trading-from-a-smart-contract/#examples)
- [Oracle Manipulation Vulnerabilities](https://consensys.github.io/smart-contract-best-practices/attacks/oracle-manipulation/)
- [Time-Weighted Average Price (TWAP)](https://docs.uniswap.org/protocol/V2/concepts/advanced-topics/time-weighted-average-price)