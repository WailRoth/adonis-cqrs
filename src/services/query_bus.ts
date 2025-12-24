import type { QueryBehavior } from './behaviors.js'
import { HandlerNotFoundError } from './errors.js'
import type { IQuery, IQueryHandler } from './query.js'

/**
 * QueryBus - dispatches queries to their registered handlers
 * Supports pipeline behaviors for cross-cutting concerns
 * NOTE: Do NOT add @inject() decorator - this is registered as a singleton in the provider
 */
export class QueryBus {
  private handlers = new Map<string, unknown>()
  private behaviors: QueryBehavior[] = []

  /**
   * Register a handler for a specific query type
   */
  register<TQuery extends IQuery, TResult>(
    queryIdentifier: string,
    handler: IQueryHandler<TQuery, TResult>
  ): void {
    this.handlers.set(queryIdentifier, handler)
  }

  /**
   * Add a pipeline behavior (middleware) to the query execution
   * Behaviors are executed in order before the handler
   */
  use(behavior: QueryBehavior): void {
    this.behaviors.push(behavior)
  }

  /**
   * Execute a query by dispatching it to its registered handler
   */
  async execute<TResult>(query: IQuery): Promise<TResult> {
    const queryIdentifier = query.constructor.name

    const handler = this.handlers.get(queryIdentifier) as IQueryHandler<any, TResult> | undefined

    if (!handler) {
      throw new HandlerNotFoundError('query', queryIdentifier)
    }

    // Build the pipeline: behaviors -> handler
    const pipeline = this.buildPipeline<TResult>(query, handler)

    // Execute the pipeline
    return pipeline(query)
  }

  /**
   * Build the execution pipeline with behaviors
   */
  private buildPipeline<TResult>(
    _query: IQuery,
    handler: IQueryHandler<any, TResult>
  ): (query: IQuery) => Promise<TResult> {
    // Start with the handler
    let pipeline: (query: IQuery) => Promise<TResult> = (q) => handler.handle(q)

    // Wrap with behaviors in reverse order (last behavior wraps first)
    for (let i = this.behaviors.length - 1; i >= 0; i--) {
      const behavior = this.behaviors[i]
      const next = pipeline
      pipeline = async (q) => behavior.handle(q, next)
    }

    return pipeline
  }
}
