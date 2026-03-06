// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {LuseedPromissoryNote} from "../src/LuseedPromissoryNote.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @dev Helper so the test contract can receive ERC-1155 tokens.
contract LuseedPromissoryNoteTest is Test, ERC1155Holder {
    LuseedPromissoryNote public pn;
    MockUSDC public usdc;

    address public owner;
    address public alice;
    address public bob;
    address public carol;

    uint256 constant USDC_10K = 10_000 * 10 ** 6;
    uint256 constant USDC_50K = 50_000 * 10 ** 6;
    uint256 constant RATE_8_PCT = 800; // 8% annual
    uint256 constant TERM_1Y = 365 days;

    function setUp() public {
        owner = makeAddr("owner");
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        carol = makeAddr("carol");

        vm.startPrank(owner);
        usdc = new MockUSDC();
        pn = new LuseedPromissoryNote(owner, address(usdc), TERM_1Y, RATE_8_PCT);

        pn.setWhitelisted(alice, true);
        pn.setWhitelisted(bob, true);
        pn.setInvestmentOpen(true);
        vm.stopPrank();

        usdc.mint(alice, 1_000_000 * 10 ** 6);
        usdc.mint(bob, 1_000_000 * 10 ** 6);
        usdc.mint(owner, 1_000_000 * 10 ** 6);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════

    function test_Constructor_SetsState() public view {
        assertEq(address(pn.USDC()), address(usdc));
        assertEq(pn.termDuration(), TERM_1Y);
        assertEq(pn.currentRate(), RATE_8_PCT);
        assertEq(pn.rateHistoryLength(), 1);
        assertTrue(pn.isWhitelisted(owner));
        assertEq(pn.nextNoteId(), 1);
        assertTrue(pn.investmentOpen()); // setUp opens it
    }

    function test_Constructor_RevertsZeroUsdc() public {
        vm.prank(owner);
        vm.expectRevert(LuseedPromissoryNote.ZeroAddress.selector);
        new LuseedPromissoryNote(owner, address(0), TERM_1Y, RATE_8_PCT);
    }

    function test_Constructor_RevertsZeroTerm() public {
        vm.prank(owner);
        vm.expectRevert(LuseedPromissoryNote.InvalidTermDuration.selector);
        new LuseedPromissoryNote(owner, address(usdc), 0, RATE_8_PCT);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  INVEST
    // ═══════════════════════════════════════════════════════════════════

    function test_Invest_Success() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_50K);

        uint256 noteId = pn.invest(USDC_50K);
        vm.stopPrank();

        assertEq(noteId, 1);
        assertEq(pn.balanceOf(alice, noteId), USDC_50K);
        assertEq(pn.totalInvested(), USDC_50K);
        assertEq(usdc.balanceOf(address(pn)), USDC_50K);
        assertEq(pn.nextNoteId(), 2);

        (uint256 start, uint256 termEnd, bool redeemed) = pn.notes(noteId);
        assertEq(start, block.timestamp);
        assertEq(termEnd, block.timestamp + TERM_1Y);
        assertFalse(redeemed);
    }

    function test_Invest_EmitsEvent() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_10K);

        vm.expectEmit(true, true, true, true);
        emit LuseedPromissoryNote.Invested(alice, 1, USDC_10K);
        pn.invest(USDC_10K);
        vm.stopPrank();
    }

    function test_Invest_MultipleNotes() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_50K);

        uint256 id1 = pn.invest(USDC_10K);
        uint256 id2 = pn.invest(USDC_10K);

        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(pn.totalInvested(), USDC_10K * 2);
        vm.stopPrank();
    }

    function test_Invest_RevertsWhenClosed() public {
        vm.prank(owner);
        pn.setInvestmentOpen(false);

        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_10K);
        vm.expectRevert(LuseedPromissoryNote.InvestmentNotOpen.selector);
        pn.invest(USDC_10K);
        vm.stopPrank();
    }

    function test_Invest_RevertsBelowMinimum() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), 5_000 * 10 ** 6);
        vm.expectRevert(LuseedPromissoryNote.BelowMinimum.selector);
        pn.invest(5_000 * 10 ** 6);
        vm.stopPrank();
    }

    function test_Invest_RevertsNotWhitelisted() public {
        vm.startPrank(carol);
        usdc.approve(address(pn), USDC_10K);
        vm.expectRevert(abi.encodeWithSelector(LuseedPromissoryNote.NotWhitelisted.selector, carol));
        pn.invest(USDC_10K);
        vm.stopPrank();
    }

    // ═══════════════════════════════════════════════════════════════════
    //  YIELD CALCULATION & CLAIM
    // ═══════════════════════════════════════════════════════════════════

    function test_PendingYield_AccruesOverTime() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_50K);
        uint256 noteId = pn.invest(USDC_50K);
        vm.stopPrank();

        // 50,000 USDC at 8% for 1 year = 4,000 USDC = 4_000_000_000
        // After 6 months: ~2,000 USDC
        vm.warp(block.timestamp + 182.5 days);

        uint256 pending = pn.pendingYield(noteId, alice);
        // 50_000e6 * 800 * 182.5days / (365days * 10_000)
        uint256 expected = (USDC_50K * RATE_8_PCT * 182.5 days) / (365 days * 10_000);
        assertEq(pending, expected);
    }

    function test_PendingYield_StopsAtTermEnd() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_10K);
        uint256 noteId = pn.invest(USDC_10K);
        vm.stopPrank();

        // Warp past term end
        vm.warp(block.timestamp + TERM_1Y + 90 days);

        // Yield should be capped at 1 year
        uint256 pending = pn.pendingYield(noteId, alice);
        uint256 expectedFull = (USDC_10K * RATE_8_PCT * TERM_1Y) / (365 days * 10_000);
        assertEq(pending, expectedFull);
    }

    function test_PendingYield_ReturnsZeroForNonexistentNote() public view {
        assertEq(pn.pendingYield(999, alice), 0);
    }

    function test_ClaimYield_Success() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_50K);
        uint256 noteId = pn.invest(USDC_50K);
        vm.stopPrank();

        // Deposit yield funds
        vm.startPrank(owner);
        usdc.approve(address(pn), 10_000 * 10 ** 6);
        pn.depositYieldFunds(10_000 * 10 ** 6);
        vm.stopPrank();

        vm.warp(block.timestamp + 365 days);

        uint256 expectedYield = (USDC_50K * RATE_8_PCT * TERM_1Y) / (365 days * 10_000);
        uint256 aliceBalBefore = usdc.balanceOf(alice);

        vm.prank(alice);
        pn.claimYield(noteId);

        assertEq(usdc.balanceOf(alice), aliceBalBefore + expectedYield);
        assertEq(pn.pendingYield(noteId, alice), 0);
    }

    function test_ClaimYield_EmitsEvent() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_10K);
        uint256 noteId = pn.invest(USDC_10K);
        vm.stopPrank();

        vm.startPrank(owner);
        usdc.approve(address(pn), 5_000 * 10 ** 6);
        pn.depositYieldFunds(5_000 * 10 ** 6);
        vm.stopPrank();

        vm.warp(block.timestamp + 365 days);

        uint256 expectedYield = (USDC_10K * RATE_8_PCT * TERM_1Y) / (365 days * 10_000);

        vm.prank(alice);
        vm.expectEmit(true, true, true, true);
        emit LuseedPromissoryNote.YieldClaimed(alice, noteId, expectedYield);
        pn.claimYield(noteId);
    }

    function test_ClaimYield_RevertsNoYield() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_10K);
        uint256 noteId = pn.invest(USDC_10K);
        vm.stopPrank();

        // No time passed, no yield
        vm.prank(alice);
        vm.expectRevert(LuseedPromissoryNote.NoYieldToClaim.selector);
        pn.claimYield(noteId);
    }

    function test_ClaimYield_RevertsNoteDoesNotExist() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(LuseedPromissoryNote.NoteDoesNotExist.selector, 999));
        pn.claimYield(999);
    }

    function test_ClaimYield_RevertsInsufficientBalance() public {
        vm.startPrank(owner);
        LuseedPromissoryNote pn2 =
            new LuseedPromissoryNote(owner, address(usdc), TERM_1Y, RATE_8_PCT);
        pn2.setWhitelisted(alice, true);
        pn2.setInvestmentOpen(true);
        vm.stopPrank();

        // Alice invests, then owner withdraws the principal
        vm.startPrank(alice);
        usdc.approve(address(pn2), USDC_10K);
        uint256 noteId2 = pn2.invest(USDC_10K);
        vm.stopPrank();

        vm.prank(owner);
        pn2.withdrawExcessUsdc(owner, USDC_10K);

        vm.warp(block.timestamp + 180 days);

        vm.prank(alice);
        vm.expectRevert(LuseedPromissoryNote.InsufficientContractBalance.selector);
        pn2.claimYield(noteId2);
    }

    function test_ClaimYield_MultipleClaims() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_50K);
        uint256 noteId = pn.invest(USDC_50K);
        vm.stopPrank();

        vm.startPrank(owner);
        usdc.approve(address(pn), 100_000 * 10 ** 6);
        pn.depositYieldFunds(100_000 * 10 ** 6);
        vm.stopPrank();

        // First claim at 6 months
        vm.warp(block.timestamp + 182 days);
        uint256 yield1 = pn.pendingYield(noteId, alice);
        vm.prank(alice);
        pn.claimYield(noteId);

        // Second claim at 12 months
        vm.warp(block.timestamp + 183 days);
        uint256 yield2 = pn.pendingYield(noteId, alice);
        vm.prank(alice);
        pn.claimYield(noteId);

        // Total yield ≈ full year yield (allow 1 unit rounding from splitting periods)
        uint256 fullYearYield = (USDC_50K * RATE_8_PCT * TERM_1Y) / (365 days * 10_000);
        assertApproxEqAbs(yield1 + yield2, fullYearYield, 1);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  VARIABLE RATE
    // ═══════════════════════════════════════════════════════════════════

    function test_SetRate_SchedulesFutureRate() public {
        uint256 effectiveTs = block.timestamp + 30 days;

        vm.prank(owner);
        pn.setRate(1200, effectiveTs); // 12%

        assertEq(pn.rateHistoryLength(), 2);
        (uint256 start, uint256 rate) = pn.getRateSegment(1);
        assertEq(start, effectiveTs);
        assertEq(rate, 1200);

        // Current rate is still 8% until effective timestamp
        assertEq(pn.currentRate(), RATE_8_PCT);

        // After effective timestamp, current rate changes
        vm.warp(effectiveTs);
        assertEq(pn.currentRate(), 1200);
    }

    function test_SetRate_EmitsEvent() public {
        uint256 effectiveTs = block.timestamp + 30 days;
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit LuseedPromissoryNote.RateUpdated(1200, effectiveTs);
        pn.setRate(1200, effectiveTs);
    }

    function test_SetRate_RevertsIfNotFuture() public {
        vm.prank(owner);
        vm.expectRevert(LuseedPromissoryNote.InvalidEffectiveTimestamp.selector);
        pn.setRate(1200, block.timestamp);
    }

    function test_SetRate_RevertsIfBeforeLastSegment() public {
        uint256 ts1 = block.timestamp + 60 days;
        vm.prank(owner);
        pn.setRate(1200, ts1);

        vm.prank(owner);
        vm.expectRevert(LuseedPromissoryNote.InvalidEffectiveTimestamp.selector);
        pn.setRate(1500, ts1 - 1);
    }

    function test_SetRate_OnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        pn.setRate(1200, block.timestamp + 30 days);
    }

    function test_YieldCalculation_WithRateChange() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_10K);
        uint256 noteId = pn.invest(USDC_10K);
        vm.stopPrank();

        vm.startPrank(owner);
        usdc.approve(address(pn), 50_000 * 10 ** 6);
        pn.depositYieldFunds(50_000 * 10 ** 6);
        vm.stopPrank();

        uint256 rateChangeTs = block.timestamp + 180 days;
        vm.prank(owner);
        pn.setRate(1600, rateChangeTs); // 16% from day 180

        // After full year: 180 days at 8% + 185 days at 16%
        vm.warp(block.timestamp + 365 days);

        uint256 yieldSeg1 = (USDC_10K * RATE_8_PCT * 180 days) / (365 days * 10_000);
        uint256 yieldSeg2 = (USDC_10K * 1600 * 185 days) / (365 days * 10_000);
        uint256 expectedTotal = yieldSeg1 + yieldSeg2;

        assertEq(pn.pendingYield(noteId, alice), expectedTotal);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  CAPITAL REDEMPTION
    // ═══════════════════════════════════════════════════════════════════

    function test_RedeemCapital_Success() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_50K);
        uint256 noteId = pn.invest(USDC_50K);
        vm.stopPrank();

        vm.startPrank(owner);
        usdc.approve(address(pn), 10_000 * 10 ** 6);
        pn.depositYieldFunds(10_000 * 10 ** 6);
        vm.stopPrank();

        vm.warp(block.timestamp + TERM_1Y);

        uint256 expectedYield = (USDC_50K * RATE_8_PCT * TERM_1Y) / (365 days * 10_000);
        uint256 aliceBefore = usdc.balanceOf(alice);

        vm.prank(alice);
        pn.redeemCapital(noteId);

        assertEq(usdc.balanceOf(alice), aliceBefore + USDC_50K + expectedYield);
        assertEq(pn.balanceOf(alice, noteId), 0);
        assertEq(pn.totalInvested(), 0);
        assertEq(pn.totalSupply(noteId), 0);

        (, , bool redeemed) = pn.notes(noteId);
        assertTrue(redeemed);
    }

    function test_RedeemCapital_EmitsEvent() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_10K);
        uint256 noteId = pn.invest(USDC_10K);
        vm.stopPrank();

        vm.startPrank(owner);
        usdc.approve(address(pn), 5_000 * 10 ** 6);
        pn.depositYieldFunds(5_000 * 10 ** 6);
        vm.stopPrank();

        vm.warp(block.timestamp + TERM_1Y);

        uint256 expectedYield = (USDC_10K * RATE_8_PCT * TERM_1Y) / (365 days * 10_000);

        vm.prank(alice);
        vm.expectEmit(true, true, true, true);
        emit LuseedPromissoryNote.CapitalRedeemed(alice, noteId, USDC_10K, expectedYield);
        pn.redeemCapital(noteId);
    }

    function test_RedeemCapital_RevertsBeforeMaturity() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_10K);
        uint256 noteId = pn.invest(USDC_10K);
        vm.stopPrank();

        vm.warp(block.timestamp + TERM_1Y - 1);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(LuseedPromissoryNote.NoteNotMature.selector, noteId));
        pn.redeemCapital(noteId);
    }

    function test_RedeemCapital_RevertsZeroBalance() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_10K);
        uint256 noteId = pn.invest(USDC_10K);
        vm.stopPrank();

        vm.warp(block.timestamp + TERM_1Y);

        // Bob has no tokens for this note
        vm.prank(bob);
        vm.expectRevert(LuseedPromissoryNote.ZeroAmount.selector);
        pn.redeemCapital(noteId);
    }

    function test_RedeemCapital_RevertsNonexistentNote() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(LuseedPromissoryNote.NoteDoesNotExist.selector, 999));
        pn.redeemCapital(999);
    }

    function test_RedeemCapital_RevertsInsufficientBalance() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_50K);
        uint256 noteId = pn.invest(USDC_50K);
        vm.stopPrank();

        // Withdraw all USDC from the contract
        vm.prank(owner);
        pn.withdrawExcessUsdc(owner, USDC_50K);

        vm.warp(block.timestamp + TERM_1Y);

        vm.prank(alice);
        vm.expectRevert(LuseedPromissoryNote.InsufficientContractBalance.selector);
        pn.redeemCapital(noteId);
    }

    function test_RedeemCapital_AfterClaimingYield() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_50K);
        uint256 noteId = pn.invest(USDC_50K);
        vm.stopPrank();

        vm.startPrank(owner);
        usdc.approve(address(pn), 10_000 * 10 ** 6);
        pn.depositYieldFunds(10_000 * 10 ** 6);
        vm.stopPrank();

        // Claim at 6 months
        vm.warp(block.timestamp + 182 days);
        vm.prank(alice);
        pn.claimYield(noteId);

        // Redeem at maturity — should only pay remaining yield + capital
        vm.warp(block.timestamp + 183 days);

        uint256 remainingYield = pn.pendingYield(noteId, alice);
        uint256 aliceBefore = usdc.balanceOf(alice);

        vm.prank(alice);
        pn.redeemCapital(noteId);

        assertEq(usdc.balanceOf(alice), aliceBefore + USDC_50K + remainingYield);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  TRANSFERS (KYC WHITELIST + YIELD SETTLEMENT)
    // ═══════════════════════════════════════════════════════════════════

    function test_Transfer_BetweenWhitelisted() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_50K);
        uint256 noteId = pn.invest(USDC_50K);
        vm.stopPrank();

        vm.warp(block.timestamp + 90 days);

        vm.prank(alice);
        pn.safeTransferFrom(alice, bob, noteId, USDC_10K, "");

        assertEq(pn.balanceOf(alice, noteId), USDC_50K - USDC_10K);
        assertEq(pn.balanceOf(bob, noteId), USDC_10K);
    }

    function test_Transfer_RevertsIfSenderNotWhitelisted() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_10K);
        uint256 noteId = pn.invest(USDC_10K);
        vm.stopPrank();

        // Remove alice from whitelist
        vm.prank(owner);
        pn.setWhitelisted(alice, false);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(LuseedPromissoryNote.NotWhitelisted.selector, alice));
        pn.safeTransferFrom(alice, bob, noteId, USDC_10K, "");
    }

    function test_Transfer_RevertsIfReceiverNotWhitelisted() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_10K);
        uint256 noteId = pn.invest(USDC_10K);
        vm.stopPrank();

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(LuseedPromissoryNote.NotWhitelisted.selector, carol));
        pn.safeTransferFrom(alice, carol, noteId, USDC_10K, "");
    }

    function test_Transfer_SettlesSenderYield() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_50K);
        uint256 noteId = pn.invest(USDC_50K);
        vm.stopPrank();

        vm.startPrank(owner);
        usdc.approve(address(pn), 50_000 * 10 ** 6);
        pn.depositYieldFunds(50_000 * 10 ** 6);
        vm.stopPrank();

        // Accrue for 90 days, then transfer half to bob
        vm.warp(block.timestamp + 90 days);

        uint256 yieldBefore = pn.pendingYield(noteId, alice);
        assertGt(yieldBefore, 0);

        vm.prank(alice);
        pn.safeTransferFrom(alice, bob, noteId, USDC_50K / 2, "");

        // Alice's yield was snapshotted — she can still claim the 90-day yield
        // on the full 50K, plus future yield on 25K
        uint256 aliceUnclaimed = pn.unclaimedYield(noteId, alice);
        assertEq(aliceUnclaimed, yieldBefore);
    }

    function test_Transfer_ReceiverStartsFromTransferTime() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_50K);
        uint256 noteId = pn.invest(USDC_50K);
        vm.stopPrank();

        vm.startPrank(owner);
        usdc.approve(address(pn), 50_000 * 10 ** 6);
        pn.depositYieldFunds(50_000 * 10 ** 6);
        vm.stopPrank();

        vm.warp(block.timestamp + 90 days);

        vm.prank(alice);
        pn.safeTransferFrom(alice, bob, noteId, USDC_10K, "");

        // Bob's pending yield at the moment of transfer should be 0
        assertEq(pn.pendingYield(noteId, bob), 0);

        // 30 more days pass
        vm.warp(block.timestamp + 30 days);

        // Bob earns on 10K for 30 days
        uint256 bobPending = pn.pendingYield(noteId, bob);
        uint256 expected = (USDC_10K * RATE_8_PCT * 30 days) / (365 days * 10_000);
        assertEq(bobPending, expected);
    }

    function test_Transfer_PartialThenBothRedeem() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_50K);
        uint256 noteId = pn.invest(USDC_50K);
        vm.stopPrank();

        vm.startPrank(owner);
        usdc.approve(address(pn), 100_000 * 10 ** 6);
        pn.depositYieldFunds(100_000 * 10 ** 6);
        vm.stopPrank();

        // After 6 months, transfer half to bob
        vm.warp(block.timestamp + 182 days);

        vm.prank(alice);
        pn.safeTransferFrom(alice, bob, noteId, USDC_50K / 2, "");

        // Warp to maturity
        vm.warp(block.timestamp + 183 days);

        uint256 aliceBefore = usdc.balanceOf(alice);
        uint256 bobBefore = usdc.balanceOf(bob);

        vm.prank(alice);
        pn.redeemCapital(noteId);

        vm.prank(bob);
        pn.redeemCapital(noteId);

        // Both got their principal back
        uint256 halfPrincipal = USDC_50K / 2;
        uint256 aliceGot = usdc.balanceOf(alice) - aliceBefore;
        uint256 bobGot = usdc.balanceOf(bob) - bobBefore;

        assertGt(aliceGot, halfPrincipal); // principal + yield
        assertGt(bobGot, halfPrincipal); // principal + yield
        // Alice earned more yield (held full amount for first 6 months)
        assertGt(aliceGot, bobGot);

        // Note is fully redeemed
        assertEq(pn.totalSupply(noteId), 0);
        (, , bool redeemed) = pn.notes(noteId);
        assertTrue(redeemed);
    }

    function test_Transfer_ZeroValueSkipsSettlement() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_10K);
        uint256 noteId = pn.invest(USDC_10K);
        vm.stopPrank();

        vm.warp(block.timestamp + 90 days);

        // Transfer 0 tokens — should not revert, no yield settlement
        vm.prank(alice);
        pn.safeTransferFrom(alice, bob, noteId, 0, "");

        assertEq(pn.unclaimedYield(noteId, alice), 0);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    function test_SetInvestmentOpen_EmitsEvent() public {
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit LuseedPromissoryNote.InvestmentWindowUpdated(false);
        pn.setInvestmentOpen(false);
    }

    function test_SetInvestmentOpen_OnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        pn.setInvestmentOpen(false);
    }

    function test_SetTermDuration_Success() public {
        vm.prank(owner);
        pn.setTermDuration(730 days);
        assertEq(pn.termDuration(), 730 days);
    }

    function test_SetTermDuration_EmitsEvent() public {
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit LuseedPromissoryNote.TermDurationUpdated(730 days);
        pn.setTermDuration(730 days);
    }

    function test_SetTermDuration_RevertsZero() public {
        vm.prank(owner);
        vm.expectRevert(LuseedPromissoryNote.InvalidTermDuration.selector);
        pn.setTermDuration(0);
    }

    function test_SetTermDuration_OnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        pn.setTermDuration(730 days);
    }

    function test_SetWhitelisted_Success() public {
        vm.prank(owner);
        pn.setWhitelisted(carol, true);
        assertTrue(pn.isWhitelisted(carol));

        vm.prank(owner);
        pn.setWhitelisted(carol, false);
        assertFalse(pn.isWhitelisted(carol));
    }

    function test_SetWhitelisted_EmitsEvent() public {
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit LuseedPromissoryNote.WhitelistUpdated(carol, true);
        pn.setWhitelisted(carol, true);
    }

    function test_SetWhitelisted_RevertsZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(LuseedPromissoryNote.ZeroAddress.selector);
        pn.setWhitelisted(address(0), true);
    }

    function test_SetWhitelisted_OnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        pn.setWhitelisted(carol, true);
    }

    function test_DepositYieldFunds_Success() public {
        vm.startPrank(owner);
        usdc.approve(address(pn), 5_000 * 10 ** 6);
        pn.depositYieldFunds(5_000 * 10 ** 6);
        vm.stopPrank();

        assertEq(usdc.balanceOf(address(pn)), 5_000 * 10 ** 6);
    }

    function test_DepositYieldFunds_EmitsEvent() public {
        vm.startPrank(owner);
        usdc.approve(address(pn), 5_000 * 10 ** 6);
        vm.expectEmit(true, true, true, true);
        emit LuseedPromissoryNote.YieldDeposited(owner, 5_000 * 10 ** 6);
        pn.depositYieldFunds(5_000 * 10 ** 6);
        vm.stopPrank();
    }

    function test_DepositYieldFunds_RevertsZero() public {
        vm.expectRevert(LuseedPromissoryNote.ZeroAmount.selector);
        pn.depositYieldFunds(0);
    }

    function test_WithdrawExcessUsdc_Success() public {
        vm.startPrank(owner);
        usdc.approve(address(pn), USDC_10K);
        pn.depositYieldFunds(USDC_10K);

        uint256 ownerBefore = usdc.balanceOf(owner);
        pn.withdrawExcessUsdc(owner, 5_000 * 10 ** 6);
        assertEq(usdc.balanceOf(owner), ownerBefore + 5_000 * 10 ** 6);
        vm.stopPrank();
    }

    function test_WithdrawExcessUsdc_RevertsZeroAddress() public {
        vm.startPrank(owner);
        usdc.approve(address(pn), USDC_10K);
        pn.depositYieldFunds(USDC_10K);

        vm.expectRevert(LuseedPromissoryNote.ZeroAddress.selector);
        pn.withdrawExcessUsdc(address(0), 1_000 * 10 ** 6);
        vm.stopPrank();
    }

    function test_WithdrawExcessUsdc_RevertsZeroAmount() public {
        vm.prank(owner);
        vm.expectRevert(LuseedPromissoryNote.ZeroAmount.selector);
        pn.withdrawExcessUsdc(owner, 0);
    }

    function test_WithdrawExcessUsdc_OnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        pn.withdrawExcessUsdc(alice, 1_000 * 10 ** 6);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  VIEW HELPERS
    // ═══════════════════════════════════════════════════════════════════

    function test_CurrentRate_ReturnsCorrectRate() public {
        assertEq(pn.currentRate(), RATE_8_PCT);

        uint256 ts1 = block.timestamp + 30 days;
        vm.prank(owner);
        pn.setRate(1200, ts1);

        // Before effective timestamp
        assertEq(pn.currentRate(), RATE_8_PCT);

        vm.warp(ts1);
        assertEq(pn.currentRate(), 1200);
    }

    function test_GetRateSegment() public view {
        (uint256 start, uint256 rate) = pn.getRateSegment(0);
        assertEq(rate, RATE_8_PCT);
        assertEq(start, block.timestamp);
    }

    function test_NoteInfo() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_10K);
        uint256 noteId = pn.invest(USDC_10K);
        vm.stopPrank();

        (uint256 start, uint256 termEnd, bool redeemed) = pn.notes(noteId);
        assertEq(start, block.timestamp);
        assertEq(termEnd, block.timestamp + TERM_1Y);
        assertFalse(redeemed);
    }

    function test_TotalSupply_TracksCorrectly() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_10K);
        uint256 noteId = pn.invest(USDC_10K);
        vm.stopPrank();

        assertEq(pn.totalSupply(noteId), USDC_10K);
        assertTrue(pn.exists(noteId));

        vm.startPrank(owner);
        usdc.approve(address(pn), 5_000 * 10 ** 6);
        pn.depositYieldFunds(5_000 * 10 ** 6);
        vm.stopPrank();

        vm.warp(block.timestamp + TERM_1Y);

        vm.prank(alice);
        pn.redeemCapital(noteId);

        assertEq(pn.totalSupply(noteId), 0);
        assertFalse(pn.exists(noteId));
    }

    // ═══════════════════════════════════════════════════════════════════
    //  EDGE CASES
    // ═══════════════════════════════════════════════════════════════════

    function test_ClaimYield_NoYieldWhenHolderHasZeroBalance() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_10K);
        uint256 noteId = pn.invest(USDC_10K);
        vm.stopPrank();

        vm.warp(block.timestamp + 90 days);

        // Bob has no tokens
        vm.prank(bob);
        vm.expectRevert(LuseedPromissoryNote.NoYieldToClaim.selector);
        pn.claimYield(noteId);
    }

    function test_RedeemCapital_PartialNotFullyRedeemed() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_50K);
        uint256 noteId = pn.invest(USDC_50K);
        vm.stopPrank();

        // Transfer half to bob
        vm.prank(alice);
        pn.safeTransferFrom(alice, bob, noteId, USDC_50K / 2, "");

        vm.startPrank(owner);
        usdc.approve(address(pn), 100_000 * 10 ** 6);
        pn.depositYieldFunds(100_000 * 10 ** 6);
        vm.stopPrank();

        vm.warp(block.timestamp + TERM_1Y);

        // Alice redeems her half
        vm.prank(alice);
        pn.redeemCapital(noteId);

        // Note is NOT fully redeemed yet (bob still holds tokens)
        (, , bool redeemed) = pn.notes(noteId);
        assertFalse(redeemed);
        assertEq(pn.totalSupply(noteId), USDC_50K / 2);

        // Bob redeems his half
        vm.prank(bob);
        pn.redeemCapital(noteId);

        (, , bool redeemedAfter) = pn.notes(noteId);
        assertTrue(redeemedAfter);
        assertEq(pn.totalSupply(noteId), 0);
    }

    function test_Transfer_SettlesReceiverExistingYield() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_50K);
        uint256 noteId = pn.invest(USDC_50K);
        vm.stopPrank();

        vm.startPrank(owner);
        usdc.approve(address(pn), 100_000 * 10 ** 6);
        pn.depositYieldFunds(100_000 * 10 ** 6);
        vm.stopPrank();

        // Transfer 10K to bob at day 30
        vm.warp(block.timestamp + 30 days);
        vm.prank(alice);
        pn.safeTransferFrom(alice, bob, noteId, USDC_10K, "");

        // Transfer another 10K to bob at day 60
        vm.warp(block.timestamp + 30 days);
        uint256 bobPendingBefore = pn.pendingYield(noteId, bob);
        assertGt(bobPendingBefore, 0);

        vm.prank(alice);
        pn.safeTransferFrom(alice, bob, noteId, USDC_10K, "");

        // Bob's previously accrued yield was snapshotted
        uint256 bobUnclaimed = pn.unclaimedYield(noteId, bob);
        assertEq(bobUnclaimed, bobPendingBefore);
    }

    function test_Invest_InvestmentWindowToggle() public {
        vm.prank(owner);
        pn.setInvestmentOpen(false);

        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_10K);
        vm.expectRevert(LuseedPromissoryNote.InvestmentNotOpen.selector);
        pn.invest(USDC_10K);
        vm.stopPrank();

        vm.prank(owner);
        pn.setInvestmentOpen(true);

        vm.startPrank(alice);
        pn.invest(USDC_10K);
        vm.stopPrank();
    }

    function test_SetTermDuration_OnlyAffectsNewNotes() public {
        vm.startPrank(alice);
        usdc.approve(address(pn), USDC_10K * 2);
        uint256 note1 = pn.invest(USDC_10K);
        vm.stopPrank();

        (uint256 start1, uint256 termEnd1,) = pn.notes(note1);

        vm.prank(owner);
        pn.setTermDuration(730 days);

        vm.startPrank(alice);
        uint256 note2 = pn.invest(USDC_10K);
        vm.stopPrank();

        (uint256 start2, uint256 termEnd2,) = pn.notes(note2);

        assertEq(termEnd1, start1 + TERM_1Y);
        assertEq(termEnd2, start2 + 730 days);
    }

    function test_Constructor_InitialRateZero() public {
        vm.prank(owner);
        LuseedPromissoryNote pnZero =
            new LuseedPromissoryNote(owner, address(usdc), TERM_1Y, 0);
        assertEq(pnZero.currentRate(), 0);
    }
}
