// ─── Custom HTTP Error Classes ────────────────────────────────────────────────

export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Distinguishes from unexpected programmer errors
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request') {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not Found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409);
  }
}

export class ThreatDetectedError extends AppError {
  constructor(threatName = 'Unknown') {
    super(`Security threat detected: ${threatName}`, 406);
    this.threatName = threatName;
  }
}

export class StorageQuotaError extends AppError {
  constructor() {
    super('Storage quota exceeded', 413);
  }
}
