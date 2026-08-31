/**
 * The last two middlewares in the stack: one for "no route matched",
 * one that turns any thrown error into a consistent JSON response.
 *
 * Every error response has the same shape, so the frontend only ever
 * needs to read `error.message` to show something useful:
 *
 *   { "error": { "code": "email_taken", "message": "...", "details": ... } }
 */
import { HttpError } from "../utils/httpError.js";
import { env } from "../config/env.js";

export function notFound(req, res, next) {
  next(new HttpError(404, "ບໍ່ພົບເສັ້ນທາງທີ່ຮ້ອງຂໍ", "route_not_found"));
}

// Express recognises an error handler by its four arguments - `next` must
// stay in the signature even though it is not used here.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // Body-parser rejects malformed JSON with a 400 and a `body` property.
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({
      error: { code: "invalid_json", message: "ຮູບແບບຂໍ້ມູນ JSON ບໍ່ຖືກຕ້ອງ" },
    });
  }

  // Anything else is an unexpected bug: log it in full for us, but send the
  // user a generic message so stack traces and SQL never reach the browser.
  console.error("[error]", err);

  res.status(500).json({
    error: {
      code: "internal_error",
      message: "ເກີດຂໍ້ຜິດພາດພາຍໃນລະບົບ ກະລຸນາລອງໃໝ່ອີກຄັ້ງ",
      ...(env.isProduction ? {} : { details: err?.message }),
    },
  });
}
