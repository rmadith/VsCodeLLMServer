# Setup Guide

## First-Time Setup

### Prerequisites

- **VS Code** 1.85.0 or higher
- **Node.js** 20.x or higher
- **GitHub Copilot** extension installed and active

### Installation Steps

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd VsCodeLLMServer
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

## Running the Extension

### Method 1: Press F5 (Recommended)

1. Open the project folder in VS Code
2. Press `F5` (or select `Run > Start Debugging`)
3. VS Code will:
   - Run the build task automatically
   - Open a new window titled "[Extension Development Host]"
   - Load your extension in that window
4. Check the status bar (bottom right) for the server status
5. Server should start automatically on port 3000

**What you should see**:
- Status bar shows: `$(radio-tower) LLM Server :3000`
- A notification: "VS Code LLM Server running on 127.0.0.1:3000"

### Method 2: Command Line

```bash
code --extensionDevelopmentPath=$(pwd)
```

This opens a new VS Code window with the extension loaded.

### Method 3: Watch Mode (For Development)

1. Open a terminal in VS Code
2. Run: `npm run watch`
3. Press `F5` to launch Extension Development Host
4. Changes will auto-rebuild

## Troubleshooting

### "No launch configuration found"

**Problem**: Pressing F5 asks which file to run.

**Solution**: Make sure these files exist:
- `.vscode/launch.json` ✅ (created)
- `.vscode/tasks.json` ✅ (created)

If they're missing, they should have been created. Check the `.vscode/` folder.

### "Cannot find module 'vscode'"

**Problem**: TypeScript can't find the vscode module.

**Solution**: 
```bash
npm install
```

### "Port 3000 already in use"

**Problem**: Another process is using port 3000.

**Solution**:
1. Change port in settings: `vscodellmserver.port`
2. Or kill the process:
   ```bash
   lsof -ti:3000 | xargs kill -9  # macOS/Linux
   ```

### "GitHub Copilot not available"

**Problem**: Extension can't access language models.

**Solution**:
1. Install GitHub Copilot extension
2. Verify Copilot subscription is active
3. Sign in to GitHub Copilot
4. Reload VS Code window

### Extension doesn't start

**Problem**: Extension Development Host opens but extension isn't active.

**Solution**:
1. Check Debug Console for errors (View > Debug Console)
2. Look for error messages
3. Verify build succeeded: `npm run build`

## Using the Extension

### Starting the Server

The server starts automatically when the extension activates.

**Manual Control**:
1. Open Command Palette: `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
2. Type: "VS Code LLM Server"
3. Choose:
   - Start Server
   - Stop Server
   - Restart Server
   - Set API Key

### Testing the Server

1. **Health Check**:
   ```bash
   curl http://localhost:3000/health
   ```

2. **OpenAI Test**:
   ```bash
   curl http://localhost:3000/v1/chat/completions \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer test-key" \
     -d '{
       "model": "gpt-4",
       "messages": [{"role": "user", "content": "Hello!"}]
     }'
   ```

3. **Run Test Scripts**:
   ```bash
   cd tests/manual
   ./openai-curl.sh
   ```

### Setting API Key

**Method 1: Command Palette**
1. `Cmd+Shift+P` → "VS Code LLM Server: Set API Key"
2. Enter your API key
3. Key is stored securely in VS Code SecretStorage

**Method 2: Environment Variable**
```bash
export VSCODE_LLM_SERVER_API_KEY=your-key-here
```

**Method 3: Disable Authentication** (for testing)
```json
{
  "vscodellmserver.enableAuth": false
}
```

## Configuration

### Settings Location

- **User Settings**: `Cmd+,` (macOS) or `Ctrl+,` (Windows/Linux)
- **Workspace Settings**: `.vscode/settings.json`

### Common Settings

```jsonc
{
  // Server Configuration
  "vscodellmserver.port": 3000,
  "vscodellmserver.host": "127.0.0.1",
  
  // Features
  "vscodellmserver.enableAuth": true,
  "vscodellmserver.enableOpenAI": true,
  "vscodellmserver.enableAnthropic": true,
  
  // Limits
  "vscodellmserver.rateLimit": 60,  // requests per minute
  
  // Security
  "vscodellmserver.corsOrigins": ["http://localhost:*"],
  
  // Debugging
  "vscodellmserver.logLevel": "debug"  // debug, info, warn, error
}
```

## Development Workflow

### Making Changes

1. Make changes to TypeScript files
2. Build: `npm run build` (or use watch mode)
3. Restart Extension Development Host:
   - Stop with `Shift+F5`
   - Start again with `F5`
   - Or use "Restart" button in debug toolbar

### Viewing Logs

**Method 1: Debug Console**
- View > Debug Console
- Shows all `console.log`, `logger.info`, etc.

**Method 2: Extension Host Output**
- View > Output
- Select "Extension Host" from dropdown

### Debugging

1. Set breakpoints in TypeScript files
2. Press `F5` to start debugging
3. Trigger the code path
4. Inspect variables, step through code

**Debug Toolbar** (appears when debugging):
- Continue (F5)
- Step Over (F10)
- Step Into (F11)
- Step Out (Shift+F11)
- Restart (Ctrl+Shift+F5)
- Stop (Shift+F5)

## Next Steps

1. **Read the documentation**:
   - [README.md](README.md) - User guide
   - [AGENTS.md](AGENTS.md) - Developer guide
   - [PRIVACY.md](PRIVACY.md) - Privacy policy

2. **Try the examples**:
   - `tests/manual/openai-curl.sh` - OpenAI tests
   - `tests/manual/anthropic-curl.sh` - Anthropic tests
   - `tests/manual/langchain-test.py` - LangChain integration

3. **Integrate with your tools**:
   - Use with LangChain, AutoGen, or any OpenAI-compatible client
   - Set base URL to `http://localhost:3000/v1`
   - Use your configured API key

## Getting Help

- Check [README.md](README.md) troubleshooting section
- Review [AGENTS.md](AGENTS.md) for development details
- Open an issue on GitHub

## Quick Reference

| Action | Shortcut/Command |
|--------|------------------|
| Start debugging | `F5` |
| Stop debugging | `Shift+F5` |
| Restart | `Ctrl+Shift+F5` (macOS: `Cmd+Shift+F5`) |
| Command Palette | `Ctrl+Shift+P` (macOS: `Cmd+Shift+P`) |
| Build | `npm run build` |
| Watch | `npm run watch` |
| Lint | `npm run lint` |

---

**Ready to go!** Press `F5` and start using your VS Code LLM Server! 🚀

