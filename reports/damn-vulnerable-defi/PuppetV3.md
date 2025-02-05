# **Security Audit Report: Oracle Manipulation Leading to Under-Collateralized Loans**

## **Summary**

The `PuppetV3Pool` contract relies on a **Time-Weighted Average Price (TWAP) oracle** from Uniswap V3 to determine the required WETH deposit for borrowing `DamnValuableToken` (DVT). However, the **short TWAP period of 10 minutes** makes the oracle highly susceptible to price manipulation. An attacker can **artificially manipulate the Uniswap V3 pool price**, reducing the required collateral and allowing them to borrow large amounts of DVT with insufficient WETH. This can lead to **significant financial loss** and **potential insolvency** of the lending pool.

## **Impact**

**Severity**: **High**

An attacker can exploit this vulnerability to:
- **Obtain under-collateralized loans** by manipulating the oracle price.
- **Drain the `PuppetV3Pool` contract** of DVT tokens.
- **Cause financial loss** to the lending protocol and its users.
- **Render the lending pool insolvent**, affecting its ability to meet obligations.

## **Vulnerability Details**

### **Description**

The `PuppetV3Pool` contract allows users to borrow DVT tokens by depositing WETH as collateral:

```solidity
function borrow(uint256 borrowAmount) external {
  uint256 depositOfWETHRequired = calculateDepositOfWETHRequired(borrowAmount);
  weth.transferFrom(msg.sender, address(this), depositOfWETHRequired);
  deposits[msg.sender] += depositOfWETHRequired;
  TransferHelper.safeTransfer(address(token), msg.sender, borrowAmount);
  emit Borrowed(msg.sender, depositOfWETHRequired, borrowAmount);
}
```

The required WETH deposit is determined using the Uniswap V3 TWAP oracle:

```solidity
function calculateDepositOfWETHRequired(uint256 amount) public view returns (uint256) {
  uint256 quote = _getOracleQuote(_toUint128(amount));
  return quote * DEPOSIT_FACTOR;
}

function _getOracleQuote(uint128 amount) private view returns (uint256) {
  (int24 arithmeticMeanTick,) = OracleLibrary.consult({pool: address(uniswapV3Pool), secondsAgo: TWAP_PERIOD});
  return OracleLibrary.getQuoteAtTick({
      tick: arithmeticMeanTick,
      baseAmount: amount,
      baseToken: address(token),
      quoteToken: address(weth)
  });
}
```

**Issue**: The contract uses a **TWAP period (`TWAP_PERIOD`) of only 10 minutes**:

```solidity
uint32 public constant TWAP_PERIOD = 10 minutes;
```

This short period makes the oracle **highly susceptible to price manipulation**. An attacker can **manipulate the Uniswap V3 pool price** of DVT relative to WETH by swapping large amounts, skewing the TWAP calculation.

### **Exploit Scenario**

1. **Price Manipulation**: The attacker swaps a significant amount of DVT for WETH (or vice versa) in the Uniswap V3 pool, drastically altering the DVT/WETH price.
2. **Influencing TWAP**: Due to the short 10-minute TWAP period, the recent price manipulation heavily influences the TWAP, which is used by the `PuppetV3Pool` contract to calculate collateral requirements.
3. **Under-Collateralized Borrowing**: With the manipulated TWAP, the attacker calculates a much lower required WETH deposit for a substantial DVT borrow amount.
4. **Borrowing Tokens**: The attacker deposits the reduced amount of WETH and calls `borrow()`, receiving a large amount of DVT tokens.
5. **Reverting Price Manipulation**: The attacker then reverses the initial swap on Uniswap V3, normalizing the price.
6. **Profit**: The attacker retains the borrowed DVT tokens while having deposited insufficient collateral, effectively stealing tokens from the lending pool.

### **Code Flow Leading to Vulnerability**
- The TWAP oracle fetches price data from Uniswap V3 **without any manipulation checks**.
- The **short TWAP period** does not sufficiently mitigate the effect of sudden price changes.
- **No additional price oracles** or safeguards are used to verify the integrity of the price data.

## **Recommendation**

### **1. Increase TWAP Period**
Use a significantly longer TWAP period (e.g., **several hours**) to reduce the impact of short-term price manipulations.

```solidity
uint32 public constant TWAP_PERIOD = 6 hours;
```

### **2. Use Median or Multiple Oracles**
Instead of relying on a single TWAP oracle, **aggregate price data from multiple sources** and use a **median value** to determine collateral requirements.

### **3. Add Manipulation Checks**
Implement logic to **detect and prevent borrowing** when **abnormal price movements** are detected.

### **4. Collateralization Ratio Buffer**
Increase the **collateralization ratio** to provide a buffer against price volatility.

### **5. Emergency Shutdown Mechanism**
Introduce a mechanism to **halt borrowing** in case of detected anomalies in price feeds.

### **6. Consult Trusted Oracles**
Integrate with **trusted decentralized oracle networks** like **Chainlink**, which are more resistant to manipulation.

## **Proof of Concept**

An attacker can execute the following steps in a **single transaction** (using **flash loans** to avoid upfront capital):

1. **Manipulate Uniswap V3 Price**:
   - Use a **flash loan** to borrow a large amount of WETH.
   - Swap WETH for DVT on Uniswap V3, **drastically lowering the DVT price** in terms of WETH.

2. **Borrow DVT from PuppetV3Pool**:
   - Call `calculateDepositOfWETHRequired()` to find the **falsely reduced collateral requirement**.
   - Deposit the required (now significantly less) WETH collateral.
   - Call `borrow()` to borrow a **large amount of DVT**.

3. **Reverse Price Manipulation**:
   - Swap DVT back to WETH on Uniswap V3 to **restore the original price** (may incur some loss due to slippage and fees).

4. **Profit**:
   - Repay the **flash loan**.
   - Keep the **excess DVT tokens** as profit.

## **References**
- [Uniswap V3 TWAP Oracle Documentation](https://docs.uniswap.org/protocol/concepts/V3-overview/oracle)
- [Price Oracle Manipulation Attacks](https://blog.openzeppelin.com/oracle-manipulation/)
- [Chainlink Whitepaper: Decentralized Oracle Networks](https://research.chain.link/whitepaper-v2.pdf)

## **Conclusion**

The reliance on a **short-period Uniswap V3 TWAP oracle** without safeguards exposes the `PuppetV3Pool` contract to **price manipulation attacks**, allowing attackers to **obtain under-collateralized loans** and **steal funds from the protocol**. Implementing the **recommended changes** will mitigate this vulnerability.