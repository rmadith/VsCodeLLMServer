# Extension Module

This directory contains the main extension entry point and HTTP server implementation.

## Files

### `extension.ts`

Main extension entry point that handles VS Code extension lifecycle.

**Responsibilities**:
- Extension activation and deactivation
- Server lifecycle management
- Command registration
- Status bar UI
- Configuration management
- Error handling and user notifications

**Key Functions**:
- `activate(context)` - Called when extension is activated
- `deactivate()` - Called when extension is deactivated
- `registerCommands(context)` - Registers VS Code commands
- `updateStatusBar(isRunning, port)` - Updates status bar display

**Commands Registered**:
- `vscodellmserver.start` - Start the HTTP server
- `vscodellmserver.stop` - Stop the HTTP server
- `vscodellmserver.restart` - Restart the HTTP server
- `vscodellmserver.setApiKey` - Set API key for authentication
- `vscodellmserver.showMenu` - Show quick pick menu
- `vscodellmserver.showLogs` - Show logs

### `server.ts`

HTTP server implementation using Express.js.

**Responsibilities**:
- HTTP server setup and management
- Middleware configuration
- Route definition and handling
- Request/response processing
- Error handling

**Class: LLMServer**

Main server class that implements `vscode.Disposable`.

**Constructor**:
```typescript
constructor(
  handler: VsCodeLmHandler,
  config: ServerConfig,
  context: vscode.ExtensionContext,
  apiKey?: string
)
```

**Methods**:
- `start()` - Start the HTTP server
- `stop()` - Stop the HTTP server
- `restart()` - Restart the HTTP server
- `isRunning()` - Check if server is running
- `dispose()` - Clean up resources

**Middleware Stack**:
1. Helmet (security headers)
2. CORS
3. Body parser
4. Request ID generation
5. Logging
6. Authentication
7. Rate limiting

**Routes**:
- `GET /health` - Health check
- `GET /v1/models` - List models
- `GET /v1/models/:model` - Get model info
- `POST /v1/chat/completions` - OpenAI chat completions
- `POST /v1/completions` - OpenAI legacy completions
- `POST /v1/messages` - Anthropic messages

## Configuration

Server reads configuration from:
- VS Code settings (`vscodellmserver.*`)
- Environment variables
- VS Code SecretStorage (for API key)

See `src/utils/config.ts` for configuration management.

## Error Handling

Errors are handled at multiple levels:
1. Route-level try-catch
2. Express error middleware
3. Global error handler

Errors are:
- Logged with context
- Formatted per API standard (OpenAI vs Anthropic)
- Returned with appropriate HTTP status codes
- Never expose internal details

## Status Bar

Status bar item shows:
- Server running status
- Port number
- Quick access to commands

**States**:
- Running: `$(radio-tower) LLM Server :3000`
- Stopped: `$(radio-tower) LLM Server` (warning background)

## Lifecycle

1. **Activation**:
   - Load configuration
   - Validate settings
   - Get/prompt for API key
   - Initialize VsCodeLmHandler
   - Create LLMServer instance
   - Start server
   - Update status bar
   - Register commands

2. **Runtime**:
   - Handle HTTP requests
   - Process commands
   - Watch for configuration changes

3. **Deactivation**:
   - Stop server
   - Dispose handler
   - Clean up resources

## Development

### Testing

Test the extension:
1. Press `F5` to launch Extension Development Host
2. Server should start automatically
3. Check status bar for status
4. Test with curl or API client

### Debugging

- Use VS Code debugger
- Check Debug Console for logs
- Set breakpoints in `extension.ts` or `server.ts`
- Inspect variables during request handling

### Common Issues

**Port Already in Use**:
- Change port in settings
- Kill process using the port
- Use different port via environment variable

**Server Won't Start**:
- Check VS Code LM API availability
- Verify GitHub Copilot is active
- Review extension logs
- Check for configuration errors

**Commands Not Working**:
- Ensure extension is activated
- Check for command registration errors
- Verify VS Code version compatibility

