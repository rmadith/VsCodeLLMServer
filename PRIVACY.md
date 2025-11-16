# Privacy Policy

## VS Code LLM Server - Data Handling and Privacy

**Last Updated**: November 16, 2025

This document describes how the VS Code LLM Server extension handles data.

## Data Collection

### What Data Is Collected

The extension collects **minimal data** necessary for operation:

1. **API Requests**: Request content (prompts, messages, parameters) are temporarily processed
2. **Configuration**: User-configured settings from VS Code
3. **Logs**: Operational logs (see Logging section below)

### What Data Is NOT Collected

- No telemetry or analytics data
- No usage statistics
- No personal information beyond what's in your requests
- No persistent storage of prompts or responses

## Data Processing

### Request Flow

1. External client sends request to local HTTP server
2. Extension validates and transforms request
3. Request forwarded to VS Code Language Model API (GitHub Copilot)
4. Response returned to client
5. **No data is retained after response is sent**

### Data Storage

#### What Is Stored

- **API Key**: Stored securely in VS Code SecretStorage
  - Encrypted by VS Code
  - Never written to logs or files
  - Never transmitted except in authorization headers

- **Configuration Settings**: Stored in VS Code settings
  - Standard VS Code settings storage
  - Synced if VS Code Settings Sync is enabled

#### What Is NOT Stored

- Prompts and messages
- Responses from the language model
- Request/response history
- User conversations
- Any content sent through the API

## Data Transmission

### Local Operation

By default, the server binds to `127.0.0.1` (localhost):
- Only accessible from your local machine
- No network exposure
- No data leaves your computer except to GitHub Copilot

### Network Configuration

If you configure a different host:
- ⚠️ Data may be accessible on your network
- Consider security implications
- Use appropriate firewall rules
- Enable authentication

### Third-Party Services

Data is transmitted to:
- **GitHub Copilot**: Via VS Code Language Model API
  - Subject to [GitHub Terms](https://github.com/terms)
  - Subject to [GitHub Privacy](https://github.com/privacy)
  - Review GitHub Copilot's data handling policies

## Logging

### What Is Logged

Operational logs include:
- Request IDs (random UUIDs)
- HTTP method and path
- Response status codes
- Error messages
- Performance metrics (token counts, timing)

### What Is NOT Logged

- API keys or authentication tokens
- Request content (prompts, messages)
- Response content
- User data
- Personal information

### Log Levels

- **Error**: Only errors and critical issues
- **Warn**: Warnings and errors
- **Info**: Normal operations, errors, and warnings (default)
- **Debug**: Detailed debugging information

Configure via: `vscodellmserver.logLevel`

### Log Location

Logs are output to:
- VS Code Debug Console
- Extension Host process output
- Not written to files by default

## Security Measures

### API Key Security

- Stored in VS Code SecretStorage (encrypted)
- Never logged
- Never included in error messages
- Support for environment variables

### Authentication

- Optional API key authentication
- Bearer token (OpenAI format)
- x-api-key header (Anthropic format)
- Disable for local development if needed

### Rate Limiting

- Configurable requests per minute
- Per-IP and per-API-key tracking
- Prevents abuse

### Input Validation

- All requests validated
- Parameter range checking
- Sanitized inputs
- Proper error handling

### Network Security

- CORS configuration
- Security headers (Helmet.js)
- Request size limits
- No directory traversal

## Compliance

### GDPR Considerations

This extension:
- Processes data temporarily (no storage)
- No persistent personal data
- No cookies or tracking
- User has full control

Note: GitHub Copilot has its own data handling policies.

### Data Subject Rights

Since no data is persisted by this extension:
- No data to access
- No data to delete
- No data to export
- No data retention

For data processed by GitHub Copilot, refer to GitHub's policies.

## User Control

### What You Can Control

1. **API Access**: Enable/disable authentication
2. **Network Exposure**: Configure host and port
3. **Logging**: Adjust log level
4. **CORS**: Configure allowed origins
5. **Rate Limits**: Set request limits
6. **API Endpoints**: Enable/disable OpenAI or Anthropic endpoints

### Disabling Features

```json
{
  "vscodellmserver.enableAuth": false,
  "vscodellmserver.enableOpenAI": false,
  "vscodellmserver.enableAnthropic": false,
  "vscodellmserver.logLevel": "error"
}
```

### Uninstallation

When you uninstall the extension:
- API key is removed from SecretStorage
- Settings remain in VS Code settings (can be manually removed)
- No residual data

## Third-Party Dependencies

The extension uses these npm packages:
- `express` - HTTP server
- `cors` - CORS handling
- `helmet` - Security headers
- `express-rate-limit` - Rate limiting
- `uuid` - Random ID generation

These packages may have their own privacy considerations. Review their documentation for details.

## Changes to This Policy

We may update this privacy policy. Changes will be reflected in:
- This document's "Last Updated" date
- Extension changelog
- GitHub repository

## Contact

For privacy questions or concerns:
- Open an issue on GitHub
- Review the source code (open source)
- Contact the maintainers

## Recommendations

### For Personal Use

- Keep default configuration (localhost binding)
- Enable authentication
- Use strong API keys
- Monitor logs regularly

### For Team Use

- Use firewall rules
- Enable authentication
- Configure appropriate rate limits
- Review CORS settings
- Use secure API key distribution

### For Production

⚠️ **This extension is designed for development and personal use.**

For production deployments:
- Review all security settings
- Use proper network isolation
- Implement additional security layers
- Monitor access logs
- Consider legal and compliance requirements

## Transparency

This extension is open source:
- Review the code on GitHub
- Verify data handling claims
- Submit security issues
- Contribute improvements

We are committed to transparency and user privacy.

