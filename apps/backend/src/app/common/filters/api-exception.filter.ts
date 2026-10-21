import type { ApiError } from "@presqio/lib";
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("ApiError");
  catch(error: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status =
      error instanceof HttpException
        ? error.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const body =
      error instanceof HttpException ? error.getResponse() : undefined;
    const detail =
      typeof body === "string"
        ? body
        : (body as { message?: string | string[] } | undefined)?.message;
    const payload: ApiError = {
      code: status === 500 ? "INTERNAL_ERROR" : `HTTP_${status}`,
      message:
        status === 500
          ? "An unexpected error occurred"
          : (detail ?? "Request failed"),
      requestId: String(response.getHeader("x-request-id") ?? request.path),
    };
    // Unexpected failures are logged with the request id (never the request body, which may
    // hold passwords); the client only sees a generic message.
    if (status >= 500)
      this.logger.error(
        `${request.method} ${request.path} [${payload.requestId}] ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
      );
    response.status(status).json(payload);
  }
}
