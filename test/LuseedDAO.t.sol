// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {LuseedDAO} from "../src/LuseedDAO.sol";
import {LuseedToken} from "../src/LuseedToken.sol";
import {IGovernor} from "@openzeppelin/contracts/governance/IGovernor.sol";

contract GovernanceTarget {
    uint256 public value;
    bool public called;

    function setValue(uint256 newValue) external {
        value = newValue;
        called = true;
    }
}

contract LuseedDAOTest is Test {
    LuseedToken public token;
    LuseedDAO public dao;
    GovernanceTarget public target;

    uint256 public ownerPk;
    address public owner;
    address public alice;

    uint256 public constant PROPOSAL_THRESHOLD = 10 * 10 ** 18;
    uint256 public constant QUORUM_NUMERATOR = 4; // 4%
    uint256 public constant VOTING_DELAY = 1; // seconds
    uint256 public constant VOTING_PERIOD = 10; // seconds

    function setUp() public {
        ownerPk = 0xA11CE;
        owner = vm.addr(ownerPk);
        alice = makeAddr("alice");

        vm.prank(owner);
        token = new LuseedToken(owner);

        vm.prank(owner);
        dao = new LuseedDAO(
            token,
            VOTING_DELAY,
            VOTING_PERIOD,
            PROPOSAL_THRESHOLD,
            QUORUM_NUMERATOR
        );

        target = new GovernanceTarget();
    }

    function _buildProposalData(uint256 newValue)
        internal
        view
        returns (address[] memory targets, uint256[] memory values, bytes[] memory calldatas, string memory description)
    {
        targets = new address[](1);
        values = new uint256[](1);
        calldatas = new bytes[](1);

        targets[0] = address(target);
        values[0] = 0;
        calldatas[0] = abi.encodeWithSignature("setValue(uint256)", newValue);
        description = "Set value in GovernanceTarget";
    }

    function test_Config_FromConstructor() public view {
        assertEq(dao.votingDelay(), VOTING_DELAY);
        assertEq(dao.votingPeriod(), VOTING_PERIOD);
        assertEq(dao.proposalThreshold(), PROPOSAL_THRESHOLD);
        assertEq(dao.quorumNumerator(), QUORUM_NUMERATOR);
        assertEq(dao.quorumDenominator(), 100);
    }

    function test_Propose_RevertsBelowThreshold() public {
        // Sin delegar, owner tiene 0 votos, por lo que no llega al threshold.
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas, string memory description) =
            _buildProposalData(42);

        vm.prank(owner);
        vm.expectRevert();
        dao.propose(targets, values, calldatas, description);
    }

    function test_ProposalLifecycle_Succeeds() public {
        // Owner se auto-delega para cumplir threshold y poder votar.
        vm.prank(owner);
        token.delegate(owner);

        // Avanzar el reloj para que la delegación quede en el pasado respecto al snapshot de la propuesta.
        vm.warp(block.timestamp + 1);

        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas, string memory description) =
            _buildProposalData(42);

        // Crear propuesta
        vm.prank(owner);
        uint256 proposalId = dao.propose(targets, values, calldatas, description);

        assertEq(uint8(dao.state(proposalId)), uint8(IGovernor.ProposalState.Pending));

        // Avanzar hasta que empiece la votación
        vm.warp(block.timestamp + dao.votingDelay() + 1);
        assertEq(uint8(dao.state(proposalId)), uint8(IGovernor.ProposalState.Active));

        // Votar a favor
        vm.prank(owner);
        dao.castVote(proposalId, uint8(1)); // 1 = For (GovernorCountingSimple)

        // Avanzar hasta que termine la votación
        vm.warp(block.timestamp + dao.votingPeriod() + 1);

        assertEq(uint8(dao.state(proposalId)), uint8(IGovernor.ProposalState.Succeeded));

        // Ejecutar la propuesta
        bytes32 descriptionHash = keccak256(bytes(description));
        dao.execute(targets, values, calldatas, descriptionHash);

        assertEq(uint8(dao.state(proposalId)), uint8(IGovernor.ProposalState.Executed));
        assertTrue(target.called());
        assertEq(target.value(), 42);
    }

    function test_ProposalDefeatedIfQuorumNotReached() public {
        // Reducir el poder de voto del owner por debajo del quorum, pero por encima del threshold.
        vm.startPrank(owner);
        token.setAuthorized(alice, true);
        assertTrue(token.transfer(alice, 990_000 * 10 ** 18)); // owner se queda con 10k LST
        token.delegate(owner);
        vm.stopPrank();

        // Avanzar el reloj para que la delegación quede en el pasado antes del snapshot de la propuesta.
        vm.warp(block.timestamp + 1);

        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas, string memory description) =
            _buildProposalData(1);

        vm.prank(owner);
        uint256 proposalId = dao.propose(targets, values, calldatas, description);

        // Avanzar al inicio de la votación
        vm.warp(block.timestamp + dao.votingDelay() + 1);

        // Owner vota a favor, pero solo con 10k votos (< 4% de 1M)
        vm.prank(owner);
        dao.castVote(proposalId, uint8(1));

        // Termina el periodo de votación
        vm.warp(block.timestamp + dao.votingPeriod() + 1);

        // No alcanza el quorum, por lo que la propuesta es derrotada.
        assertEq(uint8(dao.state(proposalId)), uint8(IGovernor.ProposalState.Defeated));
        assertFalse(target.called());
    }

    /// @notice Verifica que getVotes y quorum expuestos por el governor coinciden con LST y la fracción de quorum.
    function test_GetVotesAndQuorum_View() public {
        // Owner se auto-delega y tomamos un snapshot de timepoint.
        vm.prank(owner);
        token.delegate(owner);

        uint256 t0 = block.timestamp;
        // Avanzar el reloj para que t0 < clock() y getPastVotes/getPastTotalSupply sean válidos.
        vm.warp(block.timestamp + 1);

        // getVotes vía el governor debe coincidir con el total supply (owner tiene todo y se auto-delegó).
        uint256 votes = dao.getVotes(owner, t0);
        assertEq(votes, token.totalSupply());

        // quorum = totalSupply * quorumNumerator / quorumDenominator
        uint256 expectedQuorum = (token.totalSupply() * QUORUM_NUMERATOR) / dao.quorumDenominator();
        uint256 q = dao.quorum(t0);
        assertEq(q, expectedQuorum);
    }
}

