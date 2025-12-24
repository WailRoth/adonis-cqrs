/**
 * Result type for operations that can fail
 * Inspired by Rust's Result<T, E> and .NET's Result pattern
 *
 * @template TSuccess - The success value type
 * @template TError - The error type (defaults to string[])
 */
export type Result<TSuccess, TError = string[]> = Ok<TSuccess, TError> | Err<TError>

/**
 * Represents a successful operation
 */
export class Ok<TSuccess, TError = string[]> {
  readonly __tag = 'ok' as const
  constructor(public readonly value: TSuccess) {}

  isOk(): this is Ok<TSuccess, TError> {
    return true
  }

  isErr(): this is Err<TError> {
    return false
  }

  /**
   * Transform the success value
   */
  map<U>(fn: (value: TSuccess) => U): Result<U, TError> {
    return new Ok(fn(this.value))
  }

  /**
   * Get the value or a default if err (won't happen for Ok)
   */
  unwrapOr(_defaultValue: TSuccess | unknown): TSuccess {
    return this.value
  }

  /**
   * Get the value or throw if err (won't happen for Ok)
   */
  unwrap(): TSuccess {
    return this.value
  }
}

/**
 * Represents a failed operation
 */
export class Err<TError = string[]> {
  readonly __tag = 'err' as const
  // eslint-disable-next-line handle-callback-err
  constructor(public readonly error: TError) {}

  isOk(): this is Ok<never, TError> {
    return false
  }

  isErr(): this is Err<TError> {
    return true
  }

  /**
   * Transform the success value (no-op for Err)
   */
  map(_fn: (value: never) => unknown): Result<never, TError> {
    return this
  }

  /**
   * Get the value or a default if err
   */
  unwrapOr<T>(defaultValue: T): T {
    return defaultValue
  }

  /**
   * Get the error array or empty array
   */
  getErrors(): string[] {
    return Array.isArray(this.error) ? this.error : [String(this.error)]
  }

  /**
   * Throw with error message
   */
  unwrap(): never {
    if (Array.isArray(this.error)) {
      throw new Error(this.error.join(', '))
    }
    throw new Error(String(this.error))
  }
}

/**
 * Helper to create an Ok result
 */
export function ok<T>(value: T): Result<T> {
  return new Ok(value)
}

/**
 * Helper to create an Err result with string[]
 */
export function err(errors: string[]): Result<never> {
  return new Err(errors)
}

/**
 * Helper to create an Err result with a single string
 */
export function errMessage(message: string): Result<never> {
  return new Err([message])
}

/**
 * Type guard to check if result is Ok
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T, E> {
  return result.isOk()
}

/**
 * Type guard to check if result is Err
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result.isErr()
}
