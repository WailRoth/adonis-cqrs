import type { ApplicationService } from '@adonisjs/core/types'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { cwd } from 'node:process'
import { pathToFileURL } from 'node:url'
import {
  LoggingCommandBehavior,
  LoggingQueryBehavior,
  TransactionCommandBehavior,
  ValidationCommandBehavior,
} from './behaviors.js'
import { CommandBus } from './command_bus.js'
import { QueryBus } from './query_bus.js'

/**
 * CQRS Provider - registers the CommandBus and QueryBus with the container
 * and auto-registers all handlers found in the application directory
 */
export default class CQRSProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  async register(): Promise<void> {
    // Register CommandBus as singleton (using class directly for DI)
    this.app.container.singleton(CommandBus, () => {
      const bus = new CommandBus()

      // Add default behaviors (order matters)
      bus.use(new ValidationCommandBehavior()) // Validate first
      bus.use(new LoggingCommandBehavior()) // Then log
      bus.use(new TransactionCommandBehavior()) // Then wrap in transaction

      return bus
    })

    // Register QueryBus as singleton (using class directly for DI)
    this.app.container.singleton(QueryBus, () => {
      const bus = new QueryBus()

      // Add default behaviors (order matters)
      bus.use(new LoggingQueryBehavior()) // Log queries

      return bus
    })
  }

  /**
   * Boot the provider - auto-register all handlers
   */
  async boot(): Promise<void> {
    const [commandBus, queryBus] = await Promise.all([
      this.app.container.make(CommandBus),
      this.app.container.make(QueryBus),
    ])

    const handlersPath = join(cwd(), 'app/application')
    await this.#registerHandlersFromDirectory(handlersPath, commandBus, queryBus)
  }

  /**
   * Start the provider - runs after boot
   */
  async start(): Promise<void> {
    // Handlers are already registered in boot()
    const commandBus = await this.app.container.make(CommandBus)
    const queryBus = await this.app.container.make(QueryBus)
    const commandCount = commandBus['handlers'].size
    const queryCount = queryBus['handlers'].size
    console.log(
      `[CQRS] Registered ${commandCount} command handlers and ${queryCount} query handlers`
    )
  }

  /**
   * Recursively scans directory for handler files and registers them
   */
  async #registerHandlersFromDirectory(
    directory: string,
    commandBus: CommandBus,
    queryBus: QueryBus
  ): Promise<void> {
    try {
      const files = await readdir(directory, { withFileTypes: true })

      for (const file of files) {
        const fullPath = join(directory, file.name)

        if (file.isDirectory()) {
          // Skip node_modules and test directories
          if (file.name === 'node_modules' || file.name === 'tests') {
            continue
          }
          await this.#registerHandlersFromDirectory(fullPath, commandBus, queryBus)
          continue
        }

        if (this.#isHandlerFile(file.name)) {
          await this.#registerHandlerFromFile(fullPath, commandBus, queryBus)
        }
      }
    } catch (error) {
      // Directory might not exist, ignore
    }
  }

  /**
   * Checks if a file is a handler file based on its name
   */
  #isHandlerFile(fileName: string): boolean {
    return (
      fileName.endsWith('_handler.ts') ||
      fileName.endsWith('_handler.js') ||
      fileName.endsWith('.handler.ts') ||
      fileName.endsWith('.handler.js')
    )
  }

  /**
   * Processes a handler file and registers it with the appropriate bus
   */
  async #registerHandlerFromFile(
    filePath: string,
    commandBus: CommandBus,
    queryBus: QueryBus
  ): Promise<void> {
    try {
      const path = pathToFileURL(filePath)
      const handlerModule = await import(path.href)

      // Get the default export (the handler class)
      const HandlerClass = handlerModule.default

      if (!HandlerClass || typeof HandlerClass !== 'function') {
        return
      }

      // Extract handler name from class name
      // e.g., "UpdateUserProfileCommandHandler" -> "UpdateUserProfileCommand"
      // e.g., "GetUserProfileQueryHandler" -> "GetUserProfileQuery"
      const className = HandlerClass.name

      if (className.endsWith('QueryHandler')) {
        const queryName = className.replace(/QueryHandler$/, 'Query')
        const handlerInstance = await this.app.container.make(HandlerClass)
        queryBus.register(queryName, handlerInstance)
        console.log(`[CQRS] Registered query handler: ${className} -> ${queryName}`)
      } else if (className.endsWith('CommandHandler')) {
        const commandName = className.replace(/CommandHandler$/, 'Command')
        const handlerInstance = await this.app.container.make(HandlerClass)
        commandBus.register(commandName, handlerInstance)
        console.log(`[CQRS] Registered command handler: ${className} -> ${commandName}`)
      }
    } catch (error) {
      console.error(`[CQRS] Failed to register handler from ${filePath}:`, error)
    }
  }
}

/**
 * Helper function to register a command handler manually
 * Can be used in service providers or boot methods
 */
export function registerCommandHandler(
  app: ApplicationService,
  commandName: string,
  handler: any
): void {
  app.container
    .make(CommandBus)
    .then((bus: CommandBus) => {
      bus.register(commandName, handler)
    })
    .catch((error) => {
      console.error(`Failed to register command handler for ${commandName}:`, error)
    })
}

/**
 * Helper function to register a query handler manually
 * Can be used in service providers or boot methods
 */
export function registerQueryHandler(
  app: ApplicationService,
  queryName: string,
  handler: any
): void {
  app.container
    .make(QueryBus)
    .then((bus: QueryBus) => {
      bus.register(queryName, handler)
    })
    .catch((error) => {
      console.error(`Failed to register query handler for ${queryName}:`, error)
    })
}
