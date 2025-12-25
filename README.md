# @wailroth/cqrs

[![npm version](https://badge.fury.io/js/%40wailroth%2Fcqrs.svg)](https://www.npmjs.com/package/@wailroth/cqrs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> CQRS (Command Query Responsibility Segregation) implementation for AdonisJS

A clean, type-safe CQRS implementation for AdonisJS with support for pipeline behaviors, automatic handler registration, and Result types for error handling.

## Features

- **Command Bus** - For write operations that modify state
- **Query Bus** - For read operations that query data
- **Pipeline Behaviors** - Cross-cutting concerns like logging, validation, caching, transactions
- **Result Types** - Functional error handling with `ok()`, `err()`, `isOk()`, `isErr()`
- **Automatic Registration** - Handlers auto-register with the bus using base classes
- **Type-Safe** - Full TypeScript support with proper type inference
- **AdonisJS Integration** - Seamless integration with AdonisJS IoC container

## Installation

```bash
npm install @wailroth/cqrs
```

Then configure the package:

```bash
node ace configure @wailroth/cqrs
```

This will:
- Register the CQRS provider in your `adonisrc.ts`
- Create the recommended directory structure:
  ```
  app/
  └── application/
      ├── commands/
      ├── queries/
      └── handlers/
  ```

## Quick Start

### 1. Define a Command

```ts
// app/application/commands/create_user.ts
import type { ICommand } from '@wailroth/cqrs'

export interface CreateUser extends ICommand {
  email: string
  name: string
  password: string
}
```

### 2. Create a Command Handler

```ts
// app/application/handlers/create_user_command_handler.ts
import { inject } from '@adonisjs/core'
import { CommandHandlerBase, ok } from '@wailroth/cqrs'
import type { CreateUser } from '../commands/create_user.js'
import type { Result } from '@wailroth/cqrs'

@inject()
export class CreateUserCommandHandler extends CommandHandlerBase<CreateUser> {
  async handle(command: CreateUser): Promise<Result<void>> {
    // Create the user in your database
    // await User.create(command)

    return ok()
  }
}
```

### 3. Execute the Command

```ts
import { inject } from '@adonisjs/core'
import { CommandBus } from '@wailroth/cqrs'

@inject()
export class UserService {
  constructor(private commandBus: CommandBus) {}

  async createUser(data: { email: string; name: string; password: string }) {
    const result = await this.commandBus.execute({
      email: data.email,
      name: data.name,
      password: data.password,
    })

    if (result.isOk()) {
      console.log('User created successfully')
    } else {
      console.error('Failed to create user:', result.error)
    }
  }
}
```

## Queries

Queries work similarly but return data directly:

```ts
// app/application/queries/get_user.ts
export interface GetUser extends IQuery {
  userId: number
}

// app/application/handlers/get_user_query_handler.ts
@inject()
export class GetUserQueryHandler extends QueryHandlerBase<GetUser, User | null> {
  async handle(query: GetUser): Promise<User | null> {
    return await User.find(query.userId)
  }
}

// Usage
const user = await queryBus.execute({ userId: 1 })
```

## Result Type

Commands return a `Result<T>` type for error handling:

```ts
import { ok, err, isOk, isErr } from '@wailroth/cqrs'

// Success
ok()                    // Result<void>
ok(data)               // Result<T>

// Error
err(['Error message'])
errMessage('Error message')

// Checking
if (isOk(result)) {
  result.data // T
}

if (isErr(result)) {
  result.error // string[]
}
```

## Pipeline Behaviors

Add cross-cutting concerns using behaviors:

### Built-in Behaviors

```ts
import {
  LoggingCommandBehavior,
  TransactionCommandBehavior,
  ValidationCommandBehavior,
  CacheQueryBehavior,
  LoggingQueryBehavior,
} from '@wailroth/cqrs'
```

### Using Behaviors

```ts
// In a service provider or boot method
import { CommandBus } from '@wailroth/cqrs'
import { LoggingCommandBehavior } from '@wailroth/cqrs/services'

commandBus.use(new LoggingCommandBehavior(logger))
```

### Creating Custom Behaviors

```ts
import type { CommandBehavior } from '@wailroth/cqrs'

export class AuditBehavior implements CommandBehavior {
  async handle<TCommand extends ICommand>(
    command: TCommand,
    next: (cmd: TCommand) => Promise<Result<any>>
  ): Promise<Result<any>> {
    const startTime = Date.now()

    const result = await next(command)

    const duration = Date.now() - startTime
    await AuditLog.create({
      command: command.constructor.name,
      duration,
      success: result.isOk(),
    })

    return result
  }
}
```

## Advanced Usage

### Manual Handler Registration

If you don't want to use the base classes:

```ts
import { CommandBus } from '@wailroth/cqrs'
import type { ICommandHandler } from '@wailroth/cqrs'

@inject()
export class MyHandler implements ICommandHandler<MyCommand> {
  async handle(command: MyCommand): Promise<Result<void>> {
    // ...
  }
}

// In a provider
commandBus.register('MyCommand', new MyHandler())
```

### Validation with Behaviors

```ts
import { ValidationCommandBehavior } from '@wailroth/cqrs'
import vine from '@vinejs/vine'

const schema = vine.object({
  email: vine.string().email(),
  name: vine.string().minLength(3),
})

commandBus.use(
  new ValidationCommandBehavior(async (command) => {
    return vine.validate({ schema, data: command })
  })
)
```

### Transaction Support

Requires `@adonisjs/lucid`:

```ts
import { TransactionCommandBehavior } from '@wailroth/cqrs'
import Database from '@adonisjs/lucid/database'

commandBus.use(new TransactionCommandBehavior(Database))
```

## Directory Structure

The recommended structure (created automatically by configure):

```
app/
└── application/
    ├── commands/      # ICommand definitions
    ├── queries/       # IQuery definitions
    └── handlers/      # Handler implementations
```

## Naming Conventions

- Commands: `{Action}{Entity}Command` (e.g., `CreateUserCommand`)
- Queries: `{Action}{Entity}Query` (e.g., `GetUserQuery`)
- Handlers: `{CommandOrQueryName}Handler` (e.g., `CreateUserCommandHandler`)

The base classes automatically extract the command/query name from the handler class name for registration.

## License

MIT

## Support

For issues and questions, please use the [GitHub issue tracker](https://github.com/wailroth/cqrs-adonisjs/issues).
