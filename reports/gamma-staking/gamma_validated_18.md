# Vulnerability: Potential Arithmetic Overflow in Reward Calculations

## Description

In the `Lock` contract, there is a risk of arithmetic overflow in the reward calculation functions `_earned` and `_notifyReward`. These functions involve multiplying large `uint256` values, which can exceed the maximum value representable by a `uint256`, causing overflows, reverts, and potentially locking users' funds.

### Details:

1. **Function `_earned`**:
   ```solidity
   function _earned(
       address _user,
       address _rewardToken
   ) internal view returns (uint256 earnings) {
       Reward memory rewardInfo = rewardData[_rewardToken];
       Balances memory balance = balances[_user];
       earnings = rewardInfo.cumulatedReward * balance.lockedWithMultiplier - rewardDebt[_user][_rewardToken];
   }
   ```
   - `rewardInfo.cumulatedReward` is a `uint256` that increases over time and can become very large.
   - `balance.lockedWithMultiplier` is also a `uint256`, potentially large if users stake significant amounts with high multipliers.
   - The multiplication `rewardInfo.cumulatedReward * balance.lockedWithMultiplier` can overflow without proper checks.

2. **Function `_notifyReward`**:
   ```solidity
   function _notifyReward(address _rewardToken, uint256 reward) internal {
       if (lockedSupplyWithMultiplier == 0) return;
       Reward storage r = rewardData[_rewardToken];
       uint256 newReward = reward * 1e36 / lockedSupplyWithMultiplier;
       r.cumulatedReward += newReward;
       r.lastUpdateTime = block.timestamp;
       r.balance += reward;
   }
   ```
   - `reward` could be a large value, and multiplying it by `1e36` can easily cause an overflow.
   - The result is used to update `r.cumulatedReward`, contributing to the overflow risk in `_earned`.

## Impact

- **Reverts and Loss of Functionality**: If an overflow occurs, functions like `_earned` and `_notifyReward` will revert due to arithmetic overflows. This can prevent users from interacting with the contract, claiming rewards, or withdrawing funds.
- **Potential Loss of Funds**: Users may be unable to withdraw their stakes or rewards, effectively locking their funds in the contract.

## Recommendation

1. **Use Safe Math Operations**: Utilize OpenZeppelin's `SafeMath` library or Solidity's built-in overflow checks to handle large number multiplications safely.
   - Explicitly check for overflows before performing multiplications.
   - Use functions like `mulDiv` if precision handling is required.

2. **Redesign Reward Calculations**:
   - **Cap `cumulatedReward`**: Implement a mechanism to cap or periodically reset `cumulatedReward` to prevent it from growing indefinitely.
   - **Scale Down Factors**: Consider scaling down factors to reduce the magnitude of numbers involved in multiplications.
   - **Use Fixed-Point Math Libraries**: Employ fixed-point math libraries that can handle large numbers and fractions with precision without overflowing.

3. **Implement Tests for Large Values**:
   - Add unit tests and property-based tests to simulate scenarios with large stakes and accumulated rewards to ensure that overflows do not occur.

## References

- [Solidity Documentation - Arithmetic Operations](https://docs.soliditylang.org/en/v0.8.23/control-structures.html#arithmetic-operators)
- [OpenZeppelin SafeMath Library](https://docs.openzeppelin.com/contracts/4.x/api/utils#SafeMath)
- [Overflow and Underflow Patterns](https://consensys.github.io/smart-contract-best-practices/attacks/overflow_and_underflow/)