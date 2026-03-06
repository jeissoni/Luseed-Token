// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {LuseedPromissoryNote} from "../src/LuseedPromissoryNote.sol";

contract DeployPromissoryNote is Script {
    function run() external {
        uint256 pk = vm.envUint("BLOCKCHAIN_PRIVATE_KEY");
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");
        address usdc = vm.envAddress("USDC_ADDRESS");

        uint256 termDuration = vm.envOr("TERM_DURATION", uint256(365 days));
        uint256 initialRateBps = vm.envOr("INITIAL_RATE_BPS", uint256(800)); // 8%

        console.log("Deploying LuseedPromissoryNote...");
        console.log("  owner:", deployer);
        console.log("  usdc:", usdc);
        console.log("  termDuration:", termDuration);
        console.log("  initialRateBps:", initialRateBps);

        vm.startBroadcast(pk);
        LuseedPromissoryNote pn = new LuseedPromissoryNote(
            deployer,
            usdc,
            termDuration,
            initialRateBps
        );
        vm.stopBroadcast();

        console.log("  LuseedPromissoryNote deployed at:", address(pn));
    }
}
