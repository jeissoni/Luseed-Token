// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {LuseedToken} from "../src/LuseedToken.sol";

/// @notice Pruebas unitarias básicas para LuseedToken (autorización + votos).
contract LuseedTokenTest is Test {
    LuseedToken public token;

    uint256 public ownerPk;
    address public owner;
    address public alice;
    address public bob;

    function setUp() public {
        ownerPk = 0xA11CE;
        owner = vm.addr(ownerPk);
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        vm.prank(owner);
        token = new LuseedToken(owner);
    }

    /// @notice El supply inicial se mintea al owner.
    function test_InitialSupplyMintedToOwner() public view {
        assertEq(token.totalSupply(), token.INITIAL_SUPPLY());
        assertEq(token.balanceOf(owner), token.INITIAL_SUPPLY());
    }

    /// @notice El owner se autoriza automáticamente en el constructor.
    function test_OwnerIsAuthorizedByDefault() public view {
        assertTrue(token.isAuthorized(owner));
    }

    /// @notice Solo el owner puede autorizar/desautorizar cuentas.
    function test_SetAuthorized_OnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        token.setAuthorized(alice, true);

        vm.prank(owner);
        token.setAuthorized(alice, true);
        assertTrue(token.isAuthorized(alice));
    }

    /// @notice Verifica que setAuthorized emite el evento AuthorizationUpdated.
    function test_SetAuthorized_EmitsAuthorizationUpdated() public {
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit LuseedToken.AuthorizationUpdated(alice, true);
        token.setAuthorized(alice, true);
    }

    /// @notice Transferir a un destino no autorizado revierte.
    function test_Transfer_RevertsIfRecipientNotAuthorized() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(LuseedToken.UnauthorizedAddress.selector, alice));
        // forge-lint: disable-next-line(erc20-unchecked-transfer)
        token.transfer(alice, 1 ether);
    }

    /// @notice Transferir desde un origen no autorizado revierte (aunque el destino esté autorizado).
    function test_Transfer_RevertsIfSenderNotAuthorized() public {
        // Autorizar a alice para poder recibir tokens inicialmente.
        vm.startPrank(owner);
        token.setAuthorized(alice, true);
        assertTrue(token.transfer(alice, 10 ether));
        // Quitar autorización a alice, pero mantiene saldo.
        token.setAuthorized(alice, false);
        // El owner está autorizado; alice no.
        vm.stopPrank();

        vm.prank(owner);
        token.setAuthorized(bob, true);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(LuseedToken.UnauthorizedAddress.selector, alice));
        // forge-lint: disable-next-line(erc20-unchecked-transfer)
        token.transfer(bob, 1 ether);
    }

    /// @notice Transferir entre cuentas autorizadas funciona.
    function test_Transfer_SucceedsBetweenAuthorizedAccounts() public {
        vm.startPrank(owner);
        token.setAuthorized(alice, true);
        assertTrue(token.transfer(alice, 5 ether));
        vm.stopPrank();

        assertEq(token.balanceOf(alice), 5 ether);
    }

    /// @notice clock() y CLOCK_MODE() reportan modo timestamp.
    function test_ClockAndMode() public view {
        assertEq(token.clock(), uint48(block.timestamp));
        assertEq(token.CLOCK_MODE(), "mode=timestamp");
    }

    /// @notice Sin delegación, getVotes() es 0. Con self-delegate, el poder de voto coincide con el balance.
    function test_Votes_SelfDelegateTracksBalance() public {
        // Sin delegación
        assertEq(token.getVotes(owner), 0);

        vm.prank(owner);
        token.delegate(owner);

        assertEq(token.getVotes(owner), token.balanceOf(owner));
    }

    /// @notice Las transferencias ajustan los votos del delegado (si hay delegación).
    function test_Votes_TransferUpdatesDelegatedVotes() public {
        vm.startPrank(owner);
        token.setAuthorized(alice, true);
        token.delegate(owner); // owner se delega a sí mismo

        uint256 ownerVotesBefore = token.getVotes(owner);
        assertTrue(token.transfer(alice, 10 ether));
        vm.stopPrank();

        // Owner tenía self-delegate, por lo tanto sus votos bajan con su balance.
        assertEq(token.getVotes(owner), ownerVotesBefore - 10 ether);
        // Alice no ha delegado, por lo tanto sus votos siguen siendo 0 aunque tenga balance.
        assertEq(token.getVotes(alice), 0);

        vm.prank(alice);
        token.delegate(alice);
        assertEq(token.getVotes(alice), token.balanceOf(alice));
    }

    /// @notice nonces() arranca en 0 y aumenta con permit().
    function test_Nonces_StartsAtZero() public view {
        assertEq(token.nonces(owner), 0);
    }

    /// @notice Ejecuta permit (EIP-2612), setea allowance e incrementa el nonce.
    function test_Permit_SetsAllowanceAndIncrementsNonce() public {
        address spender = alice;
        uint256 value = 123 ether;
        uint256 deadline = block.timestamp + 1 days;

        uint256 nonceBefore = token.nonces(owner);

        bytes32 permitTypehash =
            keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

        bytes32 structHash = keccak256(abi.encode(permitTypehash, owner, spender, value, nonceBefore, deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPk, digest);

        token.permit(owner, spender, value, deadline, v, r, s);

        assertEq(token.allowance(owner, spender), value);
        assertEq(token.nonces(owner), nonceBefore + 1);
    }

    /// @notice Aunque haya allowance (por permit), transferFrom sigue bloqueado si el destino no está autorizado.
    function test_Permit_DoesNotBypassAuthorizationOnTransferFrom() public {
        // Owner autoriza a spender para recibir (no es estrictamente necesario para permit, sí para mover tokens si recibe).
        vm.prank(owner);
        token.setAuthorized(alice, true);

        // Bob NO está autorizado.
        uint256 deadline = block.timestamp + 1 days;
        uint256 value = 1 ether;
        uint256 nonce = token.nonces(owner);

        bytes32 permitTypehash =
            keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
        bytes32 structHash = keccak256(abi.encode(permitTypehash, owner, alice, value, nonce, deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPk, digest);

        token.permit(owner, alice, value, deadline, v, r, s);
        assertEq(token.allowance(owner, alice), value);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(LuseedToken.UnauthorizedAddress.selector, bob));
        // forge-lint: disable-next-line(erc20-unchecked-transfer)
        token.transferFrom(owner, bob, value);
    }

    /// @notice getPastVotes() usa el timepoint del reloj (timestamp) y refleja snapshots en el pasado.
    function test_GetPastVotes_TimestampSnapshots() public {
        vm.startPrank(owner);
        token.setAuthorized(alice, true);
        token.delegate(owner);
        vm.stopPrank();

        // Snapshot justo después de delegar
        uint256 t0 = uint256(token.clock());

        // Mover el reloj para que haya checkpoints en diferentes timepoints
        vm.warp(block.timestamp + 10);

        uint256 t1 = uint256(token.clock());
        assertGt(t1, t0);

        // Transferencia en t1 (crea checkpoint)
        vm.prank(owner);
        assertTrue(token.transfer(alice, 25 ether));

        // Avanzar el reloj para poder consultar timepoints anteriores (require timepoint < clock())
        vm.warp(block.timestamp + 1);

        // En t0 el owner aún tenía todo el supply y self-delegate.
        assertEq(token.getPastVotes(owner, t0), token.INITIAL_SUPPLY());
        // En t1 ya refleja el estado post-transfer.
        assertEq(token.getPastVotes(owner, t1), token.INITIAL_SUPPLY() - 25 ether);
    }
}

