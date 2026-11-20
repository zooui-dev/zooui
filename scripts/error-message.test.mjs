// errorMessage() (packages/nuxt/utils/error-message.ts): readable text for a caught error, from the response body of a
// thrown $fetch error or the error itself, in a fixed order, with a product's own extractor read first.
// Run: node --test 'scripts/*.test.mjs'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { configureErrorMessage, errorMessage, ERROR_MESSAGE_FALLBACK } from '../packages/nuxt/utils/error-message.ts'

/** What $fetch throws: an Error whose `data` is the parsed response body. */
const fetchError = (data, message = '[POST] "/api/projects": 400 Bad Request') => Object.assign(new Error(message), { data })

describe('errorMessage: each shape', () => {
  it('a string is its own message', () => {
    assert.equal(errorMessage('Name is taken'), 'Name is taken')
  })

  it('null and undefined are the fallback', () => {
    assert.equal(errorMessage(null), ERROR_MESSAGE_FALLBACK)
    assert.equal(errorMessage(undefined), 'An error occurred')
  })

  it('validationErrors, a record of field → message, joined', () => {
    assert.equal(errorMessage(fetchError({ validationErrors: { name: 'Name is required', email: 'Email is taken' } })),
      'Name is required, Email is taken')
  })

  it('errors as an array of strings', () => {
    assert.equal(errorMessage(fetchError({ errors: ['Budget must be positive', 'Start date is in the past'] })),
      'Budget must be positive, Start date is in the past')
  })

  it('errors as a record of field → messages (several per field are flattened)', () => {
    assert.equal(errorMessage(fetchError({ title: 'One or more validation errors occurred.', errors: { Name: ['Required', 'Too short'], Email: ['Taken'] } })),
      'Required, Too short, Taken')
  })

  it('errors as an array of RFC 9457 entries ({ detail, pointer }), or of { message } and { title }', () => {
    assert.equal(errorMessage(fetchError({ errors: [{ detail: 'must be a positive integer', pointer: '#/age' }, { message: 'Plan is full' }, { title: 'Bad color' }] })),
      'must be a positive integer, Plan is full, Bad color')
  })

  it('an empty errors list is skipped', () => {
    assert.equal(errorMessage(fetchError({ errors: [], validationErrors: {}, detail: 'The project is archived.' })), 'The project is archived.')
    assert.equal(errorMessage(fetchError({ errors: [{ pointer: '#/x' }, ''], message: 'Bad input' })), 'Bad input')
  })

  it('detail (RFC 9457)', () => {
    assert.equal(errorMessage(fetchError({ type: 'about:blank', title: 'Conflict', status: 409, detail: 'The project was changed by someone else.' })),
      'The project was changed by someone else.')
  })

  it('error as a string', () => {
    assert.equal(errorMessage(fetchError({ error: 'Token expired' })), 'Token expired')
  })

  it('error as an object, read the same way', () => {
    assert.equal(errorMessage(fetchError({ error: { code: 403, message: 'The team plan has no seats left' } })), 'The team plan has no seats left')
  })

  it('error: true (a server framework flag) is not a message', () => {
    assert.equal(errorMessage(fetchError({ error: true, statusCode: 404, message: 'Project not found' })), 'Project not found')
  })

  it('message', () => {
    assert.equal(errorMessage(fetchError({ message: 'Upload too large' })), 'Upload too large')
  })

  it('title', () => {
    assert.equal(errorMessage(fetchError({ title: 'Forbidden', status: 403 })), 'Forbidden')
  })

  it('a body with nothing readable falls back to the error’s own message', () => {
    assert.equal(errorMessage(fetchError({ status: 500 }, 'Network down')), 'Network down')
    assert.equal(errorMessage(fetchError('<html>Bad gateway</html>', 'Bad gateway')), 'Bad gateway')
  })

  it('an Error is its message', () => {
    assert.equal(errorMessage(new Error('Disk full')), 'Disk full')
  })

  it('an object with only a title', () => {
    assert.equal(errorMessage({ title: 'Offline' }), 'Offline')
  })

  it('anything else is String(), except a bare object, which is the fallback', () => {
    assert.equal(errorMessage(404), '404')
    assert.equal(errorMessage({ status: 500 }), ERROR_MESSAGE_FALLBACK)
    assert.equal(errorMessage(new Error('')), 'Error')
  })

  it('a custom fallback', () => {
    assert.equal(errorMessage(null, { fallback: 'Something went wrong' }), 'Something went wrong')
    assert.equal(errorMessage({}, { fallback: 'Something went wrong' }), 'Something went wrong')
  })

  it('an error nested forever stops', () => {
    const loop = {}
    loop.error = loop
    assert.equal(errorMessage(loop), ERROR_MESSAGE_FALLBACK)
  })
})

describe('errorMessage: the order between shapes', () => {
  // Each body holds the shape under test AND the next one down, so a swap of any two neighbors fails.
  const cases = [
    ['validationErrors before errors', { validationErrors: { name: 'V' }, errors: ['E'] }, 'V'],
    ['errors before detail', { errors: ['E'], detail: 'D' }, 'E'],
    ['detail before error', { detail: 'D', error: 'R' }, 'D'],
    ['error before message', { error: 'R', message: 'M' }, 'R'],
    ['message before title', { message: 'M', title: 'T' }, 'M'],
    ['the body before the error’s own message', { title: 'T' }, 'T'],
  ]
  for (const [name, body, expected] of cases) {
    it(name, () => assert.equal(errorMessage(fetchError(body, 'own message')), expected))
  }

  it('the error’s own message before its title', () => {
    assert.equal(errorMessage({ message: 'M', title: 'T' }), 'M')
    // past a body with nothing readable, too
    assert.equal(errorMessage(Object.assign(fetchError({ status: 500 }, 'M'), { title: 'T' })), 'M')
    assert.equal(errorMessage(Object.assign(fetchError({ status: 500 }, ''), { title: 'T' })), 'T')
  })
})

describe('errorMessage: a product’s own extractor', () => {
  const extract = (err) => err?.data?.fault?.reason

  it('is read first, before every shape Zoo UI knows', () => {
    assert.equal(errorMessage(fetchError({ fault: { reason: 'Quota exceeded' }, detail: 'D', errors: ['E'] }), { extract }), 'Quota exceeded')
  })

  it('falls through when it returns nothing or an empty string', () => {
    assert.equal(errorMessage(fetchError({ detail: 'D' }), { extract }), 'D')
    assert.equal(errorMessage(fetchError({ detail: 'D' }), { extract: () => '' }), 'D')
  })

  it('is not asked about a string or null', () => {
    const asked = []
    const spy = (e) => { asked.push(e); return 'X' }
    assert.equal(errorMessage('plain', { extract: spy }), 'plain')
    assert.equal(errorMessage(null, { extract: spy }), ERROR_MESSAGE_FALLBACK)
    assert.deepEqual(asked, [])
  })

  it('configureErrorMessage sets the options a call without any uses, read on each call', () => {
    let options = { extract, fallback: 'Try again' }
    configureErrorMessage(() => options)
    try {
      assert.equal(errorMessage(fetchError({ fault: { reason: 'Quota exceeded' } })), 'Quota exceeded')
      assert.equal(errorMessage(null), 'Try again')
      options = undefined
      assert.equal(errorMessage(null), ERROR_MESSAGE_FALLBACK)
      // options given to the call win over the configured ones
      options = { fallback: 'Try again' }
      assert.equal(errorMessage(null, { fallback: 'Given' }), 'Given')
    } finally {
      configureErrorMessage(() => undefined)
    }
  })
})
