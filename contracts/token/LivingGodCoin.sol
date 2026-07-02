// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Living God Coin
/// @author Living God Ecosystem
/// @notice Fixed-supply ERC-20 token powering the Living God Ecosystem.
/// @dev Built using audited OpenZeppelin contracts.
/// @notice Maximum supply of Living God Coin (15 million LGC)
/// @notice Deploys the Living God Coin contract and mints the fixed supply to the deployer.


contract LivingGodCoin is ERC20, ERC20Burnable, Ownable {

   uint256 public constant MAX_SUPPLY = 15_000_000 * 10 ** 18;

constructor()
    ERC20("Living God Coin", "LGC")
    Ownable(msg.sender)
{
    _mint(msg.sender, MAX_SUPPLY);
}
}