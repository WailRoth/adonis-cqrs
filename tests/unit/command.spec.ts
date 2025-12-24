import { test } from '@japa/runner'
import {
  CommandBus,
  ok,
  err,
  isErr,
  type ICommand,
  type ICommandHandler,
  type Result,
} from '../../src/services/index.js'

// Test command
class TestCommand implements ICommand {
  readonly __command: true = true
  constructor(public value: number) {}
}

// Test handler
class TestHandler implements ICommandHandler<TestCommand, number> {
  async handle(command: TestCommand): Promise<Result<number>> {
    return ok(command.value * 2)
  }
}

// Failing handler
class FailingHandler implements ICommandHandler<TestCommand> {
  async handle(): Promise<Result<void>> {
    return err(['Handler failed'])
  }
}

test.group('CommandBus', () => {
  test('register and execute command handler', async ({ assert }) => {
    const bus = new CommandBus()
    const handler = new TestHandler()

    bus.register('TestCommand', handler)
    const command = new TestCommand(5)

    const result = await bus.execute(command)
    assert.isTrue(result.isOk())
    assert.equal(result.unwrap(), 10)
  })

  test('return error when handler not found', async ({ assert }) => {
    const bus = new CommandBus()
    const command = new TestCommand(5)

    const result = await bus.execute(command)
    assert.isTrue(result.isErr())
    if (isErr(result)) {
      assert.isTrue(result.getErrors()[0].includes('No handler registered'))
    }
  })

  test('handler can return error', async ({ assert }) => {
    const bus = new CommandBus()
    const handler = new FailingHandler()

    bus.register('TestCommand', handler)
    const command = new TestCommand(5)

    const result = await bus.execute(command)
    assert.isTrue(result.isErr())
    if (isErr(result)) {
      assert.deepEqual(result.getErrors(), ['Handler failed'])
    }
  })

  test('execute method catches handler exceptions', async ({ assert }) => {
    const bus = new CommandBus()

    class ThrowingHandler implements ICommandHandler<TestCommand> {
      async handle(): Promise<Result<void>> {
        throw new Error('Unexpected error')
      }
    }

    bus.register('TestCommand', new ThrowingHandler())
    const command = new TestCommand(5)

    const result = await bus.execute(command)
    assert.isTrue(result.isErr())
    if (isErr(result)) {
      assert.equal(result.getErrors()[0], 'Unexpected error')
    }
  })
})
