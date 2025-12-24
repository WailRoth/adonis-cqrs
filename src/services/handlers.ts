import { inject } from '@adonisjs/core'
import type { ICommand, ICommandHandler, Result } from './command.js'
import { CommandBus } from './command_bus.js'
import type { IQuery, IQueryHandler } from './query.js'
import { QueryBus } from './query_bus.js'

/**
 * Abstract base class for command handlers
 * Provides automatic registration with the CommandBus
 * Handles can return void for fire-and-forget operations
 */
@inject()
export abstract class CommandHandlerBase<
  TCommand extends ICommand,
> implements ICommandHandler<TCommand> {
  constructor(protected commandBus: CommandBus) {
    // Auto-register this handler with the command bus
    const commandName = this.getCommandName()
    commandBus.register(commandName, this as ICommandHandler<TCommand>)
  }

  /**
   * Abstract handle method - override in subclasses
   * Return void for fire-and-forget, or Result<T> for operations that need to return data
   */
  abstract handle(command: TCommand): Promise<Result<void>>

  private getCommandName(): string {
    // Extract command name from class name
    // e.g., "UpdateUserProfileCommandHandler" -> "UpdateUserProfileCommand"
    const match = this.constructor.name.match(/^(.+)CommandHandler$/)
    return match ? match[1] + 'Command' : this.constructor.name
  }
}

/**
 * Abstract base class for query handlers
 * Provides automatic registration with the QueryBus
 */
@inject()
export abstract class QueryHandlerBase<TQuery extends IQuery, TResult> implements IQueryHandler<
  TQuery,
  TResult
> {
  constructor(protected queryBus: QueryBus) {
    // Auto-register this handler with the query bus
    const queryName = this.getQueryName()
    queryBus.register(queryName, this as IQueryHandler<TQuery, TResult>)
  }

  abstract handle(query: TQuery): Promise<TResult>

  private getQueryName(): string {
    // Extract query name from class name
    // e.g., "GetUserProfileQueryHandler" -> "GetUserProfileQuery"
    const match = this.constructor.name.match(/^(.+)QueryHandler$/)
    return match ? match[1] + 'Query' : this.constructor.name
  }
}
