# Synthesized Audit Report

## Vulnerability: Denial of Service via Direct Token Transfer

### Description

The `UnstoppableVault` contract is vulnerable to a **Denial of Service (DoS) attack** due to improper handling of direct token transfers. The contract enforces an invariant in its `flashLoan` function that assumes the total number of shares (`totalSupply`) converted to assets must equal the vault's asset balance (`totalAssets()`). However, this assumption is broken if an attacker transfers tokens directly to the vault without minting new shares.

The critical check in the `flashLoan` function:

```solidity
uint256 balanceBefore = totalAssets();
if (convertToShares(totalSupply) != balanceBefore) revert InvalidBalance();
```

This check ensures that the vault's internal accounting remains consistent before proceeding with a flash loan. However, if an attacker transfers tokens directly to the vault, `totalAssets()` increases while `totalSupply` remains unchanged. This discrepancy causes `convertToShares(totalSupply)` to no longer equal `totalAssets()`, triggering the `InvalidBalance` error and reverting the transaction.

### Impact

- **Denial of Service:** The flash loan functionality is permanently disabled as long as the balance discrepancy exists.
- **Loss of Functionality:** Users and protocols relying on flash loans are unable to execute them.
- **Vault Pausing & Ownership Transfer:** The `UnstoppableMonitor` may detect the failure and pause the vault, transferring ownership to its own owner, leading to governance issues.

### Exploit Scenario

1. **Attacker Transfers Tokens Directly to Vault:**
   - The attacker sends tokens directly to the `UnstoppableVault` contract using `ERC20.transfer(address(vault), amount);`.
   - This increases `totalAssets()` but does not mint new shares, leaving `totalSupply` unchanged.

2. **Flash Loan Attempt Fails:**
   - The next time a user or protocol calls `flashLoan`, the consistency check fails:
     - `convertToShares(totalSupply)` remains unchanged.
     - `totalAssets()` reflects the increased balance.
     - The function reverts with `InvalidBalance`.

3. **Vault Pausing & Ownership Transfer:**
   - The `UnstoppableMonitor` detects the failure and:
     - Emits `FlashLoanStatus(false)`.
     - Calls `vault.setPause(true)`, pausing the vault.
     - Transfers ownership to its own owner.

### Severity

**High** – The attack is trivial to execute and permanently disables a critical function of the vault.

### Fix

1. **Remove or Adjust the Faulty Check:**
   - Modify the `flashLoan` function to account for unexpected token transfers:
   ```diff
   - if (convertToShares(totalSupply) != balanceBefore) revert InvalidBalance();
   ```
   - Instead, allow for a tolerance or adjust `convertToShares(totalSupply)` to reflect the actual asset balance.

2. **Prevent Direct Token Transfers:**
   - Implement a mechanism to reject direct token transfers or automatically adjust `totalSupply` when extra tokens are detected.

3. **Introduce a Rebalancing Mechanism:**
   - Provide a function to synchronize the vault’s asset and share balances in case of discrepancies.

4. **Enhance Monitoring Logic:**
   - Modify the `UnstoppableMonitor` to avoid pausing the vault and transferring ownership based on a single failed flash loan.

### References

- **ERC4626 Specification:** [https://eips.ethereum.org/EIPS/eip-4626](https://eips.ethereum.org/EIPS/eip-4626)
- **Handling Unexpected Token Transfers:** [https://forum.openzeppelin.com/t/how-to-handle-unexpected-tokens-sent-to-your-contract/846](https://forum.openzeppelin.com/t/how-to-handle-unexpected-tokens-sent-to-your-contract/846)

---

By addressing this issue, the `UnstoppableVault` can prevent malicious actors from disrupting its services and ensure the continued availability of its flash loan functionality.