# **Synthesized Security Audit Report**

## **Vulnerability: Arbitrary External Call Leading to Unauthorized Token Approval**

### **Severity: High**

### **Description**

The `TrusterLenderPool` contract contains a critical vulnerability that allows an attacker to gain unauthorized control over all tokens held by the pool. The issue arises from the lack of access control and validation around the arbitrary external call made within the `flashLoan` function:

```solidity
target.functionCall(data);
```

This line allows any caller to execute an arbitrary function on any target contract, passing any data. Specifically, an attacker can exploit this to make the pool contract approve an unlimited token allowance to the attacker's address, enabling them to drain all tokens from the pool.

### **Exploit Scenario**

1. **Attacker Preparation**:
   - The attacker prepares the payload to exploit the arbitrary external call.
   - They set the `target` to the address of the `DamnValuableToken` contract (the ERC20 token).
   - `data` is set to the encoded function call for `approve(attacker, UINT256_MAX)`.

2. **Flash Loan Execution**:
   - The attacker calls the `flashLoan` function with the following parameters:
     - `amount = 0` (no actual loan needed).
     - `borrower = attacker` (their own address).
     - `target = address(token)` (address of the token contract).
     - `data = abi.encodeWithSignature("approve(address,uint256)", attacker, UINT256_MAX)`.

3. **Unauthorized Approval**:
   - Inside the `flashLoan` function, the pool contract executes `token.approve(attacker, UINT256_MAX)`, effectively allowing the attacker to spend an unlimited amount of tokens on behalf of the pool.

4. **Token Drain**:
   - After the `flashLoan` call completes, the attacker uses `token.transferFrom(poolAddress, attacker, tokenBalance)` to transfer all tokens from the pool to their own address.

### **Impact**

- **Total Loss of Funds**: The attacker can drain the entire balance of tokens from the pool contract.
- **Loss of User Trust**: Such an exploit undermines confidence in the platform's security.

### **Root Cause**

- **Lack of Access Control**: The `flashLoan` function does not restrict who can call it or what `target` and `data` can be passed, allowing arbitrary function calls on any contract.
- **Improper Validation**: There's no validation to ensure that the `target` address and `data` do not lead to unauthorized actions, such as changing approvals or transferring tokens.

### **Recommendation**

#### **1. Restrict External Calls**
- Remove or heavily restrict the ability to make arbitrary external calls within the `flashLoan` function.
- If external calls are necessary, implement a whitelist of allowed functions or contracts that can be called.

#### **2. Implement Access Control**
- Introduce access control checks to ensure that only authorized functions and contracts can be called during the flash loan.
- Validate input parameters to prevent malicious data from being used in function calls.

#### **3. Use Secure Flash Loan Patterns**
- Follow established patterns for flash loan functions where the borrower is required to implement a specific interface or callback function.
- Avoid passing arbitrary `target` and `data` parameters that can lead to security vulnerabilities.

### **Code Fix**

Modify the `flashLoan` function to remove or restrict the arbitrary external call:

```solidity
function flashLoan(uint256 amount, address borrower)
  external
  nonReentrant
  returns (bool)
{
  uint256 balanceBefore = token.balanceOf(address(this));

  token.transfer(borrower, amount);

  // Require borrower to implement IERC3156FlashBorrower interface and call onFlashLoan
  require(
      IERC3156FlashBorrower(borrower).onFlashLoan(msg.sender, address(token), amount, 0, "")
      == keccak256("ERC3156FlashBorrower.onFlashLoan"),
      "Callback failed"
  );

  require(token.balanceOf(address(this)) >= balanceBefore, "Flash loan not repaid");

  return true;
}
```

- **Key Fixes:**
  - Removed arbitrary external call (`target.functionCall(data);`).
  - Enforced a secure callback mechanism using the ERC-3156 flash loan standard.
  - Ensured that the borrower's callback function is validated before proceeding.

### **Conclusion**

The current implementation of the `flashLoan` function poses a severe security risk due to the unchecked arbitrary external call. Immediate action is required to fix this vulnerability to prevent potential exploitation and loss of funds. By restricting external calls, implementing access control, and following secure flash loan patterns, this issue can be effectively mitigated.