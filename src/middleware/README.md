# Middleware Module

This directory contains Express middleware for authentication, validation, rate limiting, and error handling.

## Middleware Chain

Middleware is applied in this order in `src/extension/server.ts`:

1. **Helmet** - Security headers
2. **CORS** - Cross-origin resource sharing
3. **Body Parser** - Parse JSON bodies
4. **Request ID** - Generate unique request IDs
5. **Logging** - Log requests and responses
6. **Authentication** - Validate API keys
7. **Rate Limiting** - Enforce rate limits
8. **Validation** - Validate request bodies (route-specific)
9. **Routes** - Handle requests
10. **404 Handler** - Not found errors
11. **Error Handler** - Global error handling

## Files

### `auth.ts`

API key authentication middleware.

**Function: `createAuthMiddleware(config)`**

Creates authentication middleware.

**Configuration**:
```typescript
interface AuthConfig {
  enableAuth: boolean;
  apiKey?: string;
}
```

**Behavior**:
- Skips if `enableAuth` is false
- Skips for `/health` endpoint
- Checks for API key in headers:
  - OpenAI: `Authorization: Bearer <key>`
  - Anthropic: `x-api-key: <key>`
- Returns 401 if key is missing or invalid
- Formats errors per API standard

**Usage**:
```typescript
app.use(createAuthMiddleware({
  enableAuth: true,
  apiKey: 'secret-key'
}));
```

### `rateLimit.ts`

Rate limiting middleware using `express-rate-limit`.

**Function: `createRateLimitMiddleware(config)`**

Creates rate limiting middleware.

**Configuration**:
```typescript
interface RateLimitConfig {
  rateLimit: number; // requests per minute, 0 to disable
}
```

**Features**:
- Window: 1 minute
- Per-IP and per-API-key tracking
- Standard rate limit headers
- Skips `/health` endpoint
- Custom error format per API

**Key Generator**:
- Uses API key if present (more accurate)
- Falls back to IP address
- Format: `key:<apikey>` or IP address

**Usage**:
```typescript
app.use(createRateLimitMiddleware({
  rateLimit: 60 // 60 requests per minute
}));
```

### `validator.ts`

Request validation middleware.

**Functions**:

**`validateOpenAIRequest(req, res, next)`**

Validates OpenAI chat completion requests.

**Checks**:
- `messages` - required array, non-empty
- `model` - required string
- `temperature` - optional, 0-2
- `max_tokens` - optional, positive number
- `top_p` - optional, 0-1
- `n` - optional, positive (warns if > 1)

**`validateAnthropicRequest(req, res, next)`**

Validates Anthropic messages requests.

**Checks**:
- `model` - required string
- `messages` - required array, non-empty
- `max_tokens` - required, 1-4096
- `temperature` - optional, 0-1
- `top_p` - optional, 0-1
- `top_k` - optional, 0-500

**Error Response**:
Returns 400 with descriptive errors in API-appropriate format.

**Usage**:
```typescript
app.post('/v1/chat/completions', validateOpenAIRequest, handler);
app.post('/v1/messages', validateAnthropicRequest, handler);
```

### `errorHandler.ts`

Global error handling middleware.

**Functions**:

**`errorHandler(err, req, res, next)`**

Global error handler (must be last middleware).

**Features**:
- Maps errors to HTTP status codes
- Formats errors per API standard
- Logs errors with context
- Never exposes stack traces
- Handles streaming errors (checks `res.headersSent`)

**Status Code Mapping**:
- 400: Invalid/validation errors
- 401: Unauthorized/authentication errors
- 403: Forbidden errors
- 404: Not found errors
- 429: Rate limit errors
- 499: Client cancelled
- 500: Server errors
- 503: Service unavailable/timeout

**`notFoundHandler(req, res)`**

Handles 404 errors for undefined routes.

**Usage**:
```typescript
// Add routes first
app.post('/v1/chat/completions', handler);

// Then 404 handler
app.use(notFoundHandler);

// Finally error handler (must be last)
app.use(errorHandler);
```

## Adding New Middleware

1. **Create File** (e.g., `src/middleware/custom.ts`):
   ```typescript
   import { Request, Response, NextFunction } from 'express';

   export function customMiddleware(config: CustomConfig) {
     return (req: Request, res: Response, next: NextFunction): void => {
       // Middleware logic
       next();
     };
   }
   ```

2. **Add to Server** (`src/extension/server.ts`):
   ```typescript
   this.app.use(customMiddleware(config));
   ```

3. **Add Tests**

4. **Document Behavior**

## Middleware Best Practices

### Order Matters

Middleware executes in order:
- Security headers first
- Parsing before validation
- Authentication before routes
- Validation before handlers
- Error handler last

### Calling next()

- Call `next()` to pass to next middleware
- Call `next(error)` to jump to error handler
- Don't call `next()` after sending response

### Error Handling

Use try-catch in async middleware:
```typescript
export function asyncMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Async logic
      next();
    } catch (error) {
      next(error);
    }
  };
}
```

### Skipping Middleware

Skip conditionally:
```typescript
if (shouldSkip(req)) {
  next();
  return;
}
```

### Configuration

Make middleware configurable:
```typescript
export function configurableMiddleware(config: Config) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (config.enabled) {
      // Logic
    }
    next();
  };
}
```

### Logging

Log important events:
```typescript
logger.info('Middleware action', {
  requestId: req.headers['x-request-id'],
  // Context
});
```

### Performance

- Keep middleware fast
- Avoid heavy computations
- Use async operations carefully
- Don't block the event loop

## Testing Middleware

### Unit Tests

Test middleware in isolation:
```typescript
test('authenticates valid API key', () => {
  const middleware = createAuthMiddleware({ enableAuth: true, apiKey: 'test' });
  const req = { headers: { authorization: 'Bearer test' } };
  const res = {};
  const next = jest.fn();

  middleware(req, res, next);
  
  expect(next).toHaveBeenCalledWith(); // No error
});
```

### Integration Tests

Test middleware chain:
```typescript
test('handles request through full chain', async () => {
  const response = await request(app)
    .post('/v1/chat/completions')
    .set('Authorization', 'Bearer test')
    .send({ model: 'gpt-4', messages: [] });

  expect(response.status).toBe(400); // Validation error
});
```

## Common Issues

### Middleware Not Running

- Check order in server setup
- Verify middleware is registered
- Check for early responses

### Headers Already Sent

- Don't call `res.send()` multiple times
- Check for response in middleware
- Use `res.headersSent` before sending

### Rate Limit Not Working

- Verify rate limit > 0
- Check key generator logic
- Verify IP address extraction

### Authentication Bypassed

- Check middleware order
- Verify authentication is enabled
- Check for skipped routes

