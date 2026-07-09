import { parseAbi, type Address } from "viem";

export const addresses = {
  promissoryNote: (import.meta.env.VITE_PROMISSORY_NOTE_ADDRESS ?? "0x") as Address,
  luseedToken: (import.meta.env.VITE_LUSEED_TOKEN_ADDRESS ?? "0x") as Address,
  luseedDAO: (import.meta.env.VITE_LUSEED_DAO_ADDRESS ?? "0x") as Address,
  luseedInvestment: (import.meta.env.VITE_LUSEED_INVESTMENT_ADDRESS ?? "0x") as Address,
  usdc: (import.meta.env.VITE_USDC_ADDRESS ?? "0x") as Address,
};

export const promissoryNoteAbi = parseAbi([
  // Read
  "function notes(uint256 noteId) view returns (uint256 startTimestamp, uint256 termEnd, bool capitalRedeemed)",
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function pendingYield(uint256 noteId, address holder) view returns (uint256)",
  "function investmentOpen() view returns (bool)",
  "function currentRate() view returns (uint256)",
  "function termDuration() view returns (uint256)",
  "function totalInvested() view returns (uint256)",
  "function nextNoteId() view returns (uint256)",
  "function isWhitelisted(address account) view returns (bool)",
  "function totalSupply(uint256 id) view returns (uint256)",
  "function MIN_INVESTMENT() view returns (uint256)",
  "function rateHistoryLength() view returns (uint256)",
  "function getRateSegment(uint256 index) view returns (uint256 startTimestamp, uint256 rateBps)",
  "function owner() view returns (address)",
  // Write
  "function invest(uint256 usdcAmount) returns (uint256 noteId)",
  "function claimYield(uint256 noteId)",
  "function redeemCapital(uint256 noteId)",
  "function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes data)",
  "function setInvestmentOpen(bool open)",
  "function setRate(uint256 newRateBps, uint256 effectiveTimestamp)",
  "function setTermDuration(uint256 newDuration)",
  "function setWhitelisted(address account, bool status)",
  "function depositYieldFunds(uint256 amount)",
  "function withdrawExcessUsdc(address to, uint256 amount)",
  // Events
  "event Invested(address indexed investor, uint256 indexed noteId, uint256 usdcAmount)",
  "event YieldClaimed(address indexed holder, uint256 indexed noteId, uint256 amount)",
  "event CapitalRedeemed(address indexed holder, uint256 indexed noteId, uint256 capitalAmount, uint256 yieldAmount)",
  "event InvestmentWindowUpdated(bool open)",
  "event RateUpdated(uint256 newRateBps, uint256 effectiveTimestamp)",
  "event WhitelistUpdated(address indexed account, bool status)",
]);

export const erc20Abi = parseAbi([
  "function approve(address spender, uint256 value) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)",
]);

/** ABI del MockUSDC en testnet (mint público). */
export const mockUsdcAbi = parseAbi([
  "function mint(address to, uint256 amount)",
  "function balanceOf(address account) view returns (uint256)",
]);

export const MOCK_USDC_MINT_AMOUNT = 100_000n * 10n ** 6n; // 100k USDC por reclamo

export const luseedTokenAbi = parseAbi([
  "function isAuthorized(address account) view returns (bool)",
  "function setAuthorized(address account, bool authorized)",
  "function delegate(address delegatee)",
  "function getVotes(address account) view returns (uint256)",
  "function getPastVotes(address account, uint256 timepoint) view returns (uint256)",
  "function owner() view returns (address)",
]);

export const luseedDAOAbi = parseAbi([
  "function propose(address[] targets, uint256[] values, bytes[] calldatas, string description) returns (uint256 proposalId)",
  "function castVote(uint256 proposalId, uint8 support) returns (uint256 balance)",
  "function execute(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) returns (uint256 proposalId)",
  "function state(uint256 proposalId) view returns (uint8)",
  // Errors used by OpenZeppelin Governor (needed so viem can decode reverts)
  "error GovernorNonexistentProposal(uint256 proposalId)",
  "function votingDelay() view returns (uint256)",
  "function votingPeriod() view returns (uint256)",
  "function proposalThreshold() view returns (uint256)",
  "function quorum(uint256 timepoint) view returns (uint256)",
  "function getVotes(address account, uint256 timepoint) view returns (uint256)",
  "function hasVoted(uint256 proposalId, address account) view returns (bool)",
]);

export const luseedInvestmentAbi = parseAbi([
  "function buy(uint256 usdcAmount)",
  "function quoteLstForUsdc(uint256 usdcAmount) external pure returns (uint256)",
  "function remainingCap() external view returns (uint256)",
  "function capReached() external view returns (bool)",
  "function treasury() external view returns (address)",
]);

export const PROPOSAL_STATES = [
  "Pending",
  "Active",
  "Canceled",
  "Defeated",
  "Succeeded",
  "Queued",
  "Expired",
  "Executed",
] as const;
