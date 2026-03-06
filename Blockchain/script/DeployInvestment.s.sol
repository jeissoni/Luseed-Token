// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {LuseedInvestment} from "../src/LuseedInvestment.sol";

contract DeployInvestment is Script {
    function run() external {
        uint256 pk = vm.envUint("BLOCKCHAIN_PRIVATE_KEY");
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");
        address tokenAddr = vm.envAddress("LUSEED_TOKEN_ADDRESS");
        address usdc = vm.envAddress("USDC_ADDRESS");
        address treasury = vm.envAddress("TREASURY_ADDRESS");

        console.log("Deploying LuseedInvestment...");
        console.log("  owner:", deployer);
        console.log("  token:", tokenAddr);
        console.log("  usdc:", usdc);
        console.log("  treasury:", treasury);

        vm.startBroadcast(pk);
        LuseedInvestment inv = new LuseedInvestment(
            deployer,
            tokenAddr,
            usdc,
            treasury
        );
        vm.stopBroadcast();

        console.log("  LuseedInvestment deployed at:", address(inv));
    }
}
