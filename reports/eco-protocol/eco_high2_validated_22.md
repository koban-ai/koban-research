# Vulnerability: Inconsistent Inflation Multiplier Leading to Incorrect Token Amounts During Cross-Domain Transfers

## Summary

The ECO protocol employs an inflation multiplier (`linearInflationMultiplier`) to adjust token balances during transfers, minting, and burning to account for token rebasing. However, during cross-chain transfers between L1 and L2, if a rebase occurs (changing the inflation multiplier) between the initiation of a deposit on L1 and its finalization on L2 (or vice versa for withdrawals), the amount of tokens credited or debited can be incorrectly calculated. This inconsistency arises because the inflation multiplier used to adjust the token amounts may differ between L1 and L2 at the time of processing, leading to potential loss or gain of funds for users.

## Vulnerability Details

### Vulnerability Type

- **Incorrect Calculation of Token Amounts Due to State Changes**
- **Race Condition in Cross-Chain Communication**

### Impact

- **Severity**: High
- **Affected Components**: `L1ECOBridge`, `L2ECOBridge`, `L2ECO` contracts
- **Potential Consequences**:
  - Users may receive fewer tokens than expected on L2 after a deposit.
  - Users may lose tokens during withdrawal due to incorrect scaling.
  - Attackers could potentially exploit timing to gain additional tokens.

### Description

The ECO protocol uses an inflation multiplier (`linearInflationMultiplier`) to implement token rebasing. This multiplier affects how balances are calculated and stored. When users transfer tokens across chains (from L1 to L2 or vice versa), the amount of tokens is scaled using the inflation multiplier at the time of processing.

#### Issue During Deposits (L1 to L2):

1. **Deposit Initiation on L1**:
   - The user initiates a deposit of `_amount` tokens.
   - On L1, the `inflationMultiplier` is `A`.
   - The amount is adjusted: `_amount = _amount * inflationMultiplier` (scaled to "gons").
   - A message is sent to L2 with the adjusted `_amount`.

2. **Rebase Occurs on L1**:
   - Before the deposit is finalized on L2, a rebase occurs on L1, changing the `inflationMultiplier` to `B`.
   - The L1 bridge updates its `inflationMultiplier` but the L2 bridge has not yet received this update.

3. **Deposit Finalization on L2**:
   - When L2 processes the `finalizeDeposit`, it uses its current `inflationMultiplier`, which is still `A` (since it hasn't received the rebase message yet).
   - The `_amount` is divided by `inflationMultiplier` (`A`), resulting in the original amount intended.
   - **However**, if another rebase occurs on L2 (or if the L2 inflation multiplier is different due to message delays), the amount credited to the user may be incorrect.

#### Issue During Withdrawals (L2 to L1):

Similar issues can occur during withdrawals. If a rebase occurs between the initiation of a withdrawal on L2 and its finalization on L1, the scaling factors used on both sides may differ, leading to incorrect token amounts being released to the user on L1.

### Code Snippets

#### L1 Deposit Adjusts Amount Using Current Inflation Multiplier

```solidity
// L1ECOBridge.sol
function _initiateERC20Deposit(
    // ...
    uint256 _amount,
    // ...
) internal {
    // ...

    IECO(_l1Token).transferFrom(_from, address(this), _amount);
    // Adjust amount with L1 inflation multiplier
    _amount = _amount * inflationMultiplier;

    // Send message to L2 with adjusted amount
    bytes memory message = abi.encodeWithSelector(
        IL2ERC20Bridge.finalizeDeposit.selector,
        _l1Token,
        _l2Token,
        _from,
        _to,
        _amount,
        _data
    );

    // ...
}
```

#### L2 Finalizes Deposit Using Its Inflation Multiplier

```solidity
// L2ECOBridge.sol
function finalizeDeposit(
    // ...
    uint256 _amount,
    // ...
) external {
    // Adjust amount back using L2 inflation multiplier
    _amount = _amount / inflationMultiplier;
    L2ECO(_l2Token).mint(_to, _amount);
    emit DepositFinalized(_l1Token, _l2Token, _from, _to, _amount, _data);
}
```

### Potential Exploit Scenario

An attacker could potentially:

- Observe when a rebase is about to occur on L1.
- Initiate a deposit or withdrawal to exploit the timing window where the `inflationMultiplier` differs between L1 and L2.
- Gain an unintended amount of tokens due to inconsistent scaling.

### Root Cause

- Lack of synchronization between L1 and L2 `inflationMultiplier` used during token amount adjustments.
- No mechanisms to ensure that the `inflationMultiplier` remains consistent across chains during cross-domain transfers.
- The possibility of state changes (rebases) occurring between the initiation and finalization of cross-chain operations.

## Remediation

To fix this issue, the protocol should ensure consistent use of the `inflationMultiplier` during cross-chain transfers. Possible solutions include:

1. **Include Inflation Multiplier in Messages**:

   - When initiating a deposit or withdrawal, include the `inflationMultiplier` used in the message to the other chain.
   - On finalization, verify that the `inflationMultiplier` matches the expected value.
   - If the multipliers do not match, the transaction should revert or be processed differently to account for the difference.

2. **Process Pending Transfers Before Rebases**:

   - Implement a mechanism to process all pending deposits and withdrawals before applying a rebase.
   - This could involve pausing rebases during periods of high cross-chain activity.

3. **Atomic Updates with Inflation Multiplier**:

   - Design the cross-chain communication to include both the transfer and any `inflationMultiplier` updates atomically.
   - Ensure that any rebase operation includes synchronization of the `inflationMultiplier` before processing transfers.

4. **Timestamp or Block Number Validation**:

   - Include a timestamp or block number in the cross-chain messages.
   - Use this to validate that the `inflationMultiplier` used is still valid at the time of finalization.

5. **Enhance Documentation and Warnings**:

   - If technical limitations prevent a full fix, clearly document the potential risks.
   - Warn users about the potential for discrepancies during periods of rebasing.

## References

- **Cross-Chain Communication Security**: Understanding how message delays and state changes can impact cross-chain protocols.
- **Reentrancy and Race Conditions**: Best practices to prevent state inconsistencies in smart contracts.

## Conclusion

The current implementation does not account for possible changes in the `inflationMultiplier` between the initiation and finalization of cross-chain transfers, leading to potential incorrect token scaling and financial discrepancies. Addressing this issue is critical to ensure the integrity of token balances and trust in the ECO protocol.