// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";

contract MockUSDCTest is Test {
    MockUSDC public usdc;
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    function setUp() public {
        usdc = new MockUSDC();
    }

    function test_anyoneCanMint() public {
        vm.prank(alice);
        usdc.mint(bob, 50_000e6);
        assertEq(usdc.balanceOf(bob), 50_000e6);
    }

    function test_mintToSelf() public {
        vm.prank(alice);
        usdc.mint(alice, 100_000e6);
        assertEq(usdc.balanceOf(alice), 100_000e6);
    }
}
