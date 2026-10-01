// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

contract GovernanceTarget {
    uint256 public value;

    event ValueChanged(
        uint256 oldValue,
        uint256 newValue
    );

    function setValue(
        uint256 newValue
    ) external {
        uint256 oldValue = value;

        value = newValue;

        emit ValueChanged(
            oldValue,
            newValue
        );
    }
}