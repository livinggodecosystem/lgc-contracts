# Living God Coin (LGC) Smart Contracts

Production-ready smart contracts powering the Living God Ecosystem.

---

## Overview

Living God Coin (LGC) is the native digital currency of the Living God Ecosystem. These smart contracts provide the secure and transparent foundation for token issuance, treasury management, governance, investment products, and future ecosystem expansion.

The project is built with security, transparency, scalability, and long-term sustainability as its core principles.

---

## Current Contracts

### LivingGodCoin.sol

ERC-20 token contract responsible for:

* Fixed supply issuance
* Secure transfers
* Token burning
* OpenZeppelin standards

---

### LGCTreasury.sol

Treasury management contract responsible for:

* Ecosystem allocation
* Community allocation
* Liquidity allocation
* Development allocation
* Strategic reserve allocation
* Founding team allocation

Features include:

* Allocation tracking
* Dashboard statistics
* Emergency pause
* ERC20 recovery
* ETH recovery
* Reentrancy protection
* Custom errors
* SafeERC20 integration

---

## Treasury Allocation

| Category          |    Allocation |
| ----------------- | ------------: |
| Ecosystem         | 4,500,000 LGC |
| Community         | 3,000,000 LGC |
| Liquidity         | 2,250,000 LGC |
| Development       | 2,250,000 LGC |
| Strategic Reserve | 1,500,000 LGC |
| Founding Team     | 1,500,000 LGC |

**Total Treasury Allocation:** **15,000,000 LGC**

---

## Security

The contracts are built using OpenZeppelin libraries and include:

* Ownable access control
* ReentrancyGuard
* Pausable emergency controls
* SafeERC20 token transfers
* Custom Solidity errors
* Comprehensive unit tests

---

## Testing

The project currently includes extensive Hardhat test coverage.

Current Status:

* 90 Passing Tests
* 0 Failing Tests

Run the tests:

```bash
npx hardhat test
```

Compile contracts:

```bash
npx hardhat compile
```

---

## Project Structure

```
contracts/
    governance/
    interfaces/
    investment/
    libraries/
    mocks/
    token/
    treasury/

scripts/

test/

ignition/
```

---

## Roadmap

* Living God Coin (Completed)
* Treasury (Completed)
* Staking
* Vesting
* Governance
* DAO
* Investment Contracts
* Launchpad
* Ecosystem Applications

---

## License

MIT License

---

## Living God Ecosystem

The Living God Ecosystem aims to build a secure blockchain-powered financial infrastructure that supports digital assets, decentralized finance, investment solutions, governance, and global financial inclusion through the Living God Coin.
