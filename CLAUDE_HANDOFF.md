# Claude Code Handoff — Municipal Analytics MCP Server

> Last updated: 2026-03-23
> Repo: https://github.com/Kaczor594/Municipal-Analytics-MCP.git
> Branch: main

## Project Summary

A Cloudflare Workers-based MCP (Model Context Protocol) server that provides read-only SQL access to municipal financial and utility databases stored in Cloudflare D1. Used by Claude Desktop and Claude Code to query water/sewer billing, budgets, debt schedules, financial reports, and statewide Michigan financial data for municipalities. Built with TypeScript, deployed via Wrangler.

## Current State

**Working:**
- MCP server deployed at `https://municipal-analytics-mcp.isaac-kaczor.workers.dev` serving 7 databases (Holly, Rockford, Historical Budgets, Cadillac, Norton Shores, WEB Water, MI F-65)
- 13 MCP tools: `get_instructions`, `list_databases`, `list_tables`, `describe_table`, `get_data_dictionary`, `get_recent_records`, `filter_by_column`, `search_records`, `get_summary_stats`, `query_by_date_range`, `execute_query`, `query_f65_financials`, `get_audit_log`
- All queries validated read-only (SELECT/WITH/PRAGMA only, forbidden keyword scanning)
- Results auto-truncated at 1000 rows with `truncated` flag
- Audit logging to dedicated D1 database (`AUDIT_DB`)
- Rich data dictionary metadata for all databases in `metadata.ts`
- Schema discovery tool for exploring unknown databases
- Local Python MCP server (`mcp_database_server.py`) also available for direct SQLite access

**MI F-65 Database (mi_f65) — 3 tables in one D1:**
- `f65_financial_data` (212,362 rows) — F-65 Annual Financial Report line items for ~1,455 Michigan local government units, FY2025 only. Source: data.michigan.gov Socrata API.
- `dashboard_metrics` (459,154 rows) — 21 pre-computed financial health indicators (revenue, debt, pension, ratios) from the Michigan Community Financial Dashboard, 2010-2026. Source: data.michigan.gov dataset 4eh8-kaka.
- `millage_rates` (14,088 rows) — 2026 property tax millage rates for all Michigan taxing jurisdictions (counties, cities, townships, villages, school districts, ISDs, community colleges, authorities, special assessments). Source: Michigan Dept of Treasury State Equalization e-filing system (eequal.bsasoftware.com).

## Environment Setup

```bash
# Install dependencies
cd municipal-analytics-mcp
npm install

# Authenticate with Cloudflare
npx wrangler login

# Local development
npm run dev

# Deploy to Cloudflare Workers
npm run deploy

# Type check
npm run typecheck

# View live logs
npm run tail
```

**Requirements:** Node.js, Cloudflare account with D1 databases already provisioned. Database IDs are in `wrangler.toml`.

**Local Python MCP server** (optional, for direct SQLite access):
```bash
pip3 install mcp
python3 /Users/isaackaczor/municipal_analytics_workspace/mcp_database_server.py
```

**Adding a new database:**
1. Create D1 database: `npx wrangler d1 create <name>`
2. Add `[[d1_databases]]` binding to `wrangler.toml`
3. Add to `Env` interface, `DatabaseName` type, `DATABASE_DISPLAY_NAMES`, `getDatabase()` switch, `getAvailableDatabases()` in `src/database.ts`
4. Add `'new_db'` to all 9 tool enum arrays in `src/tools.ts` (use `replace_all` — they all share the same enum line)
5. Add to `displayNames` in `src/schema-discovery.ts`
6. Add database description to `handleGetInstructions()` in `src/tools.ts`
7. Add metadata entry to `DATA_DICTIONARY` in `src/metadata.ts`
8. Upload data: `sqlite3 local.db .dump > dump.sql`, split if >10MB, then `npx wrangler d1 execute <name> --remote --file=batch.sql`
9. Watch for `unistr()` errors — D1 doesn't support this SQLite function. Clean with regex to replace `\uXXXX` escapes with literal characters.
10. `npm run deploy`

**Adding a new table to an existing D1 database:**
1. Create the schema: `npx wrangler d1 execute <db-name> --remote --command "CREATE TABLE ..."`
2. Generate INSERT statements from local SQLite (avoid `.mode insert` which can produce `unistr()` calls)
3. Upload: `npx wrangler d1 execute <db-name> --remote --file=inserts.sql` (files <10MB upload in one shot)
4. Update metadata in `metadata.ts` and tool descriptions in `tools.ts`
5. Update local MCP server (`mcp_database_server.py`) if applicable
6. `npm run deploy`

## File Structure

```
municipal-analytics-mcp/
├── src/
│   ├── index.ts              # Worker entry point, SSE/HTTP handling, MCP protocol
│   ├── database.ts           # D1 bindings, query execution, read-only validation, audit logging
│   ├── tools.ts              # 13 MCP tool definitions, input schemas, handler implementations
│   ├── metadata.ts           # Data dictionary (DATA_DICTIONARY) with table/column descriptions
│   └── schema-discovery.ts   # Runtime schema introspection for databases without metadata
├── wrangler.toml             # Cloudflare Workers config with all D1 database bindings
├── package.json              # Dependencies: wrangler, @cloudflare/workers-types, typescript
├── tsconfig.json             # TypeScript config
├── ADMIN_SETUP.md            # Admin setup instructions
├── D1_INITIAL_SETUP.md       # D1 database provisioning guide
├── EXAMPLE_QUERIES.md        # Example MCP tool calls
├── TEAM_SETUP.md             # Team onboarding guide
└── scripts/                  # Utility scripts
```

## Architecture

```
Claude Desktop/Code
    ↓ MCP Protocol (SSE)
Cloudflare Worker (src/index.ts)
    ↓ routes MCP tool calls
Tool Handlers (src/tools.ts)
    ↓ validates input, builds queries
Database Layer (src/database.ts)
    ↓ read-only validation, parameterized queries, LIMIT enforcement
Cloudflare D1 (9 databases)
    ↓ results
Audit Log (AUDIT_DB) ← fire-and-forget logging of every tool call
```

**D1 Database Bindings (wrangler.toml):**

| Binding | Database | Content |
|---------|----------|---------|
| `HOLLY_DB` | holly-data-bronze | Holly water/sewer billing, budgets, assets, debt, production |
| `ROCKFORD_DB` | rockford | Rockford water/sewer rate study data |
| `HISTORICAL_DB` | historical-budgets | Multi-municipality budget history 2004-2026 |
| `CADILLAC_DB` | cadillac | Cadillac water/sewer/utility detail |
| `NORTON_SHORES_DB` | norton-shores-water-billing | Norton Shores billing history FY2022-25 |
| `WEB_WATER_DB` | web-water | WEB Water billing, capex, opex, debt, revenue |
| `MI_F65_DB` | mi-f65-financials | Michigan F-65 reports + dashboard metrics + millage rates |
| `AUDIT_DB` | audit-log | Query audit trail |
| `dailytrack_sync` | dailytrack-sync | (Not exposed via MCP tools) |

## Recent Changes

**Session 2026-03-23 (this session):**
- Added `mi_f65` database to Cloudflare worker (database.ts, tools.ts, metadata.ts, schema-discovery.ts, wrangler.toml)
- Created D1 database `mi-f65-financials` (ID: `8fb6463f-c114-4556-8d4b-bae63b1f804a`)
- Uploaded 3 tables to D1:
  - `f65_financial_data` (212,362 rows) — Michigan F-65 line items from 5 Socrata datasets
  - `dashboard_metrics` (459,154 rows) — 21 financial health indicators from MI Community Financial Dashboard
  - `millage_rates` (14,088 rows) — 2026 property tax rates from MI Treasury State Equalization
- Added `query_f65_financials` tool with comprehensive data dictionary and budget-vs-actual pivot query support
- Added full metadata for all 3 mi_f65 tables with column descriptions and known values
- Updated local Python MCP server (`mcp_database_server.py`) with documentation for all 3 tables
- Fixed TypeScript error in schema-discovery.ts (missing norton_shores, web_water, mi_f65 in displayNames)
- Deployed worker (version `d8b5e038-f9d5-455b-9547-da4a0bc95026`)

**Data pipeline notes (mi_f65):**
- F-65 data downloaded from data.michigan.gov via Socrata SODA API (5 datasets: f6yh-g753, ii3e-hrra, 6djr-uu4w, kav9-mfb3, 2see-6c92)
- Dashboard metrics from Socrata dataset `4eh8-kaka` (CSV export)
- Millage rates from `eequal.bsasoftware.com` (XLS export requiring interactive guest login, then converted with `xlrd` Python library)
- D1 upload required cleaning `unistr()` calls from SQLite dump files — D1 doesn't support this function

## Known Issues

- `cadillac_dump.sql` (93MB) is sitting in the repo root untracked. Should add to `.gitignore` before committing.
- Cadillac metadata in `DATA_DICTIONARY` is a stub (empty tables object). Table descriptions should be added once the data is explored.
- The `dailytrack_sync` D1 binding exists in `wrangler.toml` but is not exposed through the MCP tools.
- Wrangler CLI auth tokens expire periodically — re-authenticate with `npx wrangler logout && npx wrangler login` if you get error code 10000.
- D1 file uploads are limited to ~10MB per batch. Large databases need to be split: `split -l 25000 inserts.sql batches/batch_` and uploaded sequentially.
- D1 region is WEUR (Western Europe) for most databases. Not configurable after creation.
- The `line_summary` and `sqlite_sequence` tables exist in the local `mi_f65_financials.db` but were not uploaded to D1 (internal/temporary tables).
- Millage rate data is a single-year snapshot (2026). Future years would require re-downloading from eequal.bsasoftware.com via guest login.

## Next Steps

- [ ] Commit and push all uncommitted changes from this session (+420 lines across 5 files)
- [ ] Add Cadillac table/column metadata to `DATA_DICTIONARY` in `src/metadata.ts`
- [ ] Upload `Data_Dictionary_Update_Tracker.xlsx` to Google Drive and share with team
- [ ] Consider adding Fowlerville database to the MCP server
- [ ] Update wrangler to latest version (4.60.0 → 4.76.0)
- [ ] Add indexes to large D1 tables for query performance if needed
- [ ] Consider adding a dedicated `query_millage_rates` tool (currently queried via `execute_query`)
- [ ] Consider adding a dedicated `query_dashboard_metrics` tool for guided trend analysis
