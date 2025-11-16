# VS Code LLM Server

Expose VS Code's GitHub Copilot as an OpenAI and Anthropic-compatible API server.

## Overview

VS Code LLM Server is a Visual Studio Code extension that runs an HTTP server exposing GitHub Copilot through OpenAI and Anthropic-compatible API endpoints. This allows you to use Copilot with any tool or agent that supports these standard APIs.

### Features

- ✅ **OpenAI-Compatible API** - `/v1/chat/completions` and `/v1/completions`
- ✅ **Anthropic-Compatible API** - `/v1/messages`
- ✅ **Streaming Support** - Server-Sent Events (SSE) for both APIs
- ✅ **Authentication** - Optional API key authentication
- ✅ **Rate Limiting** - Configurable request limits
- ✅ **Model Selection** - Use any available VS Code Language Model
- ✅ **Status Bar Integration** - Easy server control from VS Code
- ✅ **Type Safe** - Full TypeScript implementation

## Installation

### From Source

1. Clone this repository
2. Run `npm install`
3. Run `npm run build`
4. Press `F5` in VS Code to launch Extension Development Host
   - First time: VS Code will run the build task automatically
   - A new VS Code window will open with "[Extension Development Host]" in the title
   - The extension will be active in that window

### From VSIX (Coming Soon)

Install the `.vsix` file using VS Code's Extensions panel.

## Quick Start

1. **Install the Extension**
2. **Ensure GitHub Copilot is Active** in VS Code
3. **Open the Sidebar**:
   - Click the **Radio Tower icon** (📡) in the Activity Bar (left side)
   - The LLM Server control panel will open
4. **Start the Server**:
   - Click "Start Server" in the sidebar Actions section
   - Or use status bar item (bottom right): `$(radio-tower) LLM Server`
   - Or use Command Palette: `LLM Server: Start Server`
5. **Configure Settings** (optional):
   - Click any setting in the sidebar to change it (Port, Host, Auth, etc.)
   - Or use Command Palette: `LLM Server: Set API Key`
   - Or set environment variable: `VSCODE_LLM_SERVER_API_KEY`
6. **Use the API**:
   ```bash
   curl http://localhost:3000/v1/chat/completions \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -d '{
       "model": "gpt-4",
       "messages": [{"role": "user", "content": "Hello!"}]
     }'
   ```

## Configuration

Access settings via `Preferences > Settings > VS Code LLM Server`

### Available Settings

```jsonc
{
  // Server port (default: 3000)
  "vscodellmserver.port": 3000,
  
  // Server host (default: 127.0.0.1)
  "vscodellmserver.host": "127.0.0.1",
  
  // Enable API key authentication (default: true)
  "vscodellmserver.enableAuth": true,
  
  // Enable OpenAI-compatible endpoints (default: true)
  "vscodellmserver.enableOpenAI": true,
  
  // Enable Anthropic-compatible endpoints (default: true)
  "vscodellmserver.enableAnthropic": true,
  
  // Rate limit: requests per minute (0 to disable, default: 60)
  "vscodellmserver.rateLimit": 60,
  
  // CORS allowed origins (default: ["http://localhost:*"])
  "vscodellmserver.corsOrigins": ["http://localhost:*"],
  
  // Log level (default: "info")
  "vscodellmserver.logLevel": "info",
  
  // VS Code Language Model selector
  "vscodellmserver.modelSelector": {
    "vendor": "copilot",
    "family": "gpt-4"
  }
}
```

### Environment Variables

- `VSCODE_LLM_SERVER_API_KEY` - Override API key
- `VSCODE_LLM_SERVER_PORT` - Override port
- `VSCODE_LLM_SERVER_HOST` - Override host

## API Usage

### OpenAI-Compatible Endpoints

#### Chat Completions

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "What is TypeScript?"}
    ],
    "temperature": 0.7,
    "max_tokens": 500,
    "stream": false
  }'
```

#### Streaming

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Count to 5"}],
    "stream": true
  }'
```

#### List Models

```bash
curl http://localhost:3000/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Anthropic-Compatible Endpoints

#### Messages

```bash
curl http://localhost:3000/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3",
    "messages": [
      {"role": "user", "content": "Hello, Claude!"}
    ],
    "max_tokens": 1024,
    "stream": false
  }'
```

#### Streaming

```bash
curl http://localhost:3000/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3",
    "messages": [{"role": "user", "content": "Count to 5"}],
    "max_tokens": 1024,
    "stream": true
  }'
```

### Integration Examples

#### Python with OpenAI SDK

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="your-api-key"
)

response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)

print(response.choices[0].message.content)
```

#### LangChain

```python
from langchain.chat_models import ChatOpenAI

llm = ChatOpenAI(
    openai_api_base="http://localhost:3000/v1",
    openai_api_key="your-api-key",
    model="gpt-4"
)

response = llm.predict("What is machine learning?")
print(response)
```

#### Anthropic SDK

```python
from anthropic import Anthropic

client = Anthropic(
    base_url="http://localhost:3000",
    api_key="your-api-key"
)

message = client.messages.create(
    model="claude-3",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Hello, Claude!"}
    ]
)

print(message.content[0].text)
```

## UI Features

### Sidebar Control Panel

Click the **Radio Tower icon** (📡) in the Activity Bar to open the control panel:

**Status Section**:
- Server state (Running/Stopped)
- Current port and host
- Click to copy server URL

**Configuration Section** (click to change):
- Port, Host, Authentication
- Rate Limit, Log Level
- Enable/Disable OpenAI or Anthropic endpoints

**Endpoints Section**:
- Quick links to health check
- Copy endpoint URLs to clipboard

**Actions Section**:
- Start, Stop, Restart server
- Set API Key
- Open Settings
- Show Logs

See [UI_GUIDE.md](UI_GUIDE.md) for detailed UI documentation.

## Commands

Access via Command Palette (`Cmd+Shift+P` or `Ctrl+Shift+P`):

- `LLM Server: Start Server` - Start the HTTP server
- `LLM Server: Stop Server` - Stop the HTTP server
- `LLM Server: Restart Server` - Restart the HTTP server
- `LLM Server: Set API Key` - Configure authentication key
- `LLM Server: Change Port` - Change server port
- `LLM Server: Change Host` - Change server host
- `LLM Server: Toggle Authentication` - Enable/disable auth
- `LLM Server: Show Logs` - View server logs
- `LLM Server: Open Settings` - Open extension settings

## Troubleshooting

### Server Won't Start

**Check Port Availability**:
```bash
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows
```

**Change Port**:
```json
{
  "vscodellmserver.port": 3001
}
```

### GitHub Copilot Not Available

1. Ensure GitHub Copilot extension is installed
2. Verify Copilot subscription is active
3. Check VS Code LM API access

### Authentication Issues

**Disable Authentication** (for testing):
```json
{
  "vscodellmserver.enableAuth": false
}
```

**Set API Key**:
- Command Palette: `VS Code LLM Server: Set API Key`
- Or environment variable: `export VSCODE_LLM_SERVER_API_KEY=your-key`

### Streaming Not Working

- Ensure client supports Server-Sent Events (SSE)
- Check for proxies that buffer responses
- Verify `stream: true` in request body

## Security Considerations

⚠️ **Important Security Notes**:

1. **Local Use Only**: Default configuration binds to `127.0.0.1` (localhost)
2. **API Keys**: Store securely, never commit to version control
3. **Network Exposure**: Do not expose to public internet without proper security
4. **Rate Limiting**: Configure appropriate limits for your use case
5. **CORS**: Restrict origins to trusted domains only

## Privacy

See [PRIVACY.md](PRIVACY.md) for detailed information about data handling.

**Summary**:
- No data is stored by this extension
- Requests are forwarded to GitHub Copilot
- API keys are stored in VS Code SecretStorage
- Logs do not contain sensitive information

## Limitations

- **Function Calling**: Not yet supported (planned)
- **Image Inputs**: Not supported by VS Code LM API
- **Multiple Completions**: Only `n=1` is supported
- **Some Parameters**: frequency_penalty, presence_penalty, logprobs not supported

## Roadmap

See [TODO_ADVANCED_FEATURES.md](TODO_ADVANCED_FEATURES.md) for planned enhancements:

- Function calling support
- Embeddings endpoint
- Fine-tuning endpoints
- WebSocket support
- Caching layer
- Advanced model routing

## Contributing

Contributions are welcome! Please see [AGENTS.md](AGENTS.md) for development guidelines.

## License

MIT License - See [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built on VS Code's Language Model API
- Inspired by Roo Code's implementation pattern
- Compatible with OpenAI and Anthropic API specifications

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/vscode-llm-server/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/vscode-llm-server/discussions)
- **Documentation**: See [AGENTS.md](AGENTS.md) for detailed information
