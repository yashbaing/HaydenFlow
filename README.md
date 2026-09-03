# NEXORA

> **Programmable Liquidity for Tokenized Markets**

Nexora is a decentralized liquidity and routing layer for tokenized assets that introduces **correlated-pair liquidity pools**.

Traditional markets quote almost every asset against fiat/USD:
- `NVDA / USDC`
- `TSLA / USDC`
- `AMZN / USDC`
- `QQQ / USDC`

Nexora enables correlated-pair markets:
- `NVDA / SPY`
- `TSLA / SPY`
- `AMZN / QQQ`
- `QQQ / SPY`

With deep bridge markets:
- `SPY / USDC`
- `ETH / USDC`
- `BTC / USDC`

Users can trade from USDC into any asset because the **Nexora Smart Router** automatically discovers and routes trades across the liquidity graph (e.g. `USDC → nSPY → nNVDA`). Correlated assets have lower relative volatility, reducing impermanent loss risk for passive liquidity providers and making AMMs significantly more capital-efficient.

---

## 🏛 Monorepo Architecture

```
nexora/
├── apps/
│   ├── web/                    # Next.js 16 Web Application (App Router, Tailwind CSS, RainbowKit, D3.js)
│   │   ├── app/                # Pages: /, /trade, /markets, /markets/network, /earn, /create-pool, /portfolio, /analytics
│   │   ├── components/         # Trading UI, D3 force graph, charts, asset icons
│   │   └── lib/                # Client utilities and formatters
│   └── api/                    # Standalone Node.js/TypeScript Express & WebSocket backend
│       ├── src/routes/         # REST API: /assets, /markets, /correlation, /routes, /quote, /swap, /portfolio, /analytics
│       ├── src/websocket/      # Live streaming ticker & pool updates
│       └── src/services/       # Database & routing service layer
├── packages/
│   ├── contracts/              # Solidity Smart Contracts (Foundry)
│   │   ├── src/                # NexoraRouter, NexoraPoolFactory, NexoraOracle, AssetRegistry, MockAsset
│   │   └── test/               # 21 Foundry test suites
│   ├── sdk/                    # TypeScript SDK
│   │   ├── src/router.ts       # Multi-hop pathfinding & AMM quotes
│   │   ├── src/correlation.ts  # Pearson log-return correlation engine
│   │   └── src/nexora.ts       # Client interface & market statistics
│   ├── database/               # Prisma ORM & SQLite Schema
│   │   ├── prisma/             # Schema, migrations & seed script
│   │   └── src/                # Singleton client helper
│   └── shared/                 # Shared TypeScript interfaces & protocol constants
└── package.json                # Turborepo root workspace
```

---

## 🚀 Quickstart

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0
- Foundry (`forge`) for smart contracts

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup & Seed Database
```bash
npm run db:push
npm run db:seed
```

### 3. Run Applications
- **Web App**: `npm run web:dev` (runs on [http://localhost:3000](http://localhost:3000))
- **Backend API**: `npm run api:dev` (runs on [http://localhost:3001](http://localhost:3001))

---

## 🧪 Testing

### Smart Contracts (Foundry)
```bash
npm run contracts:test
# or
cd packages/contracts && forge test
```

### SDK Unit Tests (Vitest)
```bash
cd packages/sdk && npx vitest run
```

### Backend API Tests (Vitest)
```bash
npm run api:test
```

---

## 📡 API Reference (`http://localhost:3001`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check & DB status |
| `GET` | `/api/assets` | Tokenized assets catalog |
| `GET` | `/api/assets/:symbol` | Asset details & 90-day price history |
| `GET` | `/api/markets` | All liquidity pools (TVL, volume, fees, APR) |
| `POST` | `/api/markets` | Create a new liquidity pool |
| `GET` | `/api/correlation` | Pearson correlation between two assets |
| `GET` | `/api/correlation/matrix` | Full NxN correlation matrix |
| `GET` | `/api/routes` | Multi-hop route discovery |
| `GET` | `/api/quote` | Instant swap quote & price impact |
| `POST` | `/api/swap/simulate` | Trade simulation against pool reserves |
| `GET` | `/api/portfolio/:address` | Wallet balances & LP positions |
| `GET` | `/api/analytics` | Protocol TVL, volume, and routing stats |
| `WS` | `/ws` | Real-time price & volume WebSocket stream |

---

## 📄 License
MIT
