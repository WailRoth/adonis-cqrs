/**
 * Base error for CQRS-related issues
 */
export class CQRError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CQRError'
  }
}

/**
 * Thrown when no handler is registered for a command/query
 */
export class HandlerNotFoundError extends CQRError {
  constructor(type: string, identifier: string) {
    super(`No handler registered for ${type}: ${identifier}`)
    this.name = 'HandlerNotFoundError'
  }
}

/**
 * Thrown when a command/query validation fails
 */
export class ValidationError extends CQRError {
  constructor(public readonly errors: string[]) {
    super(`Validation failed: ${errors.join(', ')}`)
    this.name = 'ValidationError'
  }
}

/**
 * Thrown when command execution fails
 */
export class CommandExecutionError extends CQRError {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'CommandExecutionError'
  }
}
