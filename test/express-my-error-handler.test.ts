import * as express from 'express'
import * as faker from 'faker'
import * as request from 'supertest'
import * as yup from 'yup'
import { myErrorHandler } from '../src/express-my-error-handler'

function makeApp(prod: boolean) {
  const app = express()

  app.get('/http/:statusCode', (req, res) => {
    const e: any = new Error('sample http error')
    e.name = 'HttpError'
    e.statusCode = parseInt(req.params.statusCode, 10) || 400
    throw e
  })

  app.get('/standard/:statusCode/:code', (req, res) => {
    const e: any = new Error('sample standard error')
    e.name = 'StandardError'
    e.statusCode = parseInt(req.params.statusCode, 10) || 400
    e.code = parseInt(req.params.code, 10) || 1
    throw e
  })

  app.get('/error', (req, res) => {
    throw new Error('sample error')
  })

  app.get('/custom', (req, res) => {
    const message = req.query.message
    const name = req.query.name
    const statusCode = parseInt(req.query.statusCode || '500', 10)
    const e: any = new Error(message)
    e.name = name
    e.statusCode = statusCode
    throw e
  })

  app.get('/yup/', (req, res) => {
    const schema = yup.object().shape({
      str: yup.string().required()
    })
    const x = schema.validateSync({})
    res.json({ x })
  })

  app.use('/', myErrorHandler(prod))

  return app
}

const statusCode = faker.random.number({ min: 400, max: 499 })
const code = faker.random.number({ min: 1, max: 100 })

function assertRequest(opts: {
  test: request.Test
  statusCode: number
  expected: object
  done: jest.DoneCallback
}) {
  const { test, statusCode, expected, done } = opts

  test.expect(statusCode).end((err, res) => {
    if (err) {
      throw err
    }

    const body = res.body
    expect(Array.isArray(body.stack)).toBe(true)

    delete body.stack
    expect(body).toEqual(expected)
    done()
  })
}

describe('development', () => {
  const production = false
  const app = makeApp(production)

  test('http error', done => {
    const url = `/http/${statusCode}`
    const expected = {
      name: 'HttpError',
      message: 'sample http error',
      code: 0
    }
    const test = request(app).get(url)
    assertRequest({ test, statusCode, expected, done })
  })

  test('standard error', done => {
    const url = `/standard/${statusCode}/${code}`
    const expected = {
      name: 'StandardError',
      message: 'sample standard error',
      code
    }
    const test = request(app).get(url)
    assertRequest({ test, statusCode, expected, done })
  })

  test('yup - validation error', done => {
    const url = `/yup`
    const expected = {
      name: 'ValidationError',
      message: 'str is a required field',
      code: 0
    }
    const test = request(app).get(url)
    assertRequest({ test, statusCode: 400, expected, done })
  })

  test('error', done => {
    const url = `/error`
    const expected = {
      name: 'Error',
      message: 'sample error',
      code: 0
    }
    const test = request(app).get(url)
    assertRequest({ test, statusCode: 500, expected, done })
  })

  test('UnauthorizedError', done => {
    const name = 'UnauthorizedError'
    const message = 'No authorization token was found'
    const statusCode = 401
    const expected = { name, message, code: 0 }
    const test = request(app)
      .get('/custom')
      .query({ name, message, statusCode })
    assertRequest({ test, statusCode, expected, done })
  })
})

describe('production', () => {
  const production = true
  const app = makeApp(production)

  test('empty message', done => {
    const url = `/http/${statusCode}`
    const expected = {
      name: 'HttpError',
      code: 0,
      message: undefined,
      stack: undefined
    }

    request(app)
      .get(url)
      .expect(statusCode)
      .end((err, res) => {
        if (err) {
          throw err
        }
        expect(res.body).toEqual(expected)
        done()
      })
  })
})
