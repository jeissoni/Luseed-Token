// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {LuseedToken} from "../src/LuseedToken.sol";

contract DeployToken is Script {
    function run() external {
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");
        uint256 pk = vm.envUint("BLOCKCHAIN_PRIVATE_KEY");

        console.log("Deploying LuseedToken...");
        console.log("  owner / initial mint:", deployer);

        vm.startBroadcast(pk);
        LuseedToken token = new LuseedToken(deployer);
        vm.stopBroadcast();

        console.log("  LuseedToken deployed at:", address(token));
        console.log("  Total supply:", token.totalSupply());
    }
}
