export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code = "VALIDATION_ERROR") {
    super(code, message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Credenciais inválidas.", code = "AUTHENTICATION_ERROR") {
    super(code, message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "Não tem permissão para esta ação.", code = "AUTHORIZATION_ERROR") {
    super(code, message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Recurso não encontrado.", code = "NOT_FOUND") {
    super(code, message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = "CONFLICT") {
    super(code, message, 409);
  }
}
