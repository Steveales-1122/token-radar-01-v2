# Token Radar v2 — Launch Velocity & Risk Radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/Steveales-1122/token-radar-01-v2/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/Steveales-1122/token-radar-01-v2/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Which pre-token protocol is worth farming next — ranked by implied value, launch velocity and risk.

## What v2 adds

- **Category multiples** — a dollar of TVL is worth more in some categories than others.
- **Launch velocity** — a separate momentum board from the 7d TVL change, rescaled 0–100.
- **Risk proxies** — single-chain, very young, violent 7d swing, tiny TVL, priced into a risk-adjusted value. All derived from the snapshot; the snapshot has no holder, audit or lock data, and v2 never pretends it does.
- **Watchlist + alerts** — star rows, get flagged when a watched row moves past your 7d threshold.
- **Model sandbox** — sliders re-run the same scoring in the page, so the ranking is checkable.
- **Category & chain views** — where the board's value and TVL sit, with each group's top pick.
- **Scatter plot** — implied value vs TVL, coloured by risk tier.

## Run it

Node 22, standard library only:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json|directory>
```

Reads the sealed snapshot, writes `board.json`, `data.js`, `dashboard/`, `screenshots/` and `dossier.json` to the output directory. The dashboard is a static page with no network: open `out/dashboard/index.html` (it reads `../data.js`).

## Model

Implied value = TVL × category multiple × growth × maturity × chain breadth. Velocity = 7d TVL change rescaled 0–100 (−60% → 0, +120% → 100). Risk is a 0–100 proxy from the four flags above; the risk-adjusted value discounts the implied value by half the risk score. No protocol is special-cased by name.

## Entry

Built for [make.fun's token-radar-01 bounty](https://make.fun/bounty/token-radar-01) — best token launch radar, judged on the dossier. MIT licensed.
