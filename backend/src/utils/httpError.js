/**
 * An error that carries an HTTP status code and a message meant for the
 * end user (written in Lao, because that is what the UI shows).
 *
 * Anything thrown that is NOT an HttpError is treated as a bug and turned
 * into a generic 500 by the error handler, so internal details never leak.
 */
export class HttpError extends Error {
  /**
   * @param {number} status HTTP status code, e.g. 404
   * @param {string} message user-facing message (Lao)
   * @param {string} code short machine-readable code, e.g. "email_taken"
   * @param {unknown} [details] optional extra data, e.g. field errors
   */
  constructor(status, message, code, details) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message, code = "bad_request", details) =>
  new HttpError(400, message, code, details);

export const unauthorized = (message, code = "unauthorized") =>
  new HttpError(401, message, code);

export const forbidden = (message, code = "forbidden") =>
  new HttpError(403, message, code);

export const notFoundError = (message, code = "not_found") =>
  new HttpError(404, message, code);

export const conflict = (message, code = "conflict") =>
  new HttpError(409, message, code);

export const unprocessable = (message, code = "validation_error", details) =>
  new HttpError(422, message, code, details);
