// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockUSDC
/// @notice ERC-20 con 6 decimales que simula USDC en testnet.
///         El owner puede mintear tokens a cualquier dirección (faucet).
contract MockUSDC is ERC20, Ownable {
    constructor(address _owner) ERC20("USD Coin", "USDC") Ownable(_owner) {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
