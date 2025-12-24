import { test } from '@japa/runner'
import { ok, err, errMessage, isOk, isErr, type Result } from '../../src/services/index.js'

test.group('Result type', () => {
  test('ok creates a successful result', ({ assert }) => {
    const result = ok(42)
    assert.isTrue(result.isOk())
    assert.isFalse(result.isErr())
    assert.equal(result.unwrap(), 42)
  })

  test('err creates a failed result', ({ assert }) => {
    const result = err(['Something went wrong'])
    assert.isFalse(result.isOk())
    assert.isTrue(result.isErr())
    if (isErr(result)) {
      assert.deepEqual(result.getErrors(), ['Something went wrong'])
    }
  })

  test('errMessage creates a failed result with single message', ({ assert }) => {
    const result = errMessage('Single error')
    assert.isTrue(result.isErr())
    if (isErr(result)) {
      assert.deepEqual(result.getErrors(), ['Single error'])
    }
  })

  test('isOk type guard works correctly', ({ assert }) => {
    const success: Result<number> = ok(1)
    const failure: Result<number> = err(['error'])

    if (isOk(success)) {
      assert.equal(success.value, 1)
    } else {
      assert.fail('Should be Ok')
    }

    if (isOk(failure)) {
      assert.fail('Should be Err')
    } else {
      assert.isTrue(true)
    }
  })

  test('isErr type guard works correctly', ({ assert }) => {
    const success: Result<number> = ok(1)
    const failure: Result<number> = err(['error'])

    if (isErr(success)) {
      assert.fail('Should be Ok')
    } else {
      assert.isTrue(true)
    }

    if (isErr(failure)) {
      assert.deepEqual(failure.error, ['error'])
    } else {
      assert.fail('Should be Err')
    }
  })

  test('map transforms success value', ({ assert }) => {
    const result = ok(5).map((x) => x * 2)
    assert.isTrue(result.isOk())
    assert.equal(result.unwrap(), 10)
  })

  test('map does nothing on error', ({ assert }) => {
    const result = err(['error']).map(() => 0)
    assert.isTrue(result.isErr())
  })

  test('unwrapOr returns value on success', ({ assert }) => {
    const result = ok(42)
    assert.equal(result.unwrapOr(0), 42)
  })

  test('unwrapOr returns default on error', ({ assert }) => {
    const result = err(['error'])
    assert.equal(result.unwrapOr(0 as number), 0)
  })

  test('unwrap returns value on success', ({ assert }) => {
    const result = ok('hello')
    assert.equal(result.unwrap(), 'hello')
  })

  test('unwrap throws on error', ({ assert }) => {
    const result = err(['error'])
    assert.throws(() => result.unwrap(), 'error')
  })
})
