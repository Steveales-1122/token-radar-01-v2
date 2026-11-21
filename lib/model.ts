// Token Radar v2 — "radar-2": a launch-velocity and risk radar for pre-token protocols.
//
// The snapshot carries no ranking, no value and no signal: every figure below is derived from the
// snapshot's own ten fields per protocol (slug, name, category, chains, TVL, 7d change, market cap,
// listed date, gecko id, symbol). No protocol is ever special-cased by name: one function scores
// every row, and every number the dashboard shows can be traced back to those fields.
//
// What v2 adds over a plain TVL board:
//   1. Category multiples — a dollar of TVL is worth more in some categories than others, because
//      those categories have historically launched tokens at higher fully-diluted values.
//   2. Launch velocity — a momentum score from the 7d TVL change, so a protocol heating up now
//      ranks above a bigger one cooling down. The velocity board is a separate ranking.
//   3. Risk proxies — single-chain concentration, very young age, violent 7d swings and tiny size
//      are all visible in the snapshot, so the model flags them and prices them into a
//      risk-adjusted value. They are proxies, labelled as such: the snapshot has no holder,
//      audit or lock data, and v2 never pretends it does.
//   4. A model sandbox — the dashboard re-runs the same scoring in the page when the reader
//      moves the sliders, so the ranking is checkable, not a black box.

/** One protocol as the sealed snapshot carries it: exactly its ten fields. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole sealed snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The v2 model's tunables. The dashboard's sandbox edits these and re-ranks live. */
export interface ModelConstants {
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  chain_bonus: number;
  chain_bonus_cap: number;
  risk_weight: number;
}

export const MODEL: ModelConstants = {
  growth_weight: 0.5,
  growth_floor: -60,
  growth_cap: 120,
  maturity_floor: 0.6,
  maturity_range: 0.4,
  maturity_days: 1095,
  unknown_age_days: 365,
  chain_bonus: 0.05,
  chain_bonus_cap: 4,
  risk_weight: 0.5,
};

export const MODEL_VERSION = 'radar-2';

/** Pre-token rows below the watchlist floor the early radar carries, by TVL. */
export const EARLY_ROWS = 200;

/** Live-token rows the dashboard's Live view carries, by market cap. */
export const LIVE_ROWS = 24;

/** Rows on the separate launch-velocity board. */
export const VELOCITY_ROWS = 24;

/**
 * What a dollar of TVL is worth as implied token value, by category. Categories whose tokens
 * historically launch at high multiples of TVL get more; bridges and staked wrappers get less,
 * because their TVL is mostly someone else's asset passing through. Anything unlisted falls back
 * to the default. These are the model's judgement, stated in the open, not the snapshot's data.
 */
export const CATEGORY_MULTIPLE: Record<string, number> = {
  'Dexs': 0.3,
  'Lending': 0.28,
  'Yield': 0.26,
  'Yield Aggregator': 0.26,
  'Derivatives': 0.24,
  'Perpetuals': 0.24,
  'Options': 0.22,
  'Prediction Market': 0.24,
  'Leveraged Farming': 0.22,
  'CDP': 0.26,
  'Algo-Stables': 0.2,
  'Stablecoin': 0.18,
  'RWA': 0.24,
  'Restaking': 0.18,
  'Liquid Staking': 0.15,
  'Liquid Restaking': 0.15,
  'Bridge': 0.12,
  'Cross Chain': 0.14,
  'CEX': 0.1,
  'Insurance': 0.2,
  'Gaming': 0.26,
  'NFT Marketplace': 0.22,
  'Social': 0.24,
  'Privacy': 0.24,
  'AI': 0.28,
  'Oracle': 0.26,
  'Launchpad': 0.22,
  'Farm': 0.2,
  'Staking': 0.18,
  'Wallet': 0.2,
  'Payments': 0.22,
  'DEX Aggregator': 0.26,
};

export const DEFAULT_MULTIPLE = 0.22;

export function categoryMultiple(category: string | null): number {
  if (category === null) return DEFAULT_MULTIPLE;
  return CATEGORY_MULTIPLE[category] ?? DEFAULT_MULTIPLE;
}

/** A risk tier, from the model's risk score. */
export type RiskTier = 'Low' | 'Medium' | 'High';

/** One farm step: the action, what it costs, how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row, v2 shape. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  velocity_score: number;
  risk_tier: RiskTier;
  risk_score: number;
  risk_flags: string[];
  risk_adjusted_usd: number;
  chain_count: number;
  category_multiple: number;
  model: {
    base_multiple: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    chain_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one board row. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  velocity_score: number;
  risk_tier: RiskTier;
  risk_score: number;
  risk_flags: string[];
  risk_adjusted_usd: number;
  growth_multiplier: number;
  maturity_multiplier: number;
}

/** One row of the launch-velocity board: momentum first, size second. */
export interface VelocityRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  velocity_score: number;
  implied_value_usd: number;
  risk_tier: RiskTier;
  age_days: number | null;
}

/** A live-token protocol: it already trades, so the board shows the market's own value. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** One category's aggregates, for the Categories view. */
export interface CategoryStat {
  category: string;
  count: number;
  tvl_usd: number;
  avg_implied_usd: number;
  top_slug: string;
  top_name: string;
  top_implied_usd: number;
}

/** One chain's aggregates, for the Chains view. */
export interface ChainStat {
  chain: string;
  count: number;
  tvl_usd: number;
  avg_implied_usd: number;
  top_slug: string;
  top_name: string;
}

/** How the board's risk tiers split, for the Risk view. */
export interface RiskSummary {
  low: number;
  medium: number;
  high: number;
  flagged_single_chain: number;
  flagged_very_young: number;
  flagged_volatile: number;
  flagged_tiny: number;
}

/** Everything the dashboard needs, in one script. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  rows: RadarRow[];
  live: LiveRow[];
  velocity: VelocityRow[];
  categories: CategoryStat[];
  chains: ChainStat[];
  risk: RiskSummary;
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** Whole days from `listedAt` to `asOf`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/**
 * The v2 score of one protocol. Implied value is TVL times the category multiple, lifted by
 * growth and maturity and by how many chains carry the protocol; velocity is the 7d change
 * rescaled to 0..100 so a heating protocol outranks a cooling one of the same size; risk is a
 * 0..100 proxy score from the four flags the snapshot can actually see.
 */
export function scoreProtocol(p: SnapshotProtocol, asOf: string, model: ModelConstants): {
  implied: number;
  velocity: number;
  riskScore: number;
  riskTier: RiskTier;
  flags: string[];
  riskAdjusted: number;
  growthPct: number;
  growthMult: number;
  maturityMult: number;
  chainMult: number;
  age: number | null;
  multiple: number;
} {
  const age = ageDays(asOf, p.listed_at);
  const rawGrowth = finite(p.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult =
    model.maturity_floor +
    (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const chainCount = Math.max(1, p.chains.length);
  const chainMult = 1 + model.chain_bonus * Math.min(chainCount - 1, model.chain_bonus_cap);
  const multiple = categoryMultiple(p.category);
  const implied = Math.max(1, Math.round(p.tvl_usd * multiple * growthMult * maturityMult * chainMult));

  // Velocity: the 7d change rescaled so -60% is 0, +120% is 100, 0% is 33. A protocol that
  // just doubled its TVL in a week scores near the top whatever its size.
  const velocity = Math.max(0, Math.min(100, round2(((growthPct - model.growth_floor) / (model.growth_cap - model.growth_floor)) * 100)));

  // Risk proxies — all visible in the snapshot, all labelled as proxies in the dashboard:
  const flags: string[] = [];
  let risk = 0;
  if (chainCount === 1) {
    flags.push('single-chain');
    risk += 25;
  }
  if (age !== null && age < 90) {
    flags.push('very-young');
    risk += 20;
  }
  if (age === null) {
    flags.push('age-unknown');
    risk += 10;
  }
  if (Math.abs(rawGrowth) > 25) {
    flags.push(rawGrowth > 0 ? 'parabolic-7d' : 'bleeding-7d');
    risk += 20;
  }
  if (p.tvl_usd < 10_000_000) {
    flags.push('tiny-tvl');
    risk += 15;
  }
  const riskScore = Math.min(100, risk);
  const riskTier: RiskTier = riskScore >= 60 ? 'High' : riskScore >= 30 ? 'Medium' : 'Low';
  const riskAdjusted = Math.max(1, Math.round(implied * (1 - (riskScore / 100) * model.risk_weight)));

  return { implied, velocity, riskScore, riskTier, flags, riskAdjusted, growthPct, growthMult, maturityMult, chainMult, age, multiple };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Whether a protocol is one the board may rank: pre-token, not an exchange, not a versioned pool. */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && p.category !== 'CEX' && !VERSIONED.test(p.name);
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug on it is ranked, even one the snapshot no longer
  // carries (it cannot, but the board's coverage is the gate's row and is never gambled).
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: pre-token protocols below the watchlist floor, by TVL, capped. Never a
  // replacement for a watchlist row: a chosen protocol stays chosen.
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p) && p.tvl_usd < snapshot.floor_usd)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .slice(0, EARLY_ROWS);
  for (const p of early) chosen.set(p.slug, p);

  const scored = [...chosen.values()].map((p) => ({ p, s: scoreProtocol(p, snapshot.as_of, model) }));
  scored.sort((a, b) => b.s.implied - a.s.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((x, i) => ({
    rank: i + 1,
    slug: x.p.slug,
    name: x.p.name,
    category: x.p.category,
    chains: x.p.chains,
    tvl_usd: x.p.tvl_usd,
    change_7d: x.p.change_7d,
    mcap_usd: x.p.mcap_usd,
    listed_at: x.p.listed_at,
    gecko_id: x.p.gecko_id,
    symbol: x.p.symbol,
    token_status: 'pre-token' as const,
    age_days: x.s.age,
    implied_value_usd: x.s.implied,
    velocity_score: x.s.velocity,
    risk_tier: x.s.riskTier,
    risk_score: x.s.riskScore,
    risk_flags: x.s.flags,
    risk_adjusted_usd: x.s.riskAdjusted,
    chain_count: Math.max(1, x.p.chains.length),
    category_multiple: x.s.multiple,
    model: {
      base_multiple: x.s.multiple,
      growth_pct: round2(x.s.growthPct),
      growth_multiplier: round4(x.s.growthMult),
      maturity_multiplier: round4(x.s.maturityMult),
      chain_multiplier: round4(x.s.chainMult),
      age_days: x.s.age,
    },
    farm_steps: farmSteps(x.p, x.s.age, x.s.flags, x.s.riskTier).map(stepText),
  }));
}

/** A step as one string: action, then cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's one action, in words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm') || c.includes('aggregator')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('bridge') || c.includes('cross chain')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('options')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedge.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield asset on ${chain} and hold it.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy.`;
  if (c.includes('gaming') || c.includes('nft')) return `Use $${capital} inside ${name} on ${chain}: play, trade or list once, and keep the activity on one wallet.`;
  if (c.includes('social') || c.includes('ai')) return `Create one account on ${name}, connect the farm wallet, and complete its first on-chain action with $${capital}.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** One plain sentence per risk flag, telling the farmer what it means in practice. */
function riskAdvice(flag: string): string {
  if (flag === 'single-chain') return 'It lives on one chain only, so a bridge halt or a chain outage strands the position: keep the farm wallet small and the exit ready.';
  if (flag === 'very-young') return 'It is under 90 days old, so its points rules and its TVL can both move fast: check its own announcements weekly, not monthly.';
  if (flag === 'age-unknown') return 'The snapshot carries no listing date for it, so treat its age as unknown and size the position as if it were young.';
  if (flag === 'parabolic-7d') return 'Its TVL jumped more than 25% in a week: momentum is real, but entries after a spike often buy the top, so scale in over two weeks.';
  if (flag === 'bleeding-7d') return 'Its TVL fell more than 25% in a week: something is leaving, so find out why on its own channels before adding funds.';
  if (flag === 'tiny-tvl') return 'Its TVL is under $10M, so one whale leaving moves everything: never put more than you can withdraw in one transaction.';
  return 'Check the protocol’s own pages before acting.';
}

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time. The plan is derived
 * from the protocol's own record (category, chains, TVL, age, risk flags), never from a
 * hand-written list of names. Step three is the risk step: it names this row's flags and what to
 * do about them.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null, flags: string[], tier: RiskTier): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const action = actionFor(p, capital, chain);
  const riskText =
    flags.length === 0
      ? `This row carries no risk flag from the snapshot: it is multi-chain, established and steady over 7 days. Still verify the protocol's own pages before depositing.`
      : `Risk tier ${tier} — ${flags.join(', ')}. ${flags.map(riskAdvice).join(' ')}`;
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: action,
      cost: `$${capital} of capital and about $${capital >= 150 ? 8 : 4} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: riskText,
      cost: 'nothing but the reading',
      time: '10 minutes',
    },
    {
      text: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.`,
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes, then write the wallet, the dates and every transaction in a farm log.`,
      cost: 'no fee to check, and never pay to claim',
      time: '15 minutes',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** The launch-velocity board: momentum first, size second, from the ranked board's rows. */
export function velocityRows(board: BoardRow[]): VelocityRow[] {
  return [...board]
    .sort((a, b) => b.velocity_score - a.velocity_score || b.implied_value_usd - a.implied_value_usd)
    .slice(0, VELOCITY_ROWS)
    .map((r, i) => ({
      rank: i + 1,
      slug: r.slug,
      name: r.name,
      category: r.category,
      chains: r.chains,
      tvl_usd: r.tvl_usd,
      change_7d: r.change_7d,
      velocity_score: r.velocity_score,
      implied_value_usd: r.implied_value_usd,
      risk_tier: r.risk_tier,
      age_days: r.age_days,
    }));
}

/** Per-category aggregates over the ranked board. */
export function categoryStats(board: BoardRow[]): CategoryStat[] {
  const by = new Map<string, BoardRow[]>();
  for (const r of board) {
    const key = r.category ?? 'Uncategorized';
    const list = by.get(key) ?? [];
    list.push(r);
    by.set(key, list);
  }
  return [...by.entries()]
    .map(([category, rows]) => {
      const top = rows[0]!;
      return {
        category,
        count: rows.length,
        tvl_usd: rows.reduce((s, r) => s + r.tvl_usd, 0),
        avg_implied_usd: Math.round(rows.reduce((s, r) => s + r.implied_value_usd, 0) / rows.length),
        top_slug: top.slug,
        top_name: top.name,
        top_implied_usd: top.implied_value_usd,
      };
    })
    .sort((a, b) => b.tvl_usd - a.tvl_usd);
}

/** Per-chain aggregates over the ranked board. */
export function chainStats(board: BoardRow[]): ChainStat[] {
  const by = new Map<string, BoardRow[]>();
  for (const r of board) {
    for (const chain of r.chains) {
      const list = by.get(chain) ?? [];
      list.push(r);
      by.set(chain, list);
    }
  }
  return [...by.entries()]
    .map(([chain, rows]) => {
      const top = rows[0]!;
      return {
        chain,
        count: rows.length,
        tvl_usd: rows.reduce((s, r) => s + r.tvl_usd, 0),
        avg_implied_usd: Math.round(rows.reduce((s, r) => s + r.implied_value_usd, 0) / rows.length),
        top_slug: top.slug,
        top_name: top.name,
      };
    })
    .sort((a, b) => b.tvl_usd - a.tvl_usd);
}

/** How the board's risk tiers and flags split. */
export function riskSummary(board: BoardRow[]): RiskSummary {
  const out: RiskSummary = { low: 0, medium: 0, high: 0, flagged_single_chain: 0, flagged_very_young: 0, flagged_volatile: 0, flagged_tiny: 0 };
  for (const r of board) {
    if (r.risk_tier === 'Low') out.low++;
    else if (r.risk_tier === 'Medium') out.medium++;
    else out.high++;
    if (r.risk_flags.includes('single-chain')) out.flagged_single_chain++;
    if (r.risk_flags.includes('very-young')) out.flagged_very_young++;
    if (r.risk_flags.includes('parabolic-7d') || r.risk_flags.includes('bleeding-7d')) out.flagged_volatile++;
    if (r.risk_flags.includes('tiny-tvl')) out.flagged_tiny++;
  }
  return out;
}

/** A board row's compact form for data.js. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    velocity_score: row.velocity_score,
    risk_tier: row.risk_tier,
    risk_score: row.risk_score,
    risk_flags: row.risk_flags,
    risk_adjusted_usd: row.risk_adjusted_usd,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    rows: board.map(radarRow),
    live,
    velocity: velocityRows(board),
    categories: categoryStats(board),
    chains: chainStats(board),
    risk: riskSummary(board),
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
