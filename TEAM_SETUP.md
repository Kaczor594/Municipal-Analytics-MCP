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

## Step 2: Install Node.js

The MCP connection requires Node.js. If you don't have it installed:

1. Download from https://nodejs.org/ (choose the **LTS** version)
2. Run the installer with default settings
3. **Restart your computer** after installing

To verify it installed correctly, open Terminal (Mac) or PowerShell (Windows) and type:
```
node --version
```
You should see a version number like `v22.x.x`.

## Step 3: Create the Configuration File

This step creates the config file that tells Claude Desktop how to connect to the databases. You will copy and paste a single command into Terminal (Mac) or PowerShell (Windows). The command creates the file in the correct location automatically — you do not need to navigate to any folders.

### Mac:

1. Open **Terminal** (press `Cmd + Space`, type "Terminal", press Enter)
2. Copy this entire command and paste it into Terminal:

```bash
mkdir -p ~/Library/Application\ Support/Claude/ && echo '{
  "mcpServers": {
    "municipal-analytics": {
      "command": "npx",
      "args": ["-y", "mcp-remote@latest", "--endpoint", "https://municipal-analytics-mcp.isaac-kaczor.workers.dev/sse"]
    }
  }
}' > ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

3. Press **Enter** (you won't see any output — that's normal, it means it worked)

### Windows:

1. Open **PowerShell** (press the Windows key, type "PowerShell", click **Windows PowerShell**)
2. Copy this entire command and paste it into PowerShell:

```powershell
$configDir = "$env:APPDATA\Claude"; if (!(Test-Path $configDir)) { New-Item -ItemType Directory -Path $configDir -Force | Out-Null }; @'
{
  "mcpServers": {
    "municipal-analytics": {
      "command": "npx",
      "args": ["-y", "mcp-remote@latest", "--endpoint", "https://municipal-analytics-mcp.isaac-kaczor.workers.dev/sse"]
    }
  }
}
'@ | Set-Content "$configDir\claude_desktop_config.json" -Encoding UTF8
```

3. Press **Enter** (you won't see any output — that's normal, it means it worked)

## Step 4: Restart Claude Desktop

1. **Completely quit** Claude Desktop (not just close the window):
   - **Mac:** Press `Cmd + Q` or right-click the dock icon and choose Quit
   - **Windows:** Right-click the Claude icon in the system tray (bottom-right corner of taskbar) and choose **Exit**
2. **Reopen** Claude Desktop

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

### "Config file won't save" or incorrect file format

Re-run the Terminal/PowerShell command from Step 3 above. This will overwrite any broken config file with the correct one.

### "Connection refused" or "Server unavailable"

- Make sure you have internet access
- Check with your admin that the server is running

### "Server disconnected" error

1. Verify Node.js is installed: open Terminal (Mac) or PowerShell (Windows) and run `npm --version`
2. If npm is not found, go back to Step 2 and install Node.js
3. Try clearing the npm cache:
   - **Mac:** `npm cache clean --force`
   - **Windows:** `npm cache clean --force`
4. Restart Claude Desktop completely

### "npx not found"

Node.js is not installed. Go back to Step 2 and install it. Make sure to **restart your computer** after installing.

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
