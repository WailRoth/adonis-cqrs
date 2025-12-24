/*
|--------------------------------------------------------------------------
| Package entrypoint
|--------------------------------------------------------------------------
|
| Export values from the package entrypoint as you see fit.
|
*/

export { configure } from './configure.js'

// Export core types and classes
export type {
  ICommand,
  ICommandHandler,
  IQuery,
  IQueryHandler,
  CommandBehavior,
  QueryBehavior,
} from './src/services/index.js'

export {
  CommandBus,
  QueryBus,
  ok,
  err,
  errMessage,
  isOk,
  isErr,
  LoggingCommandBehavior,
  LoggingQueryBehavior,
  TransactionCommandBehavior,
  CacheQueryBehavior,
  ValidationCommandBehavior,
  CommandHandlerBase,
  QueryHandlerBase,
} from './src/services/index.js'

export type {
  Result,
  Ok,
  Err,
  HandlerNotFoundError,
  ValidationError,
  CommandExecutionError,
  CQRError,
} from './src/services/index.js'

// Export services for dependency injection
export { default as cqrsProvider } from './providers/cqrs_provider.js'
