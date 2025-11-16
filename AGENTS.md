# AGENTS.md

## Project Overview

**VS Code LLM Server** is a Visual Studio Code extension that exposes GitHub Copilot's Language Model API as an OpenAI and Anthropic-compatible HTTP server. This allows external tools, agents, and applications to use GitHub Copilot without direct VS Code integration.

### Architecture

```
External Agent → HTTP API (OpenAI/Anthropic) → VS Code Extension → vscode.lm API → GitHub Copilot
```

The extension acts as a bridge, translating standard LLM API requests into VS Code's Language Model API calls.

## Project Structure

```
/src
  /extension
    extension.ts          # Extension activation & lifecycle
    server.ts            # HTTP server with Express.js
  /handlers
    vsCodeLmHandler.ts   # VS Code LM API adapter
    openaiHandler.ts     # OpenAI format converter
    anthropicHandler.ts  # Anthropic format converter
  /models
    types.ts            # Shared TypeScript interfaces
    openaiTypes.ts      # OpenAI API types
    anthropicTypes.ts   # Anthropic API types
  /middleware
    auth.ts             # API key authentication
    errorHandler.ts     # Error response formatting
    rateLimit.ts        # Rate limiting
    validator.ts        # Request validation
  /utils
    logger.ts           # Structured logging
    config.ts           # Configuration management
    streaming.ts        # SSE streaming utilities
```

## Development Guidelines

### Build and Test Commands

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Watch mode for development
npm run watch

# Lint code
npm run lint

# Package extension
vsce package
```

### Running Locally

1. Open the project in VS Code
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Press `F5` to launch Extension Development Host
   - First time: VS Code will run the build task automatically
   - A new VS Code window will open with the extension loaded
5. Check status bar for server status (bottom right)
6. Use Command Palette (`Cmd+Shift+P`) to control server
7. For development: Use `npm run watch` in terminal for auto-rebuild

**Debug Configuration**: See `.vscode/launch.json` for debug settings

### Code Style Guidelines

1. **TypeScript**: Use strict mode, leverage type safety
2. **Async/Await**: Use consistent async patterns, no callbacks
3. **Error Handling**: Try-catch at every async boundary
4. **Logging**: Use structured logging with context, never log sensitive data
5. **Documentation**: JSDoc for all public APIs
6. **Naming**: 
   - Files: camelCase (e.g., `openaiHandler.ts`)
   - Classes: PascalCase (e.g., `LLMServer`)
   - Functions: camelCase (e.g., `handleChatCompletion`)
   - Constants: UPPER_SNAKE_CASE (e.g., `MAX_TOKENS`)

### Testing Instructions

#### Unit Testing
Test individual components in isolation:
- Format converters (OpenAI ↔ vscode.lm ↔ Anthropic)
- Validation logic
- Token counting
- Error formatting

#### Integration Testing
Test full request flows with mocked vscode.lm:
- Request → Middleware → Handler → Response
- Streaming behavior
- Authentication
- Error handling

#### Manual Testing
Use curl commands or test scripts in `tests/manual/`:
- `openai-curl.sh` - OpenAI endpoint tests
- `anthropic-curl.sh` - Anthropic endpoint tests
- Test with real agents (LangChain, AutoGen, etc.)

### Adding New Features

#### Adding a New API Provider

1. Create types in `src/models/` (e.g., `geminiTypes.ts`)
2. Create handler in `src/handlers/` (e.g., `geminiHandler.ts`)
3. Implement conversion to/from vscode.lm format
4. Add routes in `src/extension/server.ts`
5. Add configuration options in `package.json`
6. Update documentation

#### Adding Middleware

1. Create file in `src/middleware/`
2. Export middleware function
3. Register in `src/extension/server.ts` middleware chain
4. Add configuration if needed
5. Add tests

### Security Considerations

1. **API Keys**: 
   - Store in VS Code SecretStorage, never in settings
   - Support environment variables for CI/CD
   - Never log API keys

2. **Input Validation**:
   - Validate all request parameters
   - Sanitize inputs
   - Check parameter ranges

3. **Rate Limiting**:
   - Implement per-IP and per-API-key rate limiting
   - Configurable limits
   - Proper error responses

4. **Error Messages**:
   - Never expose internal stack traces
   - Provide helpful but not revealing errors
   - Log full details internally

5. **CORS**:
   - Configure allowed origins
   - Default to localhost only
   - Warn about security implications

### API Compliance

#### OpenAI Compatibility

**Supported Endpoints**:
- `POST /v1/chat/completions` - Chat completions
- `POST /v1/completions` - Legacy text completions
- `GET /v1/models` - List models
- `GET /v1/models/{model}` - Get model info

**Supported Parameters**:
- `messages`, `model`, `temperature`, `max_tokens`, `top_p`, `stop`, `stream`, `n` (n=1 only), `user`, `response_format`

**Unsupported** (logged with warnings):
- `frequency_penalty`, `presence_penalty`, `logprobs`, `top_logprobs`, `seed`
- Function calling (future enhancement)

#### Anthropic Compatibility

**Supported Endpoints**:
- `POST /v1/messages` - Messages API

**Required Headers**:
- `x-api-key` - Authentication
- `anthropic-version` - API version (default: "2023-06-01")

**Supported Parameters**:
- `model`, `messages`, `system`, `max_tokens`, `temperature`, `top_p`, `top_k`, `stop_sequences`, `stream`, `metadata`

### Deployment

#### Local Development
- Extension runs in VS Code
- Server binds to localhost by default
- Use for testing and personal use

#### Production Considerations
- **Not recommended** for public internet exposure
- Designed for local or trusted network use
- Consider firewall rules
- Monitor rate limits
- Review logs regularly

### Troubleshooting

#### Server Won't Start
- Check port availability (default 3000)
- Verify VS Code LM API access
- Check for GitHub Copilot activation
- Review extension logs

#### Authentication Errors
- Verify API key is set
- Check authentication is enabled in settings
- Ensure correct header format (Bearer vs x-api-key)

#### Model Not Available
- Ensure GitHub Copilot is active
- Check model selector configuration
- Verify VS Code LM API access

#### Streaming Issues
- Check client supports Server-Sent Events
- Verify Content-Type headers
- Check for proxy/buffering issues

### Contributing

1. **Code Changes**:
   - Follow existing patterns
   - Add tests for new features
   - Update documentation
   - No hacks or workarounds

2. **Commit Messages**:
   - Use conventional commits format
   - Be descriptive and clear
   - Reference issues when applicable

3. **Pull Requests**:
   - Describe changes thoroughly
   - Include test results
   - Update CHANGELOG.md

### Resources

- [VS Code LM API Documentation](https://code.visualstudio.com/api/extension-guides/language-model)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Anthropic API Reference](https://docs.anthropic.com/claude/reference)
- [Express.js Documentation](https://expressjs.com/)

### License

MIT License - See LICENSE file for details

### Support

For issues and questions:
1. Check documentation first
2. Review existing GitHub issues
3. Create new issue with:
   - VS Code version
   - Extension version
   - Logs (sanitized)
   - Steps to reproduce

