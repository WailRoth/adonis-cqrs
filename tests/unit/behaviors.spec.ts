import { test } from '@japa/runner'
import {
  CommandBus,
  QueryBus,
  LoggingCommandBehavior,
  LoggingQueryBehavior,
  ValidationCommandBehavior,
  ok,
  err,
  isErr,
  type ICommand,
  type ICommandHandler,
  type Result,
  type IQuery,
  type IQueryHandler,
} from '../../src/services/index.js'

// Test command
class TestCommand implements ICommand {
  readonly __command: true = true
  useTransaction = false
  constructor(public value: number) {}

  async validate() {
    if (this.value < 0) {
      return { isValid: false, errors: ['Value must be positive'] }
    }
    return { isValid: true }
  }
}

// Test query
class TestQuery implements IQuery {
  readonly __query: true = true
  useCache = false
  constructor(public value: number) {}
}

// Test handlers
class TestCommandHandler implements ICommandHandler<TestCommand, number> {
  async handle(command: TestCommand): Promise<Result<number>> {
    return ok(command.value * 2)
  }
}

class TestQueryHandler implements IQueryHandler<TestQuery, number> {
  async handle(query: TestQuery): Promise<number> {
    return query.value * 3
  }
}

test.group('Command Behaviors', () => {
  test('LoggingCommandBehavior logs execution', async ({ assert }) => {
    const bus = new CommandBus()
    bus.use(new LoggingCommandBehavior())

    bus.register('TestCommand', new TestCommandHandler())
    const command = new TestCommand(5)

    const logs: string[] = []
    const originalLog = console.log
    console.log = (...args) => logs.push(args.join(' '))

    try {
      const result = await bus.execute(command)
      assert.isTrue(result.isOk())
      assert.isTrue(logs.some((log) => log.includes('[Command] Executing:')))
      assert.isTrue(logs.some((log) => log.includes('[Command] Completed:')))
    } finally {
      console.log = originalLog
    }
  })

  test('LoggingCommandBehavior logs errors', async ({ assert }) => {
    const bus = new CommandBus()
    bus.use(new LoggingCommandBehavior())

    class FailingHandler implements ICommandHandler<TestCommand> {
      async handle(): Promise<Result<void>> {
        return err(['Handler error'])
      }
    }

    bus.register('TestCommand', new FailingHandler())
    const command = new TestCommand(5)

    const logs: string[] = []
    const originalLog = console.log
    console.log = (...args) => logs.push(args.join(' '))

    try {
      const result = await bus.execute(command)
      assert.isTrue(result.isErr())
      assert.isTrue(logs.some((log) => log.includes('[Command] Failed:')))
    } finally {
      console.log = originalLog
    }
  })

  test('ValidationCommandBehavior validates commands', async ({ assert }) => {
    const bus = new CommandBus()
    bus.use(new ValidationCommandBehavior())

    bus.register('TestCommand', new TestCommandHandler())
    const command = new TestCommand(-5)

    const result = await bus.execute(command)
    assert.isTrue(result.isErr())
    if (isErr(result)) {
      assert.deepEqual(result.getErrors(), ['Value must be positive'])
    }
  })

  test('ValidationCommandBehavior passes valid commands', async ({ assert }) => {
    const bus = new CommandBus()
    bus.use(new ValidationCommandBehavior())

    bus.register('TestCommand', new TestCommandHandler())
    const command = new TestCommand(5)

    const result = await bus.execute(command)
    assert.isTrue(result.isOk())
    assert.equal(result.unwrap(), 10)
  })
})

test.group('Query Behaviors', () => {
  test('LoggingQueryBehavior logs execution', async ({ assert }) => {
    const bus = new QueryBus()
    bus.use(new LoggingQueryBehavior())

    bus.register('TestQuery', new TestQueryHandler())
    const query = new TestQuery(5)

    const logs: string[] = []
    const originalLog = console.log
    console.log = (...args) => logs.push(args.join(' '))

    try {
      const result = await bus.execute(query)
      assert.equal(result, 15)
      assert.isTrue(logs.some((log) => log.includes('[Query] Executing:')))
      assert.isTrue(logs.some((log) => log.includes('[Query] Completed:')))
    } finally {
      console.log = originalLog
    }
  })

  test('LoggingQueryBehavior logs errors', async ({ assert }) => {
    const bus = new QueryBus()
    bus.use(new LoggingQueryBehavior())

    class ThrowingHandler implements IQueryHandler<TestQuery, number> {
      async handle(): Promise<number> {
        throw new Error('Query error')
      }
    }

    bus.register('TestQuery', new ThrowingHandler())
    const query = new TestQuery(5)

    const logs: string[] = []
    const originalError = console.error
    console.error = (...args) => logs.push(args.join(' '))

    try {
      await assert.rejects(async () => {
        await bus.execute(query)
      })
      assert.isTrue(logs.some((log) => log.includes('[Query] Failed:')))
    } finally {
      console.error = originalError
    }
  })
})
