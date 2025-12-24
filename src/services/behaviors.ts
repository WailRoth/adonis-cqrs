import type { Result } from './result.js'
import type { ICommand } from './command.js'
import type { IQuery } from './query.js'

/**
 * Base interface for command behaviors (pipeline middleware)
 * Behaviors can be used for logging, validation, transactions, caching, etc.
 */
export interface CommandBehavior {
  handle<TCommand extends ICommand, TResult>(
    command: TCommand,
    next: (command: TCommand) => Promise<Result<TResult>>
  ): Promise<Result<TResult>>
}

/**
 * Base interface for query behaviors (pipeline middleware)
 * Behaviors can be used for logging, validation, caching, performance tracking, etc.
 */
export interface QueryBehavior {
  handle<TResult>(query: IQuery, next: (query: IQuery) => Promise<TResult>): Promise<TResult>
}

/**
 * Logging behavior - logs command execution
 */
export class LoggingCommandBehavior implements CommandBehavior {
  async handle<TCommand extends ICommand, TResult>(
    command: TCommand,
    next: (command: TCommand) => Promise<Result<TResult>>
  ): Promise<Result<TResult>> {
    const commandName = command.constructor.name
    console.log(`[Command] Executing: ${commandName}`, command)

    const startTime = Date.now()

    try {
      const result = await next(command)
      const duration = Date.now() - startTime

      if (result.isOk()) {
        console.log(`[Command] Completed: ${commandName} (${duration}ms)`)
      } else {
        console.log(`[Command] Failed: ${commandName} (${duration}ms)`, result.getErrors())
      }

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`[Command] Failed: ${commandName} (${duration}ms)`, error)
      const { err } = await import('./result.js')
      return err([error instanceof Error ? error.message : 'Unknown error'])
    }
  }
}

/**
 * Logging behavior - logs query execution
 */
export class LoggingQueryBehavior implements QueryBehavior {
  async handle<TResult>(
    query: IQuery,
    next: (query: IQuery) => Promise<TResult>
  ): Promise<TResult> {
    const queryName = query.constructor.name
    console.log(`[Query] Executing: ${queryName}`, query)

    const startTime = Date.now()

    try {
      const result = await next(query)
      const duration = Date.now() - startTime
      console.log(`[Query] Completed: ${queryName} (${duration}ms)`)
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`[Query] Failed: ${queryName} (${duration}ms)`, error)
      throw error
    }
  }
}

/**
 * Transaction behavior - wraps commands in database transactions
 * Requires @adonisjs/lucid to be installed
 */
export class TransactionCommandBehavior implements CommandBehavior {
  async handle<TCommand extends ICommand, TResult>(
    command: TCommand,
    next: (command: TCommand) => Promise<Result<TResult>>
  ): Promise<Result<TResult>> {
    // @ts-expect-error - @adonisjs/lucid is an optional peer dependency
    const dbModule = await import('@adonisjs/lucid/services/db')
    const db = dbModule.default

    // Check if command should run in transaction
    if ('useTransaction' in command && command.useTransaction === false) {
      return next(command)
    }

    try {
      const result = await db.transaction(async () => {
        return next(command)
      })
      return result
    } catch (error) {
      const { err } = await import('./result.js')
      return err([error instanceof Error ? error.message : 'Transaction failed'])
    }
  }
}

/**
 * Cache behavior - caches query results
 * Requires @adonisjs/cache to be installed
 */
export class CacheQueryBehavior implements QueryBehavior {
  constructor(
    private ttl: number = 3600 // 1 hour default
  ) {}

  async handle<TResult>(
    query: IQuery,
    next: (query: IQuery) => Promise<TResult>
  ): Promise<TResult> {
    // Check if query should be cached
    if ('useCache' in query && query.useCache === false) {
      return next(query)
    }

    // @ts-expect-error - @adonisjs/cache is an optional peer dependency
    const cacheModule = await import('@adonisjs/cache/services/main')
    const cache = cacheModule.default
    const cacheKey = `query:${query.constructor.name}:${JSON.stringify(query)}`

    // Try to get from cache
    const cached = await cache.get({ key: cacheKey })
    if (cached !== null) {
      console.log(`[Cache] Hit for: ${query.constructor.name}`)
      return cached as TResult
    }

    // Execute query and cache result
    const result = await next(query)
    await cache.set({ key: cacheKey, value: result, ttl: `${this.ttl} seconds` })
    console.log(`[Cache] Miss for: ${query.constructor.name}`)

    return result
  }
}

/**
 * Validation behavior - validates commands before execution
 */
export class ValidationCommandBehavior implements CommandBehavior {
  async handle<TCommand extends ICommand, TResult>(
    command: TCommand,
    next: (command: TCommand) => Promise<Result<TResult>>
  ): Promise<Result<TResult>> {
    // If command has a validate method, call it
    if ('validate' in command && typeof command.validate === 'function') {
      const validation = await (command as any).validate()
      if (validation && !validation.isValid) {
        const { err } = await import('./result.js')
        return err(validation.errors || ['Validation failed'])
      }
    }

    return next(command)
  }
}
