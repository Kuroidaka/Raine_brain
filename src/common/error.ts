export class BadRequestException extends Error {
   status:number
  constructor(message: string) {
    super(message)
    this.name = "BadRequestException"
    this.status = 400
  }
}

export class UnauthorizedException extends Error {
  status: number
  constructor(message: string) {
    super(message)
    this.name = "UnauthorizedException"
    this.status = 401
  }
}

export class ForbiddenException extends Error {
  status: number
  constructor(message: string) {
    super(message)
    this.name = "ForbiddenException"
    this.status = 403
  }
}

export class NotFoundException extends Error {
  status: number
  constructor(message: string) {
    super(message)
    this.name = "NotFoundException"
    this.status = 404
  }
}

export class ConflictException extends Error {
  status: number
  constructor(message: string) {
    super(message)
    this.name = "ConflictException"
    this.status = 409
  }
}

export class InternalServerErrorException extends Error {
  status: number
  constructor(message: string) {
    super(message)
    this.name = "InternalServerErrorException"
    this.status = 500
  }
}

export class NotImplementedException extends Error {
  status: number
  constructor(message: string) {
    super(message)
    this.name = "NotImplementedException"
    this.status = 501
  }
}

export class BadGatewayException extends Error {
  status: number
  constructor(message: string) {
    super(message)
    this.name = "BadGatewayException"
    this.status = 502
  }
}

export class ServiceUnavailableException extends Error {
  status: number
  constructor(message: string) {
    super(message)
    this.name = "ServiceUnavailableException"
    this.status = 503
  }
}

export class GatewayTimeoutException extends Error {
  status: number
  constructor(message: string) {
    super(message)
    this.name = "GatewayTimeoutException"
    this.status = 504
  }
}
