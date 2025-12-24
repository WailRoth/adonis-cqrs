/* eslint-disable @typescript-eslint/naming-convention */
/**
 * Base marker interface for all Queries
 * Queries represent requests for data (read operations)
 * They should not change state
 */
export interface IQuery {
  readonly __query: true
}

/**
 * Interface for handling queries
 * @template TQuery - The query type this handler processes
 * @template TResult - The return type of the query
 */
export interface IQueryHandler<TQuery extends IQuery, TResult> {
  handle(query: TQuery): Promise<TResult>
}
