// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {ERC1155Supply} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LuseedPromissoryNote
 * @notice ERC-1155 promissory notes for the Luseed Energy DAO investment pool.
 *
 * Each investment creates a unique note (token ID) where the token amount equals
 * the USDC principal (6 decimals). Notes accrue simple interest at a variable rate
 * set by the admin. Investors claim accumulated yield via `claimYield` and redeem
 * capital at maturity via `redeemCapital` (which burns the note). Transfers are
 * restricted to whitelisted (KYC-verified) addresses.
 *
 * Rate changes are scheduled with a future effective timestamp, ensuring existing
 * accrued yields are calculated at the previous rate.
 */
contract LuseedPromissoryNote is ERC1155, ERC1155Supply, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Constants ──────────────────────────────────────────────────────

    IERC20 public immutable USDC;

    /// @notice 10,000 USDC (6 decimals)
    uint256 public constant MIN_INVESTMENT = 10_000 * 10 ** 6;
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    // ─── State ──────────────────────────────────────────────────────────

    uint256 private _nextNoteId = 1;

    struct NoteInfo {
        uint256 startTimestamp;
        uint256 termEnd;
        bool capitalRedeemed;
    }

    mapping(uint256 noteId => NoteInfo) public notes;

    bool public investmentOpen;
    uint256 public termDuration;

    struct RateSegment {
        uint256 startTimestamp;
        uint256 rateBps;
    }

    RateSegment[] internal _rateHistory;

    /// @notice Yield accrual anchor per note per holder (set on invest, claim, or transfer).
    mapping(uint256 noteId => mapping(address holder => uint256 timestamp)) public lastClaimTimestamp;

    /// @notice Stored yield that was snapshotted during a transfer or partial claim.
    mapping(uint256 noteId => mapping(address holder => uint256 amount)) public unclaimedYield;

    mapping(address account => bool) public isWhitelisted;

    /// @notice Sum of all outstanding (un-redeemed) principal across all notes.
    uint256 public totalInvested;

    // ─── Events ─────────────────────────────────────────────────────────

    event Invested(address indexed investor, uint256 indexed noteId, uint256 usdcAmount);
    event YieldClaimed(address indexed holder, uint256 indexed noteId, uint256 amount);
    event CapitalRedeemed(
        address indexed holder, uint256 indexed noteId, uint256 capitalAmount, uint256 yieldAmount
    );
    event InvestmentWindowUpdated(bool open);
    event RateUpdated(uint256 newRateBps, uint256 effectiveTimestamp);
    event TermDurationUpdated(uint256 newDuration);
    event WhitelistUpdated(address indexed account, bool status);
    event YieldDeposited(address indexed depositor, uint256 amount);

    // ─── Errors ─────────────────────────────────────────────────────────

    error InvestmentNotOpen();
    error BelowMinimum();
    error NotWhitelisted(address account);
    error NoteNotMature(uint256 noteId);
    error InsufficientContractBalance();
    error ZeroAddress();
    error InvalidTermDuration();
    error NoYieldToClaim();
    error NoteDoesNotExist(uint256 noteId);
    error InvalidEffectiveTimestamp();
    error ZeroAmount();

    // ─── Constructor ────────────────────────────────────────────────────

    /**
     * @param _owner        Initial admin (later transferable to the DAO).
     * @param _usdc         USDC token address.
     * @param _termDuration Note maturity in seconds (applies to new notes).
     * @param _initialRateBps Annual interest rate in basis points (e.g. 800 = 8%).
     */
    constructor(address _owner, address _usdc, uint256 _termDuration, uint256 _initialRateBps)
        ERC1155("")
        Ownable(_owner)
    {
        if (_usdc == address(0)) revert ZeroAddress();
        if (_termDuration == 0) revert InvalidTermDuration();

        USDC = IERC20(_usdc);
        termDuration = _termDuration;
        _rateHistory.push(RateSegment({startTimestamp: block.timestamp, rateBps: _initialRateBps}));
        isWhitelisted[_owner] = true;
    }

    // ─── Investment ─────────────────────────────────────────────────────

    /**
     * @notice Deposit USDC and receive a promissory note.
     *         1 token unit = 1 USDC raw unit (6 decimals).
     * @param usdcAmount Amount in USDC raw units (>= MIN_INVESTMENT).
     * @return noteId     The newly created note's token ID.
     */
    function invest(uint256 usdcAmount) external nonReentrant returns (uint256 noteId) {
        if (!investmentOpen) revert InvestmentNotOpen();
        if (usdcAmount < MIN_INVESTMENT) revert BelowMinimum();
        if (!isWhitelisted[msg.sender]) revert NotWhitelisted(msg.sender);

        noteId = _nextNoteId++;

        notes[noteId] = NoteInfo({
            startTimestamp: block.timestamp,
            termEnd: block.timestamp + termDuration,
            capitalRedeemed: false
        });
        lastClaimTimestamp[noteId][msg.sender] = block.timestamp;

        USDC.safeTransferFrom(msg.sender, address(this), usdcAmount);
        _mint(msg.sender, noteId, usdcAmount, "");

        totalInvested += usdcAmount;
        emit Invested(msg.sender, noteId, usdcAmount);
    }

    // ─── Yield ──────────────────────────────────────────────────────────

    /// @notice Claim all accumulated yield for a given note.
    function claimYield(uint256 noteId) external nonReentrant {
        if (!_noteExists(noteId)) revert NoteDoesNotExist(noteId);

        uint256 yieldAmount = _calculateYield(noteId, msg.sender);
        if (yieldAmount == 0) revert NoYieldToClaim();

        NoteInfo storage note = notes[noteId];
        uint256 claimUpTo = block.timestamp < note.termEnd ? block.timestamp : note.termEnd;
        lastClaimTimestamp[noteId][msg.sender] = claimUpTo;
        unclaimedYield[noteId][msg.sender] = 0;

        if (USDC.balanceOf(address(this)) < yieldAmount) revert InsufficientContractBalance();

        USDC.safeTransfer(msg.sender, yieldAmount);
        emit YieldClaimed(msg.sender, noteId, yieldAmount);
    }

    /// @notice View: pending (unclaimed) yield for a holder of a note.
    function pendingYield(uint256 noteId, address holder) external view returns (uint256) {
        if (!_noteExists(noteId)) return 0;
        return _calculateYield(noteId, holder);
    }

    // ─── Capital Redemption ─────────────────────────────────────────────

    /**
     * @notice Redeem the principal + remaining yield at maturity. Burns the note tokens.
     *         If the note was partially transferred, only the caller's share is redeemed.
     */
    function redeemCapital(uint256 noteId) external nonReentrant {
        if (!_noteExists(noteId)) revert NoteDoesNotExist(noteId);

        NoteInfo storage note = notes[noteId];
        if (block.timestamp < note.termEnd) revert NoteNotMature(noteId);

        uint256 principal = balanceOf(msg.sender, noteId);
        if (principal == 0) revert ZeroAmount();

        uint256 yieldAmount = _calculateYield(noteId, msg.sender);
        lastClaimTimestamp[noteId][msg.sender] = note.termEnd;
        unclaimedYield[noteId][msg.sender] = 0;

        uint256 totalPayout = principal + yieldAmount;
        if (USDC.balanceOf(address(this)) < totalPayout) revert InsufficientContractBalance();

        _burn(msg.sender, noteId, principal);
        totalInvested -= principal;

        if (totalSupply(noteId) == 0) {
            note.capitalRedeemed = true;
        }

        USDC.safeTransfer(msg.sender, totalPayout);
        emit CapitalRedeemed(msg.sender, noteId, principal, yieldAmount);
    }

    // ─── Admin ──────────────────────────────────────────────────────────

    /// @notice Open or close the investment window.
    function setInvestmentOpen(bool open) external onlyOwner {
        investmentOpen = open;
        emit InvestmentWindowUpdated(open);
    }

    /**
     * @notice Schedule a new interest rate.
     * @param newRateBps           Annual rate in basis points.
     * @param effectiveTimestamp   Must be strictly after `block.timestamp`
     *                             and after the last scheduled segment.
     */
    function setRate(uint256 newRateBps, uint256 effectiveTimestamp) external onlyOwner {
        if (effectiveTimestamp <= block.timestamp) revert InvalidEffectiveTimestamp();
        uint256 lastStart = _rateHistory[_rateHistory.length - 1].startTimestamp;
        if (effectiveTimestamp <= lastStart) revert InvalidEffectiveTimestamp();

        _rateHistory.push(RateSegment({startTimestamp: effectiveTimestamp, rateBps: newRateBps}));
        emit RateUpdated(newRateBps, effectiveTimestamp);
    }

    /// @notice Update the term duration for future notes (does not affect existing notes).
    function setTermDuration(uint256 newDuration) external onlyOwner {
        if (newDuration == 0) revert InvalidTermDuration();
        termDuration = newDuration;
        emit TermDurationUpdated(newDuration);
    }

    /// @notice Add or remove an address from the KYC whitelist.
    function setWhitelisted(address account, bool status) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        isWhitelisted[account] = status;
        emit WhitelistUpdated(account, status);
    }

    /// @notice Deposit USDC into the contract to fund yield payments. Anyone may call.
    function depositYieldFunds(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        USDC.safeTransferFrom(msg.sender, address(this), amount);
        emit YieldDeposited(msg.sender, amount);
    }

    /// @notice Withdraw USDC from the contract (e.g. excess yield funds). Owner only.
    function withdrawExcessUsdc(address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        USDC.safeTransfer(to, amount);
    }

    // ─── Transfer Restriction (KYC Whitelist) ───────────────────────────

    /**
     * @dev Enforces whitelist on transfers and snapshots accrued yield for both
     *      sender and receiver so that balance changes don't distort interest.
     *      Minting (from == 0) and burning (to == 0) skip this logic because
     *      `invest` and `redeemCapital` handle yield accounting directly.
     */
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override(ERC1155, ERC1155Supply)
    {
        if (from != address(0) && to != address(0)) {
            if (!isWhitelisted[from]) revert NotWhitelisted(from);
            if (!isWhitelisted[to]) revert NotWhitelisted(to);

            for (uint256 i = 0; i < ids.length; i++) {
                uint256 noteId = ids[i];
                if (values[i] > 0 && _noteExists(noteId)) {
                    NoteInfo storage note = notes[noteId];
                    uint256 claimUpTo = block.timestamp < note.termEnd ? block.timestamp : note.termEnd;

                    unclaimedYield[noteId][from] += _calculateAccruedYield(noteId, from);
                    lastClaimTimestamp[noteId][from] = claimUpTo;

                    unclaimedYield[noteId][to] += _calculateAccruedYield(noteId, to);
                    lastClaimTimestamp[noteId][to] = claimUpTo;
                }
            }
        }

        super._update(from, to, ids, values);
    }

    // ─── Internal: Yield Calculation ────────────────────────────────────

    function _calculateYield(uint256 noteId, address holder) internal view returns (uint256) {
        return _calculateAccruedYield(noteId, holder) + unclaimedYield[noteId][holder];
    }

    /// @dev Yield accrued since `lastClaimTimestamp` for the holder's current balance.
    function _calculateAccruedYield(uint256 noteId, address holder) internal view returns (uint256) {
        uint256 balance = balanceOf(holder, noteId);
        if (balance == 0) return 0;

        NoteInfo storage note = notes[noteId];
        uint256 fromTime = lastClaimTimestamp[noteId][holder];
        uint256 toTime = block.timestamp < note.termEnd ? block.timestamp : note.termEnd;
        if (toTime <= fromTime) return 0;

        return _computeYieldForPeriod(balance, fromTime, toTime);
    }

    /**
     * @dev Simple interest across rate segments:
     *      yield += principal * rateBps * overlapDuration / (SECONDS_PER_YEAR * BPS_DENOMINATOR)
     */
    function _computeYieldForPeriod(uint256 principal, uint256 fromTime, uint256 toTime)
        internal
        view
        returns (uint256)
    {
        if (fromTime >= toTime) return 0;

        uint256 totalYield = 0;
        uint256 segCount = _rateHistory.length;

        for (uint256 i = 0; i < segCount; i++) {
            uint256 segStart = _rateHistory[i].startTimestamp;
            uint256 segEnd = (i + 1 < segCount) ? _rateHistory[i + 1].startTimestamp : type(uint256).max;
            uint256 rateBps = _rateHistory[i].rateBps;

            uint256 overlapStart = segStart > fromTime ? segStart : fromTime;
            uint256 overlapEnd = segEnd < toTime ? segEnd : toTime;

            if (overlapStart < overlapEnd) {
                uint256 duration = overlapEnd - overlapStart;
                totalYield += (principal * rateBps * duration) / (SECONDS_PER_YEAR * BPS_DENOMINATOR);
            }
        }

        return totalYield;
    }

    function _noteExists(uint256 noteId) internal view returns (bool) {
        return notes[noteId].startTimestamp != 0;
    }

    // ─── View Helpers ───────────────────────────────────────────────────

    /// @notice The interest rate currently in effect.
    function currentRate() external view returns (uint256) {
        uint256 len = _rateHistory.length;
        for (uint256 i = len; i > 0; i--) {
            if (_rateHistory[i - 1].startTimestamp <= block.timestamp) {
                return _rateHistory[i - 1].rateBps;
            }
        }
        return _rateHistory[0].rateBps;
    }

    function rateHistoryLength() external view returns (uint256) {
        return _rateHistory.length;
    }

    function getRateSegment(uint256 index) external view returns (uint256 startTimestamp, uint256 rateBps) {
        RateSegment storage seg = _rateHistory[index];
        return (seg.startTimestamp, seg.rateBps);
    }

    function nextNoteId() external view returns (uint256) {
        return _nextNoteId;
    }
}
