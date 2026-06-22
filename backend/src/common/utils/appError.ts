export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: Array<{ field?: string; message: string }>;

  constructor(message: string, statusCode = 400, details?: Array<{ field?: string; message: string }>) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}
