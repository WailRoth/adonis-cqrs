/* eslint-disable @typescript-eslint/naming-convention */
import type { Result } from './result.js'

export type { Result, Ok, Err } from './result.js'

/**
 * Base marker interface for all Commands
 * Commands represent intentions to change state (write operations)
 */
export interface ICommand {
  readonly __command: true
}

/**
 * Interface for handling commands
 * @template TCommand - The command type this handler processes
 * @template TResult - The result type (defaults to void for fire-and-forget commands)
 */
export interface ICommandHandler<TCommand extends ICommand, TResult = void> {
  handle(command: TCommand): Promise<Result<TResult>>
}
