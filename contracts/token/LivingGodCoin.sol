// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @dev
/// Built on OpenZeppelin's audited ERC20 implementation.
/// The total supply is permanently capped at 15,000,000 LGC.
/// All tokens are minted once during deployment.
/// No additional minting functionality exists.


contract LivingGodCoin is ERC20, ERC20Burnable, Ownable {
    
     string public constant VERSION = "1.0.0";

    uint256 public immutable deployedAt;

   uint256 public constant MAX_SUPPLY = 15_000_000 * 10 ** 18;

constructor()
    ERC20("Living God Coin", "LGC")
    Ownable(msg.sender)
   
{
    _mint(msg.sender, MAX_SUPPLY);
    deployedAt = block.timestamp;
}
}