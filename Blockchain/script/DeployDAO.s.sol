// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {LuseedDAO} from "../src/LuseedDAO.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";

contract DeployDAO is Script {
    function run() external {
        uint256 pk = vm.envUint("BLOCKCHAIN_PRIVATE_KEY");
        address tokenAddr = vm.envAddress("LUSEED_TOKEN_ADDRESS");

        uint256 votingDelay = vm.envOr("VOTING_DELAY", uint256(1 days));
        uint256 votingPeriod = vm.envOr("VOTING_PERIOD", uint256(1 weeks));
        uint256 proposalThreshold = vm.envOr("PROPOSAL_THRESHOLD", uint256(1000e18));
        uint256 quorumFraction = vm.envOr("QUORUM_FRACTION", uint256(4));

        console.log("Deploying LuseedDAO...");
        console.log("  token:", tokenAddr);
        console.log("  votingDelay:", votingDelay);
        console.log("  votingPeriod:", votingPeriod);
        console.log("  proposalThreshold:", proposalThreshold);
        console.log("  quorumFraction:", quorumFraction);

        vm.startBroadcast(pk);
        LuseedDAO dao = new LuseedDAO(
            IVotes(tokenAddr),
            votingDelay,
            votingPeriod,
            proposalThreshold,
            quorumFraction
        );
        vm.stopBroadcast();

        console.log("  LuseedDAO deployed at:", address(dao));
    }
}
