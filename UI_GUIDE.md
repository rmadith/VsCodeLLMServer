# UI Guide - VS Code LLM Server

## Sidebar UI Overview

The VS Code LLM Server extension includes a comprehensive sidebar interface for easy server management.

## Accessing the Sidebar

1. Click the **Radio Tower icon** (📡) in the Activity Bar (left side)
2. The "LLM Server" panel will open with "Server Control" view

## UI Sections

### 1. Status

Shows current server status and configuration:

- **Running/Stopped** - Server state with color indicator
  - ✅ Green check = Running
  - 🚫 Red circle = Stopped

- **Port** - Click to change port
- **Host** - Click to change host address  
- **URL** - Click to copy server URL to clipboard

### 2. Configuration

Interactive settings with click-to-change functionality:

| Setting | Click Action | Description |
|---------|--------------|-------------|
| **Port** | Change Port | Enter new port (1-65535) |
| **Host** | Change Host | Enter new host (e.g., 127.0.0.1) |
| **Auth** | Toggle | Enable/disable authentication |
| **Rate Limit** | Change Limit | Set requests per minute (0=disabled) |
| **Log Level** | Change Level | Select: debug, info, warn, error |
| **OpenAI** | Toggle | Enable/disable OpenAI endpoints |
| **Anthropic** | Toggle | Enable/disable Anthropic endpoints |

### 3. Endpoints

Quick access to server endpoints:

- **Health Check** - Click to open in browser
- **OpenAI Chat** - Click to copy endpoint URL
- **OpenAI Models** - Click to open in browser
- **Anthropic Messages** - Click to copy endpoint URL

### 4. Actions

Quick action buttons:

- **Start Server** - Start the HTTP server (when stopped)
- **Stop Server** - Stop the HTTP server (when running)
- **Restart Server** - Restart with new configuration
- **Set API Key** - Configure authentication key
- **Open Settings** - Open VS Code settings
- **Show Logs** - View debug console

## Quick Actions

### Starting the Server

**Method 1: Sidebar**
1. Open LLM Server sidebar
2. Expand "Actions"
3. Click "Start Server"

**Method 2: Status Bar**
1. Click status bar item (bottom right)
2. Select "Start Server"

**Method 3: Command Palette**
- `Cmd+Shift+P` → "LLM Server: Start Server"

### Changing Port

**Method 1: Sidebar (Easy!)**
1. Open LLM Server sidebar
2. In "Configuration" section
3. Click "Port: 3000"
4. Enter new port number
5. Restart server

**Method 2: Settings**
1. Click gear icon in sidebar header
2. Change `vscodellmserver.port`

### Changing Host

**Method 1: Sidebar**
1. Open LLM Server sidebar
2. In "Configuration" section
3. Click "Host: 127.0.0.1"
4. Enter new host (e.g., 0.0.0.0 for network access)
5. Restart server

⚠️ **Warning**: Changing host to `0.0.0.0` exposes server on network!

### Toggle Authentication

**Sidebar**:
1. Open LLM Server sidebar
2. In "Configuration" section
3. Click "Auth: Enabled/Disabled"
4. Restart server

### Set API Key

**Method 1: Sidebar**
1. Open LLM Server sidebar
2. In "Actions" section
3. Click "Set API Key"
4. Enter your API key
5. Restart server if running

**Method 2: Status Bar**
1. Click status bar item
2. Select "Set API Key"

### Copy Endpoint URLs

**Sidebar**:
1. Open LLM Server sidebar
2. Expand "Endpoints"
3. Click any endpoint
   - Browser icon = Opens in browser
   - Other endpoints = Copies to clipboard

### Change Rate Limit

**Sidebar**:
1. Open LLM Server sidebar
2. In "Configuration" section
3. Click "Rate Limit: 60/min"
4. Enter new limit (0 to disable)
5. Restart server

### Change Log Level

**Sidebar**:
1. Open LLM Server sidebar
2. In "Configuration" section
3. Click "Log Level: info"
4. Select new level
5. Takes effect immediately (no restart needed)

### Toggle API Endpoints

**Sidebar**:
1. Open LLM Server sidebar
2. In "Configuration" section
3. Click "OpenAI: Enabled" or "Anthropic: Enabled"
4. Restart server

## Visual Indicators

### Icons

- 📡 **Radio Tower** - Main extension icon
- ✅ **Check** - Enabled/Running
- ❌ **X** - Disabled
- 🚫 **Circle Slash** - Stopped
- 🔌 **Plug** - Port configuration
- 🖥️ **Server** - Host configuration
- 🔒 **Lock** - Authentication enabled
- 🔓 **Unlock** - Authentication disabled
- 📊 **Dashboard** - Rate limit
- 📝 **Output** - Log level
- ❤️ **Heart** - Health check
- 💬 **Comment** - Chat endpoint
- 📚 **Library** - Models endpoint
- ✉️ **Mail** - Messages endpoint
- ▶️ **Play** - Start
- ⏹️ **Stop** - Stop
- 🔄 **Restart** - Restart
- 🔑 **Key** - API Key
- ⚙️ **Gear** - Settings

### Colors

- **Green** - Active/Running/Enabled
- **Red** - Stopped/Disabled
- **Default** - Neutral states

## Tips & Tricks

### Quick URL Copy

1. Open sidebar
2. Expand "Status"
3. Click "URL: http://..." 
4. URL copied to clipboard!

### Fast Configuration Changes

Instead of opening settings, just click the configuration item in the sidebar:
- Click "Port" → Change immediately
- Click "Auth" → Toggle immediately
- Click "Rate Limit" → Change immediately

### Restart Reminder

After changing most settings, you'll see:
> "Setting changed. Restart server for changes to take effect."

Click "Restart Server" in Actions to apply.

**Exception**: Log Level changes apply immediately!

### Settings Gear Icon

The gear icon in the sidebar header opens VS Code settings directly to the LLM Server section.

## Keyboard Shortcuts

While no default shortcuts are set, you can add them:

1. `Cmd+K Cmd+S` (macOS) or `Ctrl+K Ctrl+S` (Windows/Linux)
2. Search for "LLM Server"
3. Set keybindings for your favorite commands

**Suggested shortcuts**:
- Start Server: `Cmd+Shift+L S`
- Stop Server: `Cmd+Shift+L X`
- Restart Server: `Cmd+Shift+L R`

## Troubleshooting

### Sidebar Not Showing

1. Check Activity Bar for radio tower icon
2. If missing, right-click Activity Bar
3. Ensure extension is activated

### Commands Not Working

1. Check Debug Console for errors
2. Verify server state in sidebar
3. Try restarting VS Code

### Settings Not Applying

1. Make sure to restart server after changing settings
2. Check for error messages
3. Verify setting values in VS Code settings

### Tree View Not Updating

1. Click anywhere in the sidebar to refresh
2. Or change a setting (it auto-refreshes)
3. Or restart server

## Best Practices

1. **Use Sidebar for Quick Changes** - Faster than opening settings
2. **Check Status Before Testing** - Ensure server is running
3. **Copy Endpoint URLs** - Use sidebar instead of typing
4. **Watch for Restart Reminders** - Apply settings by restarting
5. **Monitor Status Indicator** - Green = good, Red = stopped

## Comparison: UI vs. Command Palette

| Task | Sidebar UI | Command Palette |
|------|-----------|----------------|
| Start Server | 1 click | Type + Enter |
| Change Port | 1 click → Enter value | Settings → Find → Change |
| Copy URL | 1 click | Manual copy |
| View Status | Always visible | Command + Check |
| Toggle Auth | 1 click | Settings → Toggle |

**Winner**: Sidebar UI for most tasks! 🏆

## Advanced: Multi-Instance Support

While running:
- Check port in Status
- Change port in Configuration
- Start another Extension Development Host
- Each can run on different port

## Feedback

The sidebar UI is designed for:
- ✅ Quick configuration changes
- ✅ Visual server status
- ✅ Easy endpoint access
- ✅ One-click actions

Enjoy the enhanced UI! 🚀

