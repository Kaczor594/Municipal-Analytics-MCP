# Claude Code Handoff — Municipal Analytics MCP Server

> Last updated: 2026-03-04
> Repo: https://github.com/Kaczor594/Municipal-Analytics-MCP.git
> Branch: main

## Project Summary

A Cloudflare Workers-based MCP (Model Context Protocol) server that provides read-only SQL access to municipal financial and utility databases stored in Cloudflare D1. Used by Claude Desktop and Claude Code to query water/sewer billing, budgets, debt schedules, and operational data for Michigan municipalities. Built with TypeScript, deployed via Wrangler.

## Current State

**Working:**
- MCP server deployed and serving 6 databases: Holly, Rockford, Historical Budgets, Cadillac, Norton Shores, WEB Water
- 12 MCP tools: `get_instructions`, `list_databases`, `list_tables`, `describe_table`, `get_data_dictionary`, `get_recent_records`, `filter_by_column`, `search_records`, `get_summary_stats`, `query_by_date_range`, `execute_query`, `get_audit_log`
- All queries are validated read-only (SELECT/WITH/PRAGMA only, forbidden keyword scanning)
- Results auto-truncated at 1000 rows with `truncated` flag
- Audit logging to a dedicated D1 database (`AUDIT_DB`)
- Rich data dictionary metadata for Holly, Rockford, Historical, Norton Shores, and WEB Water databases
- Schema discovery tool for exploring unknown databases

**Recently added (this session):**
- Cadillac database: D1 binding, code registration across all 5 source files, data uploaded (349,596 rows across 3 tables: `water_detail`, `sewer_detail`, `utility_detail`)
- Norton Shores database: full metadata with customer class codes, billing history descriptions
- WEB Water database: full metadata including billing_detail, capex, opex, debt, revenue, and billing_fy2025 tables

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

**Adding a new database:**
1. Create D1 database: `npx wrangler d1 create <name>`
2. Add `[[d1_databases]]` binding to `wrangler.toml`
3. Add to `Env` interface, `DatabaseName` type, `DATABASE_DISPLAY_NAMES`, `getDatabase()` switch, `getAvailableDatabases()` in `src/database.ts`
4. Add `'new_db'` to all 9 tool enum arrays in `src/tools.ts` (use `replace_all` — they all share the same enum line)
5. Add to `displayNames` in `src/schema-discovery.ts`
6. Add database description to `handleGetInstructions()` in `src/tools.ts`
7. Add metadata entry to `DATA_DICTIONARY` in `src/metadata.ts`
8. Upload data: `sqlite3 local.db .dump > dump.sql`, split if >10MB, then `npx wrangler d1 execute <name> --remote --file=batch.sql`
9. `npm run deploy`

## File Structure

```
municipal-analytics-mcp/
├── src/
│   ├── index.ts              # Worker entry point, SSE/HTTP handling, MCP protocol
│   ├── database.ts           # D1 bindings, query execution, read-only validation, audit logging
│   ├── tools.ts              # 12 MCP tool definitions, input schemas, handler implementations
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
Cloudflare D1 (8 databases)
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
| `AUDIT_DB` | audit-log | Query audit trail |
| `dailytrack_sync` | dailytrack-sync | (Not exposed via MCP tools) |

## Recent Changes

Uncommitted changes (5 modified files, +324 lines):
- `wrangler.toml`: Added Cadillac, Norton Shores, and WEB Water D1 bindings
- `src/database.ts`: Added 3 new databases to Env, DatabaseName, getDatabase(), getAvailableDatabases()
- `src/tools.ts`: Added 3 new databases to all 9 tool enums + instruction descriptions
- `src/metadata.ts`: Added full metadata entries for Norton Shores and WEB Water, stub for Cadillac
- `src/schema-discovery.ts`: Added 3 new databases to displayNames

Also present: `cadillac_dump.sql` (93MB, untracked) — should be gitignored, not committed.

## Known Issues

- `cadillac_dump.sql` (93MB) is sitting in the repo root untracked. Should add to `.gitignore` before committing.
- Cadillac metadata in `DATA_DICTIONARY` is a stub (empty tables object). Table descriptions should be added once the data is explored.
- The `dailytrack_sync` D1 binding exists in `wrangler.toml` but is not exposed through the MCP tools.
- Wrangler CLI auth tokens expire periodically — re-authenticate with `npx wrangler logout && npx wrangler login` if you get error code 10000.
- D1 file uploads are limited to ~10MB per batch. Large databases need to be split: `split -l 10000 inserts.sql batches/batch_` and uploaded sequentially.

## Next Steps

- [ ] Add Cadillac table/column metadata to `DATA_DICTIONARY` in `src/metadata.ts`
- [ ] Explore Cadillac data schema to document column meanings and fiscal year conventions
- [ ] Consider adding summary views for Cadillac (similar to Holly's semantic views)
- [ ] Add Norton Shores and WEB Water to `handleGetInstructions()` tableSelectionGuide in `tools.ts`
- [ ] Clean up `cadillac_dump.sql` from repo root (add to `.gitignore`)
- [ ] Update tool description strings to mention all 6 databases (currently some only mention holly/rockford/historical)
