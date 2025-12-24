import { test } from '@japa/runner'
import {
  QueryBus,
  type IQuery,
  type IQueryHandler,
  HandlerNotFoundError,
} from '../../src/services/index.js'

// Test query
class TestQuery implements IQuery {
  readonly __query: true = true
  constructor(public value: number) {}
}

// Test handler
class TestHandler implements IQueryHandler<TestQuery, number> {
  async handle(query: TestQuery): Promise<number> {
    return query.value * 3
  }
}

// Async handler
class AsyncHandler implements IQueryHandler<TestQuery, string> {
  async handle(query: TestQuery): Promise<string> {
    return `Value: ${query.value}`
  }
}

test.group('QueryBus', () => {
  test('register and execute query handler', async ({ assert }) => {
    const bus = new QueryBus()
    const handler = new TestHandler()

    bus.register('TestQuery', handler)
    const query = new TestQuery(5)

    const result = await bus.execute(query)
    assert.equal(result, 15)
  })

  test('return string result from handler', async ({ assert }) => {
    const bus = new QueryBus()
    const handler = new AsyncHandler()

    bus.register('TestQuery', handler)
    const query = new TestQuery(42)

    const result = await bus.execute(query)
    assert.equal(result, 'Value: 42')
  })

  test('throw HandlerNotFoundError when handler not found', async ({ assert }) => {
    const bus = new QueryBus()
    const query = new TestQuery(5)

    try {
      await bus.execute(query)
      assert.fail('Should have thrown')
    } catch (error) {
      assert.instanceOf(error, HandlerNotFoundError)
    }
  })

  test('handler exceptions propagate', async ({ assert }) => {
    const bus = new QueryBus()

    class ThrowingHandler implements IQueryHandler<TestQuery, number> {
      async handle(): Promise<number> {
        throw new Error('Query failed')
      }
    }

    bus.register('TestQuery', new ThrowingHandler())
    const query = new TestQuery(5)

    await assert.rejects(async () => {
      await bus.execute(query)
    }, 'Query failed')
  })
})
