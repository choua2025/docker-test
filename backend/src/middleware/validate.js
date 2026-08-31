/**
 * Turns a zod schema into Express middleware.
 *
 * On success it REPLACES req.body with the parsed value, so controllers can
 * trust that every field exists and has the right type. Unknown fields are
 * dropped by zod, which stops a client from smuggling in extra columns
 * (for example `role: "admin"` on an endpoint that should not accept it).
 */
import { unprocessable } from "../utils/httpError.js";

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // { email: ["ອີເມວບໍ່ຖືກຕ້ອງ"], password: [...] }
      const fieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path.join(".") || "_";
        (fieldErrors[field] ??= []).push(issue.message);
      }
      return next(unprocessable("ຂໍ້ມູນທີ່ປ້ອນບໍ່ຖືກຕ້ອງ", "validation_error", fieldErrors));
    }

    req.body = result.data;
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(unprocessable("ຄ່າທີ່ສົ່ງມາບໍ່ຖືກຕ້ອງ", "validation_error"));
    }
    // req.query is a getter-only property in Express 5, so keep the parsed
    // copy somewhere else instead of assigning to it.
    req.validatedQuery = result.data;
    next();
  };
}
