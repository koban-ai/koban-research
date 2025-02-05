# **ShardsNFTMarketplace Security Audit Report**

## **1. Incorrect Time Window Validation in `cancel` Function Prevents Buyers from Cancelling Purchases**

### **Severity:** High

### **Description**
The `cancel` function is designed to allow buyers to cancel their purchases within a specific time window. However, due to incorrect logical conditions, buyers are **never** able to cancel their purchases.

#### **Vulnerable Code**
```solidity
if (
  purchase.timestamp + CANCEL_PERIOD_LENGTH < block.timestamp
      || block.timestamp > purchase.timestamp + TIME_BEFORE_CANCEL
) revert BadTime();
```
This condition incorrectly prevents cancellation at all times.

### **Impact**
- **Locked Funds:** Buyers cannot retrieve their funds.
- **Denial of Service:** Sellers may not complete the offer, leaving buyers' funds stuck.
- **Violation of Expected Behavior:** Buyers expect to cancel within the allowed time window.

### **Fix**
Correct the time validation condition:
```solidity
if (
  block.timestamp < purchase.timestamp + TIME_BEFORE_CANCEL
      || block.timestamp > purchase.timestamp + CANCEL_PERIOD_LENGTH
) revert BadTime();
```
This ensures buyers can cancel only within the intended time window.

---

## **2. Rate Manipulation Leading to Inconsistent Payments**

### **Severity:** High

### **Description**
The contract relies on an oracle-controlled `rate` variable to convert prices and fees. Since `rate` is mutable, an attacker can manipulate it to cause financial discrepancies.

### **Impact**
- **Financial Loss for Sellers:** Sellers may receive significantly less than expected.
- **Contract Depletion:** The contract may pay out more than it received.
- **Market Manipulation:** A malicious oracle can exploit the system.

### **Exploit Scenario**
1. The attacker sets a **low rate** when purchasing shards.
2. The attacker sets a **high rate** before the offer closes.
3. The contract owes more DVT than it received, leading to a loss.

### **Fix**
- **Fix the Rate at Offer Creation:** Store `rate` at the time of offer creation and use it consistently.
- **Implement Rate Change Constraints:** Prevent sudden rate changes.
- **Validate Payment Amounts:** Ensure the contract does not pay out more than it received.

---

## **3. Seller Overpaid Due to Unit Mismatch in Payment Calculation**

### **Severity:** High

### **Description**
The `_closeOffer` function overpays the seller by a factor of **1,000,000** due to a unit mismatch in the `rate` variable.

#### **Vulnerable Code**
```solidity
payment += purchase.shards.mulWadUp(purchase.rate);
```
Since `purchase.rate` is scaled by `1e6`, this results in an overpayment.

### **Impact**
- **Financial Loss:** Sellers receive significantly more than they should.
- **Contract Drain:** The contract can be drained of funds.
- **Reputation Damage:** Users may exploit this to extract excess funds.

### **Fix**
Adjust the seller payment calculation:
```solidity
payment += purchase.shards.mulWadUp(purchase.rate) / 1e6;
```
This ensures correct scaling.

---

## **4. Incorrect FeeVault Ownership Allows Unauthorized Withdrawals**

### **Severity:** High

### **Description**
The `feeVault` is initialized with `msg.sender` as the owner, allowing the deployer to withdraw all collected fees.

#### **Vulnerable Code**
```solidity
feeVault.initialize(msg.sender, _paymentToken);
```

### **Impact**
- **Unauthorized Withdrawals:** The deployer can drain the `feeVault`.
- **Loss of Platform Funds:** Fees meant for platform operations can be stolen.

### **Fix**
Set the `ShardsNFTMarketplace` contract as the owner:
```solidity
feeVault.initialize(address(this), _paymentToken);
```
This ensures only the contract can manage the `feeVault`.

---

## **5. Incorrect Implementation of `depositFees` Function Leads to Failed Deposits**

### **Severity:** High

### **Description**
The `depositFees` function incorrectly calls `feeVault.deposit`, which pulls tokens from `msg.sender` instead of the contract.

#### **Vulnerable Code**
```solidity
function depositFees(bool stake) external {
  feeVault.deposit(feesInBalance, stake);
  feesInBalance = 0;
}
```
Since `feeVault.deposit` calls `transferFrom(msg.sender, address(this), amount)`, it fails when executed by a user.

### **Impact**
- **Functional Failure:** Fees are not deposited into the `feeVault`.
- **User Confusion:** Users may experience failed transactions.

### **Fix**
Modify `depositFees` to transfer tokens from the contract:
```solidity
function depositFees(bool stake) external {
  paymentToken.transfer(address(feeVault), feesInBalance);
  feeVault.deposit(feesInBalance, stake);
  feesInBalance = 0;
}
```
This ensures the correct transfer of funds.

---

## **6. Potential Manipulation of Oracle Rate Affects Payments**

### **Severity:** Medium

### **Description**
The contract allows an oracle to update the `rate` without any constraints, making it vulnerable to manipulation.

#### **Vulnerable Code**
```solidity
function setRate(uint256 newRate) external {
  if (msg.sender != oracle) revert NotAllowed();
  if (newRate == 0 || rate == newRate) revert BadRate();
  rate = newRate;
}
```

### **Impact**
- **Financial Loss:** Sellers or buyers may be underpaid or overpaid.
- **Market Manipulation:** Attackers can exploit rate changes.

### **Fix**
- **Rate Limits:** Introduce upper and lower bounds.
- **Time Delays:** Delay rate changes to prevent sudden manipulation.
- **Multi-Signature Oracle:** Require multiple approvals for rate updates.

---

## **7. Precision Loss in Payment Calculations**

### **Severity:** Medium

### **Description**
The `_closeOffer` function uses inconsistent units, leading to precision loss in payments.

#### **Vulnerable Code**
```solidity
payment += purchase.shards.mulWadUp(purchase.rate);
```
If `purchase.rate` is not correctly scaled, sellers may receive incorrect payments.

### **Impact**
- **Financial Discrepancies:** Sellers may receive incorrect amounts.
- **Platform Trust Issues:** Users may lose confidence in the marketplace.

### **Fix**
Ensure consistent units in all calculations:
- Verify that all token amounts and rates are scaled correctly.
- Use well-tested libraries for fixed-point arithmetic.

---

## **Conclusion**
The `ShardsNFTMarketplace` contract contains several critical vulnerabilities that could lead to financial losses, contract depletion, and market manipulation. The most severe issues include:
- **Incorrect time validation in `cancel` function** (prevents buyers from canceling).
- **Rate manipulation** (allows attackers to exploit price discrepancies).
- **Seller overpayment due to unit mismatch** (can drain contract funds).
- **Unauthorized withdrawals from `feeVault`** (deployer can steal fees).

### **Recommended Actions**
1. **Fix time validation in `cancel` function** to allow proper cancellations.
2. **Store `rate` at offer creation** to prevent manipulation.
3. **Correct unit mismatches in payment calculations** to prevent overpayments.
4. **Ensure `feeVault` ownership is correctly assigned** to prevent unauthorized withdrawals.
5. **Fix `depositFees` function** to correctly transfer funds.
6. **Implement safeguards on oracle rate updates** to prevent manipulation.
7. **Ensure consistent unit scaling in all calculations** to prevent precision loss.

By implementing these fixes, the security and integrity of the `ShardsNFTMarketplace` can be significantly improved.