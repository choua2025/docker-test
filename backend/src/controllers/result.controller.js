import * as resultService from "../services/result.service.js";

/**
 * GET /api/results/me
 *
 * Deliberately has no :id. A student can only ever ask for their own scores
 * because the user id comes from the verified token, never from the URL.
 */
export async function myResults(req, res) {
  const [results, summary] = await Promise.all([
    resultService.listResultsForUser(req.user.id),
    resultService.summariseResultsForUser(req.user.id),
  ]);

  res.json({ results, summary });
}
