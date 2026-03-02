# 🏙️ SF City Agent

**AI-powered navigation for San Francisco's bureaucracy.**

An agentic AI application that investigates real SF city databases — permits, violations, complaints, zoning, business records, evictions, 311 cases — and builds personalized action plans for residents, tenants, homeowners, and small business owners.

## What It Does

Ask a question in plain English. The AI dispatches specialized agents that:

1. **Query real city databases** via SF Open Data (SODA) APIs
2. **Reason across multiple data sources** to find patterns and connections
3. **Cite specific laws and codes** (SF Housing Code, CA Civil Code, Planning Code)
4. **Build step-by-step action plans** with departments, forms, phone numbers, deadlines
5. **Surface shortcuts** that most people don't know about

### Example Queries

- "I want to open a coffee shop on 24th Street in the Mission"
- "My landlord hasn't fixed my heater in 3 weeks"
- "I want to build an ADU in my backyard in the Sunset"
- "Investigate 456 Oak Street — I'm thinking of renting there"
- "There's a dead tree about to fall on the sidewalk"
- "What permits do I need for a food truck near Dolores Park?"

## Real Data Sources

All data comes from [SF Open Data Portal (DataSF)](https://data.sfgov.org):

| Dataset | API Endpoint | Updates |
|---------|-------------|---------|
| Building Permits | `i98e-djp9` | Weekly |
| DBI Complaints | `gm2e-bten` | Weekly |
| DBI Violations | `nbtm-fbw5` | Weekly |
| 311 Cases | `vw6y-z8j6` | Nightly |
| Registered Businesses | `g8m3-pdis` | Monthly |
| Fire Violations | `wb4c-6hwj` | Monthly |
| Street Trees | `tkzw-k3nq` | Quarterly |
| Eviction Notices | `5cei-gny5` | Monthly |

## Tech Stack

- **Frontend**: Next.js + Tailwind CSS
- **Backend**: Next.js API Routes (serverless)
- **AI**: Claude (Anthropic) with tool use for agentic investigation
- **Data**: SF Open Data SODA APIs (no API key required, but recommended)
- **Deployment**: Vercel

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/sf-city-agent.git
cd sf-city-agent
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
ANTHROPIC_API_KEY=your_anthropic_api_key_here
SF_DATA_APP_TOKEN=your_optional_sf_data_token
```

- **Anthropic API Key**: Get from [console.anthropic.com](https://console.anthropic.com)
- **SF Data App Token** (optional): Get from [DataSF Developer Settings](https://data.sfgov.org/profile/edit/developer_settings). Increases rate limits from 1000 to 50,000 requests/hour.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Deploy to Vercel

```bash
npx vercel
```

Or connect your GitHub repo to Vercel for automatic deployments. Set environment variables in Vercel dashboard.

## Architecture

```
User Query
    ↓
API Route (/api/agent)
    ↓
Claude (with tool_use)
    ↓ dispatches
┌─────────────────────────────────────────────┐
│  Permits Agent    │  Complaints Agent        │
│  Violations Agent │  311 Cases Agent          │
│  Business Agent   │  Fire Safety Agent        │
│  Eviction Agent   │  Tree Agent               │
│  ADU Agent        │  Legal Research Agent      │
│  Full Investigation Agent                     │
└─────────────────────────────────────────────┘
    ↓ each queries
SF Open Data (SODA API)
    ↓ results flow back
Claude (reasons across all results)
    ↓
Streamed response to user (SSE)
```

The key is that Claude **autonomously decides** which agents to dispatch and what to investigate next based on what each agent finds. This is genuine agentic behavior — the investigation path is different for every query.

## License

MIT

## Disclaimer

This tool provides information based on public city records and AI analysis. It is not legal advice. Always verify critical information directly with relevant SF city departments.
