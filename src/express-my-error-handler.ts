import express from 'express'
import { ValidationError } from 'yup'

type HttpError = Error & { statusCode: number }
type StandardError = HttpError & { code: number }

function isHttpError(x: any): x is HttpError {
  return typeof x.statusCode === 'number'
}

function isStandardError(x: any): x is StandardError {
  return typeof x.statusCode === 'number' && typeof x.code === 'number'
}

function isValidationError(x: any): x is ValidationError {
  return x.name === 'ValidationError'
}

function getStatusCode(err: ErrorType) {
  if (isHttpError(err)) {
    return err.statusCode
  } else if (isValidationError(err)) {
    // Bad Request
    return 400
  } else {
    // Internal Server Error
    return 500
  }
}

export interface ErrorResp {
  name: string
  message: string | undefined
  code: number
  stack: string[] | undefined
}

type ErrorType = Error | HttpError | ValidationError

export const myErrorHandler = (production: boolean) => {
  return (
    err: ErrorType,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const name = err.name
    const message = production ? undefined : err.message
    const statusCode = getStatusCode(err)
    const stackStr = production ? undefined : err.stack
    const stack = stackStr ? stackStr.split('\n') : undefined
    const code = isStandardError(err) ? err.code : 0

    const resp: ErrorResp = {
      name,
      message,
      stack,
      code
    }

    res.status(statusCode).json(resp)
    next(err)
  }
}
