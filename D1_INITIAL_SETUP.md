# Cloudflare D1 Initial Setup Guide

This guide walks you through creating the D1 databases and performing the initial data upload. You only need to do this once.

## Prerequisites

- Node.js 18+ installed
- A Cloudflare account (free tier is sufficient)
- Your SQLite database files (from the Municipal-Analytics repository)

## Step 1: Install Wrangler CLI

```bash
npm install -g wrangler
```

Verify installation:
```bash
wrangler --version
```

## Step 2: Login to Cloudflare

```bash
wrangler login
```

This opens a browser window. Authorize the Wrangler CLI.

## Step 3: Create D1 Databases

Run these commands to create the three databases:

```bash
# Create Holly database
wrangler d1 create holly-data-bronze

# Create Rockford database
wrangler d1 create rockford

# Create Historical Budgets database
wrangler d1 create historical-budgets
```

**Important:** Save the output from each command. You'll see something like:

```
✅ Successfully created DB 'holly-data-bronze' in region WNAM
Created your new D1 database.

[[d1_databases]]
binding = "DB"
database_name = "holly-data-bronze"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

You need the `database_id` values.

## Step 4: Update wrangler.toml

Edit `wrangler.toml` and replace the placeholder IDs:

```toml
[[d1_databases]]
binding = "HOLLY_DB"
database_name = "holly-data-bronze"
database_id = "your-actual-holly-database-id-here"

[[d1_databases]]
binding = "ROCKFORD_DB"
database_name = "rockford"
database_id = "your-actual-rockford-database-id-here"

[[d1_databases]]
binding = "HISTORICAL_DB"
database_name = "historical-budgets"
database_id = "your-actual-historical-database-id-here"
```

## Step 5: Initial Database Upload

### Option A: Upload from SQL Schema (Recommended for large databases)

First, export your SQLite databases to SQL:

```bash
# Export Holly database
sqlite3 /path/to/databases/Holly_data_bronze.db .dump > holly_dump.sql

# Export Rockford database
sqlite3 /path/to/databases/Rockford.db .dump > rockford_dump.sql

# Export Historical database
sqlite3 /path/to/databases/historical_budgets.db .dump > historical_dump.sql
```

Then import into D1:

```bash
# Upload Holly
wrangler d1 execute holly-data-bronze --remote --file=holly_dump.sql

# Upload Rockford
wrangler d1 execute rockford --remote --file=rockford_dump.sql

# Upload Historical
wrangler d1 execute historical-budgets --remote --file=historical_dump.sql
```

### Option B: Direct File Upload (Simpler for smaller databases)

If your databases are small (< 100MB each):

```bash
# Upload Holly
wrangler d1 execute holly-data-bronze --remote --file=/path/to/databases/Holly_data_bronze.db

# Upload Rockford
wrangler d1 execute rockford --remote --file=/path/to/databases/Rockford.db

# Upload Historical
wrangler d1 execute historical-budgets --remote --file=/path/to/databases/historical_budgets.db
```

## Step 6: Verify Upload

Check that the data was uploaded correctly:

```bash
# List tables in Holly
wrangler d1 execute holly-data-bronze --remote --command="SELECT name FROM sqlite_master WHERE type='table'"

# Count rows in a table
wrangler d1 execute holly-data-bronze --remote --command="SELECT COUNT(*) FROM your_table_name"
```

## Step 7: Note Your Database IDs

For the auto-sync workflow in your Municipal-Analytics repository, you'll need to add these database IDs as GitHub Secrets:

| Secret Name | Value |
|-------------|-------|
| `D1_HOLLY_DATABASE_ID` | Your Holly database ID |
| `D1_ROCKFORD_DATABASE_ID` | Your Rockford database ID |
| `D1_HISTORICAL_DATABASE_ID` | Your Historical database ID |

## Troubleshooting

### "Database not found" error

Make sure you're using the correct database name (not the binding name):
- Use `holly-data-bronze`, not `HOLLY_DB`
- Use `rockford`, not `ROCKFORD_DB`
- Use `historical-budgets`, not `HISTORICAL_DB`

### Upload times out

Large databases may need to be split:
1. Export schema only: `sqlite3 db.db ".schema" > schema.sql`
2. Export data table by table
3. Upload in batches

### "File too large" error

D1 has limits on file uploads. For very large databases:
1. Split into smaller SQL files
2. Upload each file separately
3. Use `.import` for large data tables

## D1 Free Tier Limits

- **Storage:** 5 GB total across all databases
- **Reads:** 5 million per month
- **Writes:** 100,000 per month
- **Rows written:** 100,000 per month

These limits are very generous for municipal analytics use.

## Next Steps

After completing this setup:
1. Deploy the MCP server: See [ADMIN_SETUP.md](ADMIN_SETUP.md)
2. Set up auto-sync: See [README_D1_SYNC.md](../municipal-analytics-github-action/README_D1_SYNC.md) in your main repository
