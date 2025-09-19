# Error Handling Documentation

## Overview

The Cookly Backend implements comprehensive error handling to prevent server crashes and provide meaningful error messages to clients.

## Error Handling Features

### 1. Global Error Handlers

- **Uncaught Exceptions**: Prevents server crashes from unhandled synchronous errors
- **Unhandled Promise Rejections**: Catches async errors that weren't properly handled
- **Graceful Shutdown**: Properly closes database connections and server on termination

### 2. Request-Level Error Handling

- **Async Handler Wrapper**: Automatically catches async errors in controllers
- **Request Timeout**: Prevents hanging requests (30s default, 60s for AI operations)
- **Request ID Tracking**: Each request gets a unique ID for better debugging

### 3. Input Validation & Sanitization

- **MongoDB Injection Protection**: Sanitizes all inputs to prevent NoSQL injection
- **Content Type Validation**: Ensures proper content types for POST/PUT requests
- **Schema Validation**: Uses express-validator for comprehensive input validation

### 4. Rate Limiting

- **General API**: 100 requests per 15 minutes
- **Authentication**: 5 attempts per 15 minutes
- **AI Generation**: 10 requests per minute

### 5. Error Types Handled

#### Database Errors

- **CastError**: Invalid MongoDB ObjectId
- **ValidationError**: Schema validation failures
- **Duplicate Key**: Unique constraint violations
- **Connection Errors**: Database connectivity issues

#### Authentication Errors

- **JsonWebTokenError**: Invalid JWT tokens
- **TokenExpiredError**: Expired authentication tokens

#### Network Errors

- **ECONNRESET**: Connection reset by peer
- **ETIMEDOUT**: Network timeouts
- **ENOTFOUND**: DNS resolution failures

#### HTTP Errors

- **400**: Bad Request with detailed validation errors
- **401**: Unauthorized access attempts
- **403**: Forbidden operations
- **404**: Resource not found
- **413**: Payload too large
- **429**: Rate limit exceeded
- **500**: Internal server errors
- **503**: Service unavailable

### 6. Logging & Monitoring

- **Request Logging**: All requests logged with timing and status
- **Error Context**: Errors include request URL, method, user ID, and timestamp
- **Development Mode**: Additional debug information in development
- **Health Check**: Comprehensive system status endpoint

## Error Response Format

All errors follow a consistent format:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": {
    "type": "ErrorType",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/api/endpoint",
    "method": "POST",
    "requestId": "abc12345"
  }
}
```

## Health Check Endpoint

GET `/health` provides comprehensive system status:

```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "services": {
    "api": "healthy",
    "database": "connected",
    "ai": "configured"
  },
  "system": {
    "nodeVersion": "v18.0.0",
    "platform": "linux",
    "memory": {
      "used": "45MB",
      "total": "128MB"
    }
  }
}
```

## Security Features

1. **Helmet.js**: Security headers for common vulnerabilities
2. **CORS**: Properly configured cross-origin resource sharing
3. **Input Sanitization**: Prevents injection attacks
4. **Rate Limiting**: Prevents abuse and DoS attacks
5. **Request Timeouts**: Prevents resource exhaustion

## Development vs Production

### Development Mode

- Detailed error messages with stack traces
- Verbose logging
- Less restrictive error handling for debugging

### Production Mode

- Generic error messages for security
- Essential logging only
- Strict error handling and process termination on critical errors

## Best Practices

1. **Always use asyncHandler**: Wrap async controllers for automatic error handling
2. **Validate inputs**: Use express-validator for all user inputs
3. **Handle specific errors**: Provide meaningful messages for known error types
4. **Log with context**: Include request information in error logs
5. **Fail gracefully**: Continue operation when possible, fail fast when necessary

## Monitoring Recommendations

1. Monitor the `/health` endpoint for system status
2. Set up alerts for 5xx error rates
3. Track response times, especially for AI operations
4. Monitor memory usage and database connections
5. Set up log aggregation for error analysis
