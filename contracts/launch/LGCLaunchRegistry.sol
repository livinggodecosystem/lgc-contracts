// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title LGC Launch Registry
/// @notice Stores the official launch date of the Living God Ecosystem.
/// @dev This contract becomes the single source of truth for ecosystem launch timing.

contract LGCLaunchRegistry is Ownable {

    string public constant VERSION = "1.0.0";

    uint256 public immutable deployedAt;

    uint256 public officialLaunchTime;

    bool public launchActivated;

    error LaunchAlreadyActivated();

    error LaunchNotActivated();

    event LaunchActivated(
        uint256 launchTime
    );

    constructor(
        address initialOwner
    )
        Ownable(initialOwner)
    {
        deployedAt = block.timestamp;
    }

    /// @notice Activates the official ecosystem launch.
    /// @dev Can only be executed once by the owner.
    function activateLaunch()
        external
        onlyOwner
    {
        if (launchActivated)
            revert LaunchAlreadyActivated();

        officialLaunchTime = block.timestamp;

        launchActivated = true;

        emit LaunchActivated(
            officialLaunchTime
        );
    }

    /// @notice Returns the official ecosystem launch time.
    function ecosystemLaunchTime()
        external
        view
        returns (uint256)
    {
        if (!launchActivated)
            revert LaunchNotActivated();

        return officialLaunchTime;
    }

    /// @notice Returns whether launch has been activated.
    function isLaunchActive()
        external
        view
        returns (bool)
    {
        return launchActivated;
    }

    /// @notice Returns elapsed seconds since launch.
    function secondsSinceLaunch()
        public
        view
        returns (uint256)
    {
        if (!launchActivated)
            revert LaunchNotActivated();

        return
            block.timestamp -
            officialLaunchTime;
    }

    /// @notice Returns elapsed days since launch.
    function daysSinceLaunch()
        external
        view
        returns (uint256)
    {
        return
            secondsSinceLaunch() /
            1 days;
    }

    /// @notice Returns elapsed months since launch.
    /// @dev Uses a simplified 30-day month.
    function monthsSinceLaunch()
        external
        view
        returns (uint256)
    {
        return
            secondsSinceLaunch() /
            30 days;
    }

    /// @notice Returns elapsed years since launch.
    /// @dev Uses a simplified 365-day year.
    function yearsSinceLaunch()
        external
        view
        returns (uint256)
    {
        return
            secondsSinceLaunch() /
            365 days;
    }
}