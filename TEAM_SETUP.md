# Claude Desktop Setup for Team Members

This guide helps you connect Claude Desktop to the Municipal Analytics databases. After setup, you can ask Claude questions about budget data, rate studies, and more using natural language.

## What You'll Be Able to Do

Once connected, you can ask Claude things like:
- "What tables are available in the Holly database?"
- "Show me the budget data for 2024"
- "What are the water rates for different meter sizes?"
- "Compare budgets between last year and this year"

## Step 1: Download Claude Desktop

If you don't have Claude Desktop installed:

**Mac:** Download from https://claude.ai/download
**Windows:** Download from https://claude.ai/download

Install and sign in with your Anthropic account.

## Step 2: Find Your Configuration File

### On Mac:

1. Open **Finder**
2. Press `Cmd + Shift + G` (Go to Folder)
3. Type: `~/Library/Application Support/Claude/`
4. Press Enter

Look for a file named `claude_desktop_config.json`. If it doesn't exist, you'll create it.

### On Windows:

1. Press `Win + R` (Run dialog)
2. Type: `%APPDATA%\Claude\`
3. Press Enter

Look for a file named `claude_desktop_config.json`. If it doesn't exist, you'll create it.

## Step 3: Edit the Configuration

### If the file exists:

Open `claude_desktop_config.json` in a text editor (Notepad on Windows, TextEdit on Mac).

If it already has content, you need to merge the configuration. Add the `municipal-analytics` section inside the `mcpServers` object.

### If the file doesn't exist:

Create a new file named `claude_desktop_config.json` and paste the following:

```json
{
  "mcpServers": {
    "municipal-analytics": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-proxy@latest", "--endpoint", "https://municipal-analytics-mcp.YOUR_SUBDOMAIN.workers.dev/sse"]
    }
  }
}
```

**Important:** Replace `YOUR_SUBDOMAIN` with the actual subdomain provided by your admin.

For example, if your admin says the URL is:
```
https://municipal-analytics-mcp.kaczor594.workers.dev/sse
```

Then your config should be:
```json
{
  "mcpServers": {
    "municipal-analytics": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-proxy@latest", "--endpoint", "https://municipal-analytics-mcp.kaczor594.workers.dev/sse"]
    }
  }
}
```

## Step 4: Save and Restart Claude Desktop

1. **Save** the configuration file
2. **Completely quit** Claude Desktop:
   - **Mac:** Press `Cmd + Q` or right-click the dock icon and choose Quit
   - **Windows:** Right-click the system tray icon and choose Exit
3. **Reopen** Claude Desktop

## Step 5: Verify Connection

When Claude Desktop restarts, you should see a small tools icon (hammer/wrench) in the input area. This indicates the MCP server is connected.

**Test the connection** by typing:

> What databases are available?

Claude should respond with information about the three databases:
- Holly Data Bronze
- Rockford
- Historical Budgets

## Troubleshooting

### "No tools icon appears"

1. Double-check the configuration file syntax (all quotes, commas, brackets must be correct)
2. Make sure you completely quit Claude Desktop (not just closed the window)
3. Verify the server URL is correct
4. Try restarting your computer

### "Config file won't save"

**Mac:** Make sure the folder exists. If not, create it:
1. Open Terminal
2. Run: `mkdir -p ~/Library/Application\ Support/Claude/`

**Windows:** Make sure the folder exists. If not:
1. Navigate to `%APPDATA%`
2. Create a folder named `Claude`

### "Invalid JSON" error

Common issues:
- Missing comma between entries
- Trailing comma after last entry
- Mismatched brackets or quotes

Use a JSON validator: https://jsonlint.com/

### "Connection refused" or "Server unavailable"

- Check with your admin that the server is running
- Make sure you have internet access
- The server URL might have changed - ask your admin

### "npx not found"

You need Node.js installed:
1. Download from https://nodejs.org/
2. Install (choose LTS version)
3. Restart your computer
4. Try again

## Need Help?

Contact your admin with:
1. Your operating system (Mac/Windows)
2. The exact error message you're seeing
3. A screenshot of your configuration file (hide any sensitive info)

## Quick Reference

| Item | Mac Location | Windows Location |
|------|--------------|------------------|
| Config File | `~/Library/Application Support/Claude/claude_desktop_config.json` | `%APPDATA%\Claude\claude_desktop_config.json` |
| Logs | `~/Library/Logs/Claude/` | `%APPDATA%\Claude\logs\` |

## Next Steps

See [EXAMPLE_QUERIES.md](EXAMPLE_QUERIES.md) for examples of questions you can ask!
