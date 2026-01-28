# MCP Server Admin Setup Guide

This guide walks you through deploying the Municipal Analytics MCP server to Cloudflare Workers.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Cloudflare account (free tier is fine)
- D1 databases created and populated (see [D1_INITIAL_SETUP.md](D1_INITIAL_SETUP.md))

## Step 1: Clone the Repository

```bash
git clone https://github.com/Kaczor594/Municipal-Analytics-MCP.git
cd Municipal-Analytics-MCP
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Configure wrangler.toml

Edit `wrangler.toml` and add your D1 database IDs:

```toml
[[d1_databases]]
binding = "HOLLY_DB"
database_name = "holly-data-bronze"
database_id = "your-holly-database-id"

[[d1_databases]]
binding = "ROCKFORD_DB"
database_name = "rockford"
database_id = "your-rockford-database-id"

[[d1_databases]]
binding = "HISTORICAL_DB"
database_name = "historical-budgets"
database_id = "your-historical-database-id"
```

## Step 4: Test Locally

Run the development server:

```bash
npm run dev
```

This starts a local server at `http://localhost:8787`.

Test the health endpoint:
```bash
curl http://localhost:8787/health
```

Expected response:
```json
{"status":"ok","server":"municipal-analytics-mcp","version":"1.0.0"}
```

## Step 5: Deploy to Cloudflare Workers

```bash
npm run deploy
```

Wrangler will output your deployment URL:
```
Published municipal-analytics-mcp (1.23s)
  https://municipal-analytics-mcp.isaac-kaczor.workers.dev
```

**Save this URL** - you'll need it for team configuration.

## Step 6: Verify Deployment

Test the deployed server:

```bash
curl https://municipal-analytics-mcp.isaac-kaczor.workers.dev/health
```

## Step 7: Set Up Auto-Sync (Optional but Recommended)

To automatically sync database changes from your Municipal-Analytics repository:

1. Copy the GitHub Action files from `municipal-analytics-github-action/` to your Municipal-Analytics repo
2. Add the required GitHub Secrets
3. See [README_D1_SYNC.md](../municipal-analytics-github-action/README_D1_SYNC.md) for full instructions

## Updating the Server

When you make changes to the MCP server code:

1. Make your changes locally
2. Test with `npm run dev`
3. Deploy with `npm run deploy`

The deployment is instant - no downtime.

## Monitoring

### View Real-time Logs

```bash
npm run tail
```

This shows live logs from your deployed Worker.

### View in Dashboard

1. Go to https://dash.cloudflare.com/
2. Click **Workers & Pages**
3. Click on **municipal-analytics-mcp**
4. View **Metrics** and **Logs**

## Configuration Options

### Environment Variables

You can adjust these in `wrangler.toml`:

```toml
[vars]
MAX_RESULT_ROWS = "1000"    # Maximum rows returned per query
QUERY_TIMEOUT_MS = "30000"  # Query timeout in milliseconds
```

### Production vs Staging

To create a staging environment:

```toml
[env.staging]
name = "municipal-analytics-mcp-staging"
vars = { MAX_RESULT_ROWS = "100" }
```

Deploy to staging:
```bash
wrangler deploy --env staging
```

## Security Notes

- **Read-only access:** The server only allows SELECT queries
- **No credentials exposed:** D1 bindings are secure - no connection strings needed
- **Input validation:** All queries are validated before execution
- **Rate limits:** Cloudflare Workers have built-in DDoS protection

## Troubleshooting

### "D1_ERROR: Database not found"

- Verify database IDs in `wrangler.toml`
- Make sure you created the D1 databases (Step 3 in D1_INITIAL_SETUP.md)

### "Worker threw exception"

Check the logs:
```bash
npm run tail
```

Common causes:
- TypeScript compilation errors
- Invalid database queries
- Missing environment variables

### Deployment fails

- Verify you're logged in: `wrangler whoami`
- Check your Cloudflare account has Workers enabled
- Ensure `wrangler.toml` is valid

### Slow queries

- D1 has cold start times (~50ms first query)
- Large result sets take longer
- Consider adding indexes to frequently queried columns

## Cost

**Cloudflare Workers Free Tier:**
- 100,000 requests/day
- 10ms CPU time per request

**D1 Free Tier:**
- 5 GB storage
- 5 million reads/month
- 100,000 writes/month

This is more than enough for a team querying municipal data.

## Next Steps

1. Share the deployment URL with your team
2. Have team members follow [TEAM_SETUP.md](TEAM_SETUP.md)
3. Set up auto-sync for database updates
