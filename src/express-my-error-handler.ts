import express from 'express'

// express에서는 일반적으로 에러에 붙은 statusCode를 http status로 쓴다
// https://gist.github.com/zcaceres/2854ef613751563a3b506fabce4501fd
type StatusCodeError = Error & { statusCode: number }

// https://github.com/auth0/express-jwt/blob/5766a24aeb7db15b8a183c59b4a9145552702f0e/lib/errors/UnauthorizedError.js
// 일부 라이브러리는 status를 쓴다
type StatusError = Error & { status: number }

function isStatusCodeError(x: any): x is StatusCodeError {
  return typeof x.statusCode === 'number'
}
function isStatusError(x: any): x is StatusError {
  return typeof x.status === 'number'
}

function getStatusCode(err: ErrorType) {
  // status가 정의된 경우
  if (isStatusCodeError(err)) {
    return err.statusCode
  } else if (isStatusError(err)) {
    return err.status
  }

  // name based
  if (err.name === 'ValidationError') {
    return 400
  }

  // else...
  return 500
}

function getCode(x: any): number {
  return typeof x.code === 'number' ? x.code : 0
}

export interface ErrorResp {
  name: string
  message: string | undefined
  code: number
  stack: string[] | undefined
}

type ErrorType = Error | StatusCodeError | StatusError

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
    const code = getCode(err)

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
