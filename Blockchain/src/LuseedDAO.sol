// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Governor} from "@openzeppelin/contracts/governance/Governor.sol";
import {GovernorSettings} from "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import {GovernorCountingSimple} from "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import {GovernorVotes} from "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import {GovernorVotesQuorumFraction} from "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";

/// @title LuseedDAO
/// @notice Gobernanza on-chain basada en LuseedToken (ERC20Votes) como token de voto.
contract LuseedDAO is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction
{
    /// @param _token Token con votos (LuseedToken) usado como poder de voto.
    /// @param _votingDelay Tiempo desde que se crea la propuesta hasta que empieza la votación (en segundos).
    /// @param _votingPeriod Duración de la votación (en segundos).
    /// @param _proposalThreshold Mínimo de votos requeridos para poder crear propuestas.
    /// @param _quorumFraction Porcentaje de quorum (por ejemplo 4 = 4%).
    constructor(
        IVotes _token,
        uint256 _votingDelay,
        uint256 _votingPeriod,
        uint256 _proposalThreshold,
        uint256 _quorumFraction
    )
        Governor("LuseedDAO")
        GovernorSettings(uint48(_votingDelay), uint32(_votingPeriod), _proposalThreshold)
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(_quorumFraction)
    {}

    // ───────────────────── Configuración de gobernanza ─────────────────────

    /// @inheritdoc Governor
    function votingDelay()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.votingDelay();
    }

    /// @inheritdoc Governor
    function votingPeriod()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.votingPeriod();
    }

    /// @inheritdoc Governor
    function quorum(uint256 timepoint)
        public
        view
        override(Governor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(timepoint);
    }

    /// @inheritdoc Governor
    function proposalThreshold()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.proposalThreshold();
    }

    /// @inheritdoc Governor
    function getVotes(address account, uint256 timepoint)
        public
        view
        override(Governor)
        returns (uint256)
    {
        return super.getVotes(account, timepoint);
    }
}

