// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";

/// @notice Despliega MockUSDC en testnet y mintea tokens iniciales al deployer.
contract DeployMockUSDC is Script {
    function run() external {
        uint256 pk = vm.envUint("BLOCKCHAIN_PRIVATE_KEY");
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");
        uint256 initialMint = vm.envOr("MOCK_USDC_MINT", uint256(10_000_000e6)); // 10M USDC

        console.log("Deploying MockUSDC...");
        console.log("  owner:", deployer);
        console.log("  initial mint:", initialMint);

        vm.startBroadcast(pk);

        MockUSDC usdc = new MockUSDC(deployer);
        usdc.mint(deployer, initialMint);

        vm.stopBroadcast();

        console.log("  MockUSDC deployed at:", address(usdc));
        console.log("  Balance deployer:", usdc.balanceOf(deployer));
    }
}
