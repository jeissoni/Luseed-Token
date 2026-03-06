// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.5.0
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

contract LuseedToken is ERC20, ERC20Permit, ERC20Votes, Ownable {
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10 ** 18; // 1 millón de tokens, 18 decimales

    /// @notice Direcciones autorizadas para enviar y recibir tokens
    mapping(address account => bool) public isAuthorized;

    event AuthorizationUpdated(address indexed account, bool authorized);

    error UnauthorizedAddress(address account);

    constructor(address initialOwner)
        ERC20("LuseedToken", "LST")
        ERC20Permit("LuseedToken")
        Ownable(initialOwner)
    {
        // El owner inicial puede recibir y mover tokens
        isAuthorized[initialOwner] = true;
        _mint(initialOwner, INITIAL_SUPPLY);
    }

    function clock() public view override returns (uint48) {
        return uint48(block.timestamp);
    }

    // solhint-disable-next-line func-name-mixedcase
    function CLOCK_MODE() public pure override returns (string memory) {
        return "mode=timestamp";
    }

    // The following functions are overrides required by Solidity.

    /// @dev Restringe transferencias para que solo ocurran entre cuentas autorizadas.
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        if (from != address(0) && !isAuthorized[from]) {
            revert UnauthorizedAddress(from);
        }
        if (to != address(0) && !isAuthorized[to]) {
            revert UnauthorizedAddress(to);
        }

        super._update(from, to, value);
    }

    /// @notice Marca o desmarca una cuenta como autorizada para enviar y recibir tokens.
    function setAuthorized(address account, bool authorized) external onlyOwner {
        isAuthorized[account] = authorized;
        emit AuthorizationUpdated(account, authorized);
    }

    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}
