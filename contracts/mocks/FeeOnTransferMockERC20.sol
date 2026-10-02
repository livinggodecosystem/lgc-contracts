// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title FeeOnTransferMockERC20
 * @notice Security-test token that deducts a fee from every transfer.
 *
 * @dev
 * This contract exists ONLY for adversarial testing.
 *
 * With a 10% fee, transferring 1,000 tokens causes:
 *
 * - sender balance to decrease by 1,000
 * - recipient to receive 900
 * - 100 tokens to be burned
 *
 * This lets us verify that LGCStartupFunding never records
 * more protected capital than it actually receives.
 */
contract FeeOnTransferMockERC20 is ERC20 {
    uint256 public constant FEE_BPS = 1_000;
    uint256 public constant BPS_DENOMINATOR = 10_000;

    constructor()
        ERC20(
            "Fee On Transfer Mock Token",
            "FEE"
        )
    {
        _mint(
            msg.sender,
            1_000_000 * 10 ** 18
        );
    }

    function _update(
        address from,
        address to,
        uint256 value
    ) internal override {
        /*
         * Do not charge a fee during minting or burning.
         */
        if (
            from == address(0) ||
            to == address(0)
        ) {
            super._update(
                from,
                to,
                value
            );

            return;
        }

        uint256 fee =
            (value * FEE_BPS) /
            BPS_DENOMINATOR;

        uint256 amountAfterFee =
            value - fee;

        /*
         * Transfer the net amount to the recipient.
         */
        super._update(
            from,
            to,
            amountAfterFee
        );

        /*
         * Burn the fee from the sender.
         *
         * The sender therefore loses the complete
         * requested transfer amount.
         */
        if (fee != 0) {
            super._update(
                from,
                address(0),
                fee
            );
        }
    }
}