# TODO: Advanced Features

This document tracks advanced features and enhancements planned for future releases.

## High Priority

---

### Embeddings Endpoint

**Status**: Not Implemented  
**Complexity**: Medium  
**Value**: Medium

**Description**:
Add OpenAI-compatible embeddings endpoint for vector representations.

**Endpoints**:
- `POST /v1/embeddings`

**Requirements**:
- Check if VS Code LM API supports embeddings
- If not, consider alternative implementations
- Support batch processing
- Return standard OpenAI format

**Implementation Tasks**:
- [ ] Research VS Code LM embeddings support
- [ ] Design embeddings conversion flow
- [ ] Implement endpoint
- [ ] Add batch processing
- [ ] Add tests
- [ ] Document usage

---

### Streaming Improvements

**Status**: Partial  
**Complexity**: Medium  
**Value**: Medium

**Description**:
Enhance streaming support with additional features.

**Features**:
- Server-side event filtering
- Compression support
- Reconnection handling
- Progress indicators
- Chunk size optimization

**Implementation Tasks**:
- [ ] Add event filtering options
- [ ] Implement compression (gzip)
- [ ] Add reconnection headers
- [ ] Optimize chunk sizes
- [ ] Add progress tracking
- [ ] Add tests

---

## Medium Priority

### Model Selection & Routing

**Status**: Basic Implementation  
**Complexity**: Medium  
**Value**: Medium

**Description**:
Advanced model selection and request routing.

**Features**:
- Automatic model selection based on request
- Load balancing across multiple models
- Fallback models on failure
- Model capability detection
- Per-model rate limits

**Implementation Tasks**:
- [ ] Design model routing system
- [ ] Implement model capability detection
- [ ] Add load balancing logic
- [ ] Implement fallback handling
- [ ] Add per-model rate limits
- [ ] Add configuration
- [ ] Document usage

---

### Caching Layer

**Status**: Not Implemented  
**Complexity**: Medium  
**Value**: Medium

**Description**:
Add caching for common requests to reduce API calls and improve performance.

**Features**:
- Request/response caching
- Configurable TTL
- Cache invalidation
- Memory management
- Optional persistent cache

**Notes**:
- Consider privacy implications
- Make opt-in with clear warnings
- Implement cache encryption

**Implementation Tasks**:
- [ ] Design cache architecture
- [ ] Implement in-memory cache
- [ ] Add cache configuration
- [ ] Implement cache invalidation
- [ ] Add optional persistence
- [ ] Add privacy controls
- [ ] Document caching behavior
- [ ] Add tests

---

### WebSocket Support

**Status**: Not Implemented  
**Complexity**: High  
**Value**: Low-Medium

**Description**:
Add WebSocket support for bidirectional communication.

**Use Cases**:
- Real-time collaborative editing
- Interactive agents
- Reduced latency
- Push notifications

**Implementation Tasks**:
- [ ] Design WebSocket protocol
- [ ] Implement WebSocket server
- [ ] Add authentication for WebSocket
- [ ] Implement message framing
- [ ] Add reconnection logic
- [ ] Document protocol
- [ ] Add tests

---

## Low Priority

### Fine-tuning Endpoints

**Status**: Not Implemented  
**Complexity**: Very High  
**Value**: Low

**Description**:
Add OpenAI-compatible fine-tuning endpoints.

**Notes**:
- May not be feasible with VS Code LM API
- Research required
- Consider alternative approaches

**Endpoints**:
- `POST /v1/fine-tunes`
- `GET /v1/fine-tunes/{id}`
- `GET /v1/fine-tunes`

---

### Usage Analytics Dashboard

**Status**: Not Implemented  
**Complexity**: Medium  
**Value**: Low-Medium

**Description**:
Add optional analytics dashboard for monitoring usage.

**Features**:
- Request counts
- Token usage
- Response times
- Error rates
- Cost estimation

**Notes**:
- Privacy-focused (no content logging)
- Opt-in feature
- Local storage only

**Implementation Tasks**:
- [ ] Design analytics data model
- [ ] Implement data collection
- [ ] Create web dashboard
- [ ] Add privacy controls
- [ ] Document analytics features

---

### Multi-Model Support

**Status**: Not Implemented  
**Complexity**: High  
**Value**: Medium

**Description**:
Support multiple language models beyond VS Code LM.

**Potential Integrations**:
- Ollama local models
- Azure OpenAI
- AWS Bedrock
- Google Vertex AI

**Notes**:
- Maintain primary focus on VS Code LM
- Add as optional backends
- Unified API surface

---

### Request Queuing

**Status**: Not Implemented  
**Complexity**: Medium  
**Value**: Low

**Description**:
Add request queue for handling high load.

**Features**:
- FIFO queue
- Priority queuing
- Queue size limits
- Wait time estimation
- Queue position feedback

---

### Batch Processing

**Status**: Not Implemented  
**Complexity**: Medium  
**Value**: Low

**Description**:
Support batch processing of multiple requests.

**Endpoints**:
- `POST /v1/batch`

**Features**:
- Submit multiple requests at once
- Process in parallel or serial
- Aggregate results
- Progress tracking

---

## Research Needed

### Multimodal Support

**Status**: Research  
**Complexity**: Unknown  
**Value**: High

**Questions**:
- Does VS Code LM API support images?
- Can we support image inputs from OpenAI format?
- What about audio/video?

---

### Prompt Caching

**Status**: Research  
**Complexity**: Unknown  
**Value**: Medium

**Questions**:
- Does VS Code LM support prompt caching?
- Can we implement caching at our level?
- Privacy implications?

---

## Won't Implement

### Persistent Storage

**Reason**: Privacy concerns, out of scope

### Conversation History

**Reason**: Should be handled by client applications

### User Management

**Reason**: Single-user extension, not a multi-tenant service

---

## Contributing

Want to work on a feature? Please:

1. Check if it's listed here
2. Open an issue to discuss
3. Wait for approval
4. Submit a PR

For unlisted features:
1. Open an issue first
2. Describe use case and value
3. Discuss implementation approach
4. Get community feedback

---

## Priority Criteria

**High Priority**:
- High user value
- Aligns with project goals
- Feasible with VS Code LM API
- Clear implementation path

**Medium Priority**:
- Moderate user value
- Enhances existing features
- Reasonable complexity

**Low Priority**:
- Nice to have
- Limited use cases
- High complexity relative to value

---

Last Updated: November 16, 2025

