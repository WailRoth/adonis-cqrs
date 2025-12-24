import type { CommandBehavior } from './behaviors.js'
import type { ICommand, ICommandHandler } from './command.js'
import type { Result } from './result.js'

/**
 * CommandBus - dispatches commands to their registered handlers
 * Supports pipeline behaviors for cross-cutting concerns
 * NOTE: Do NOT add @inject() decorator - this is registered as a singleton in the provider
 */
export class CommandBus {
  private handlers = new Map<string, unknown>()
  private behaviors: CommandBehavior[] = []

  /**
   * Register a handler for a specific command type
   */
  register<TCommand extends ICommand, TResult>(
    commandIdentifier: string,
    handler: ICommandHandler<TCommand, TResult>
  ): void {
    this.handlers.set(commandIdentifier, handler)
  }

  /**
   * Add a pipeline behavior (middleware) to the command execution
   * Behaviors are executed in order before the handler
   */
  use(behavior: CommandBehavior): void {
    this.behaviors.push(behavior)
  }

  /**
   * Execute a command by dispatching it to its registered handler
   * @returns Result with success status and optional data
   */
  async execute<TCommand extends ICommand, TResult = void>(
    command: TCommand
  ): Promise<Result<TResult>> {
    const commandIdentifier = command.constructor.name

    const handler = this.handlers.get(commandIdentifier) as
      | ICommandHandler<TCommand, TResult>
      | undefined

    if (!handler) {
      const { err } = await import('./result.js')
      return err([`No handler registered for command: ${commandIdentifier}`])
    }

    // Build the pipeline: behaviors -> handler
    const pipeline = this.buildPipeline(command, handler)

    // Execute the pipeline
    return pipeline(command)
  }

  /**
   * Build the execution pipeline with behaviors
   */
  private buildPipeline<TCommand extends ICommand, TResult>(
    _command: TCommand,
    handler: ICommandHandler<TCommand, TResult>
  ): (command: TCommand) => Promise<Result<TResult>> {
    // Start with the handler
    let pipeline: (command: TCommand) => Promise<Result<TResult>> = async (cmd) => {
      try {
        return await handler.handle(cmd)
      } catch (error) {
        const { err } = await import('./result.js')
        return err([error instanceof Error ? error.message : 'Command execution failed'])
      }
    }

    // Wrap with behaviors in reverse order (last behavior wraps first)
    for (let i = this.behaviors.length - 1; i >= 0; i--) {
      const behavior = this.behaviors[i]
      const next = pipeline
      pipeline = async (cmd) => behavior.handle(cmd, next)
    }

    return pipeline
  }
}
