import * as express from 'express'
import * as request from 'supertest'
import { myErrorHandler } from '../src/express-my-error-handler'

function makeHandler(opts: {
  name?: string
  message?: string
  code?: number
  status?: number
  statusCode?: number
}) {
  const message = opts.message ? opts.message : ''
  const keys: Array<keyof typeof opts> = ['name', 'code', 'status', 'statusCode']

  return (req: express.Request, res: express.Response) => {
    const e: any = new Error(message)
    for (const key of keys) {
      const val = opts[key]
      if (val) {
        e[key] = val
      }
    }
    throw e
  }
}

describe('error', () => {
  const app = express()
  app.get('/', makeHandler({}))
  app.use(myErrorHandler(false))

  test('ok', done => {
    request(app)
      .get('/')
      .expect(500)
      .end((err, res) => {
        if (err) {
          throw err
        }
        expect(res.body.code).toBe(0)
        done()
      })
  })
})

describe('with code', () => {
  const code = 123
  const app = express()
  app.get('/', makeHandler({ code }))
  app.use(myErrorHandler(false))

  test('ok', done => {
    request(app)
      .get('/')
      .expect(500)
      .end((err, res) => {
        if (err) {
          throw err
        }
        expect(res.body.code).toBe(code)
        done()
      })
  })
})

describe('with statusCode', () => {
  const statusCode = 412
  const app = express()
  app.get('/', makeHandler({ statusCode }))
  app.use(myErrorHandler(false))

  test('ok', done =>
    request(app)
      .get('/')
      .expect(statusCode, done))
})

describe('with status', () => {
  const status = 413
  const app = express()
  app.get('/', makeHandler({ status }))
  app.use(myErrorHandler(false))

  test('ok', done =>
    request(app)
      .get('/')
      .expect(status, done))
})

describe('validation error', () => {
  const app = express()
  app.get('/', makeHandler({ name: 'ValidationError', message: '' }))
  app.use(myErrorHandler(false))

  test('ok', done =>
    request(app)
      .get('/')
      .expect(400, done))
})

describe('production', () => {
  const production = true
  const app = express()
  app.get('/', makeHandler({ name: 'sample error', message: 'sample message' }))
  app.use(myErrorHandler(production))

  test('empty message, empty stack', done => {
    const expected = {
      name: 'sample error',
      code: 0,
      message: undefined,
      stack: undefined
    }

    request(app)
      .get('/')
      .expect(500)
      .end((err, res) => {
        if (err) {
          throw err
        }
        expect(res.body).toEqual(expected)
        done()
      })
  })
})
