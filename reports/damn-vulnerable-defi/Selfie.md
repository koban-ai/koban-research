# Synthesized Security Audit Report

## **Vulnerability: Governance Manipulation via Flash Loans**

### **Description**

The `SimpleGovernance` contract allows users with more than half of the total voting power of the `DamnValuableVotes` token to queue and execute governance actions after a delay. However, an attacker can exploit the `SelfiePool` contract to temporarily acquire a large amount of `DamnValuableToken` (DVT) tokens through a flash loan, delegate the votes to themselves, and meet the voting power requirement to queue a malicious governance action. This action can then be executed after the delay, leading to a loss of funds from the `SelfiePool`.

### **Severity**: High

### **Impact**

An attacker can drain all the funds from the `SelfiePool` by:

1. **Taking out a flash loan** of DVT tokens from the `SelfiePool`.
2. **Delegating the borrowed DVT tokens** to themselves to gain temporary voting power.
3. **Queuing a malicious governance action** (e.g., calling `emergencyExit()` to transfer all tokens to the attacker's address).
4. **Waiting for the action delay** (2 days) and then executing the action.

This results in a **complete loss of the pool's funds**, making it a **high severity** issue.

### **Exploit Scenario**

1. **Flash Loan Acquisition**: The attacker takes out a flash loan of all available DVT tokens from the `SelfiePool`.

2. **Delegation of Votes**: The attacker delegates the voting power of the borrowed tokens to themselves by calling `token.delegate(attackerAddress)`.

3. **Queuing Malicious Action**: With more than half of the total voting power, the attacker queues a governance action targeting the `SelfiePool`'s `emergencyExit()` function, specifying their own address as the recipient.

   ```solidity
   bytes memory data = abi.encodeWithSignature("emergencyExit(address)", attackerAddress);
   governance.queueAction(address(selfiePool), 0, data);
   ```

4. **Repaying Flash Loan**: The attacker returns the borrowed DVT tokens to the `SelfiePool` to complete the flash loan.

5. **Waiting Period**: The attacker waits for the required action delay (2 days).

6. **Executing Malicious Action**: The attacker calls `governance.executeAction(actionId)` to execute the queued action, draining the `SelfiePool` funds to their address.

### **Vulnerable Code**

#### **SimpleGovernance.sol**

```solidity
function _hasEnoughVotes(address who) private view returns (bool) {
  uint256 balance = _votingToken.getVotes(who);
  uint256 halfTotalSupply = _votingToken.totalSupply() / 2;
  return balance > halfTotalSupply;
}
```

- Checks the current votes of the caller, which can be manipulated via flash loans.

#### **SelfiePool.sol**

```solidity
function flashLoan(IERC3156FlashBorrower _receiver, address _token, uint256 _amount, bytes calldata _data)
  external
  nonReentrant
  returns (bool)
{
  if (_token != address(token)) {
      revert UnsupportedCurrency();
  }

  token.transfer(address(_receiver), _amount);
  if (_receiver.onFlashLoan(msg.sender, _token, _amount, 0, _data) != CALLBACK_SUCCESS) {
      revert CallbackFailed();
  }

  if (!token.transferFrom(address(_receiver), address(this), _amount)) {
      revert RepayFailed();
  }

  return true;
}
```

- Allows flash loans of the voting token without restrictions.

#### **Malicious Governance Action Execution**

```solidity
function emergencyExit(address receiver) external onlyGovernance {
  uint256 amount = token.balanceOf(address(this));
  token.transfer(receiver, amount);

  emit EmergencyExit(receiver, amount);
}
```

- Transfers all tokens in the pool to the specified receiver when called by the governance contract.

### **Root Cause**

- **Immediate Voting Power Update**: The `DamnValuableVotes` token likely follows the ERC20Votes standard, where delegation updates voting power immediately.
- **Current Vote Check**: The `queueAction` function in `SimpleGovernance` checks the current voting power without any restriction on how long the tokens have been held.
- **No Re-verification at Execution**: The `executeAction` function does not verify the caller's voting power, allowing the action to be executed even if the attacker no longer holds any tokens.

---

## **Fix Recommendations**

### **1. Implement Snapshot-Based Voting**
- Use a snapshot mechanism to record users' voting power at the time tokens are delegated or at the start of each governance proposal.
- This prevents temporary balance changes from affecting governance decisions.

```solidity
// Use OpenZeppelin's ERC20Snapshot extension
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Snapshot.sol";
```

### **2. Exclude Flash Loaned Tokens**
- Adjust the voting power calculation to exclude tokens that are currently on loan or implement a lock-up period for tokens used in voting.

### **3. Add Flash Loan Restrictions**
- Limit the amount of tokens that can be borrowed in a flash loan or restrict flash loans during governance voting periods.

### **4. Separate Voting and Liquidity Tokens**
- Use a different token for governance that cannot be borrowed or traded, ensuring that only legitimate stakeholders can participate in governance.

### **5. Re-verify Voting Power at Execution**
- Check if the proposer still has sufficient voting power when executing the action.

### **6. Implement Minimum Holding Period**
- Require tokens to be held for a certain period before they contribute to voting power.

### **7. Increase Proposal Threshold**
- Set higher thresholds or additional requirements (e.g., proposal deposit) to make it harder to abuse governance mechanisms.

---

## **References**
- [Flash Loan Attacks on Governance Systems](https://consensys.github.io/smart-contract-best-practices/attacks/flash-loan-governance-attack/)
- [OpenZeppelin’s ERC20Snapshot Documentation](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20Snapshot)
- [Flash Loan Governance Attack](https://samczsun.com/compound-governance-attack/)

---

### **Conclusion**
The contracts are vulnerable to a flash loan attack that can manipulate governance decisions and lead to a complete loss of funds from the pool. Immediate action should be taken to secure the governance mechanism and protect users' assets.