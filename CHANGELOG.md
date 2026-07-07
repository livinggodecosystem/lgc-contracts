# Changelog

All notable changes to this project will be documented in this file.

This project follows Semantic Versioning (SemVer).

---

# [1.0.0] - 2026-07-07

## Added

### LivingGodCoin

* ERC20 token implementation
* Fixed maximum supply
* Token burning functionality
* OpenZeppelin ERC20 integration

### LGCTreasury

* Treasury allocation management
* Six allocation categories:

  * Ecosystem
  * Community
  * Liquidity
  * Development
  * Strategic Reserve
  * Founding Team

### Security

* Ownable access control
* ReentrancyGuard protection
* Emergency pause functionality
* SafeERC20 integration
* Custom Solidity errors
* ETH recovery
* ERC20 recovery

### Dashboard

* Treasury statistics
* Allocation tracking
* Remaining allocation queries
* Distribution progress
* Treasury dashboard API

### Testing

* Comprehensive Hardhat unit tests
* 90 passing tests
* Zero failing tests

### Documentation

* Professional README
* Security policy
* MIT License
* NatSpec documentation

---

## Changed

* Optimized treasury distribution logic
* Replaced string comparisons with AllocationType enum
* Reduced duplicated calculations
* Improved gas efficiency
* Improved contract readability

---

## Fixed

* Treasury balance validation
* Distribution edge cases
* ETH recovery tests
* Event consistency
* Allocation tracking consistency
