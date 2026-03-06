// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {LuseedToken} from "../src/LuseedToken.sol";
import {LuseedDAO} from "../src/LuseedDAO.sol";
import {LuseedPromissoryNote} from "../src/LuseedPromissoryNote.sol";
import {LuseedInvestment} from "../src/LuseedInvestment.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";

/// @notice Deploys all Luseed contracts in the correct order.
///         On testnet (chainId != 1) deploys MockUSDC automatically.
///         On mainnet requires USDC_ADDRESS to be set.
contract DeployAll is Script {
    function run() external {
        uint256 pk = vm.envUint("BLOCKCHAIN_PRIVATE_KEY");
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");
        address treasury = vm.envAddress("TREASURY_ADDRESS");

        uint256 votingDelay = vm.envOr("VOTING_DELAY", uint256(1 days));
        uint256 votingPeriod = vm.envOr("VOTING_PERIOD", uint256(1 weeks));
        uint256 proposalThreshold = vm.envOr("PROPOSAL_THRESHOLD", uint256(1000e18));
        uint256 quorumFraction = vm.envOr("QUORUM_FRACTION", uint256(4));
        uint256 termDuration = vm.envOr("TERM_DURATION", uint256(365 days));
        uint256 initialRateBps = vm.envOr("INITIAL_RATE_BPS", uint256(800));

        uint256 expectedChainId = vm.envOr("BLOCKCHAIN_CHAIN_ID", uint256(11155111));
        require(block.chainid == expectedChainId, "Chain ID mismatch - check BLOCKCHAIN_CHAIN_ID");

        bool isTestnet = block.chainid != 1;

        console.log("=== Luseed Energy DAO - Full Deployment ===");
        console.log("  chain:", block.chainid);
        console.log("  mode:", isTestnet ? "TESTNET" : "MAINNET");
        console.log("  deployer:", deployer);
        console.log("  treasury:", treasury);

        vm.startBroadcast(pk);

        // 0. USDC — deploy mock on testnet, use existing on mainnet
        address usdc;
        if (isTestnet) {
            MockUSDC mockUsdc = new MockUSDC(deployer);
            mockUsdc.mint(deployer, 10_000_000e6); // 10M USDC
            usdc = address(mockUsdc);
            console.log("[0/4] MockUSDC deployed:", usdc);
            console.log("  Minted 10,000,000 USDC to deployer");
        } else {
            usdc = vm.envAddress("USDC_ADDRESS");
            console.log("[0/4] Using existing USDC:", usdc);
        }

        // 1. Token
        LuseedToken token = new LuseedToken(deployer);
        console.log("[1/4] LuseedToken:", address(token));

        // 2. DAO (Governor)
        LuseedDAO dao = new LuseedDAO(
            IVotes(address(token)),
            votingDelay,
            votingPeriod,
            proposalThreshold,
            quorumFraction
        );
        console.log("[2/4] LuseedDAO:", address(dao));

        // 3. Promissory Note
        LuseedPromissoryNote pn = new LuseedPromissoryNote(
            deployer,
            usdc,
            termDuration,
            initialRateBps
        );
        console.log("[3/4] LuseedPromissoryNote:", address(pn));

        // 4. Investment (LST sale)
        LuseedInvestment inv = new LuseedInvestment(
            deployer,
            address(token),
            usdc,
            treasury
        );
        console.log("[4/4] LuseedInvestment:", address(inv));

        // Authorize the investment contract to receive/send LST
        token.setAuthorized(address(inv), true);

        // Transfer LST to investment contract for sale
        uint256 saleAmount = token.balanceOf(deployer);
        require(token.transfer(address(inv), saleAmount), "LST transfer failed");
        console.log("  LST transferred to Investment:", saleAmount);

        vm.stopBroadcast();

        console.log("=== Deployment complete ===");
        console.log("  MockUSDC:             ", usdc);
        console.log("  LuseedToken:          ", address(token));
        console.log("  LuseedDAO:            ", address(dao));
        console.log("  LuseedPromissoryNote: ", address(pn));
        console.log("  LuseedInvestment:     ", address(inv));
    }
}
