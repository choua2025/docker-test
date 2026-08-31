/**
 * Quiz scores.
 *
 * A student reads their own; nobody reads a student's scores by asking for
 * them by id, because the routes only ever pass `req.user.id` in. When
 * teachers need to see their class's results (phase 4) that will be a
 * separate, role-guarded function - not a parameter on this one.
 */
import { query } from "../config/db.js";

/**
 * Every attempt this person has made, newest first, with enough context to
 * be meaningful: which quiz, on which lesson, in which subject.
 */
export async function listResultsForUser(userId) {
  const { rows } = await query(
    `SELECT r.id, r.score, r.total_questions, r.taken_at,
            -- Stored as a whole number so the UI never has to round.
            round(r.score::numeric * 100 / r.total_questions)::int AS percent,
            q.id   AS quiz_id,
            q.title AS quiz_title,
            l.id   AS lesson_id,
            l.title AS lesson_title,
            s.id   AS subject_id,
            s.name AS subject_name
     FROM quiz_results r
     JOIN quizzes q  ON q.id = r.quiz_id
     JOIN lessons l  ON l.id = q.lesson_id
     JOIN subjects s ON s.id = l.subject_id
     WHERE r.user_id = $1
     ORDER BY r.taken_at DESC`,
    [userId],
  );

  return rows;
}

/** Headline numbers for the top of the student's scores page. */
export async function summariseResultsForUser(userId) {
  const { rows } = await query(
    `SELECT count(*)::int AS attempts,
            count(DISTINCT quiz_id)::int AS quizzes,
            round(avg(score::numeric * 100 / total_questions))::int AS average_percent,
            max(round(score::numeric * 100 / total_questions))::int AS best_percent
     FROM quiz_results
     WHERE user_id = $1`,
    [userId],
  );

  const row = rows[0];
  return {
    attempts: row.attempts,
    quizzes: row.quizzes,
    // avg() over zero rows is NULL; report 0 rather than leaking null to the UI.
    averagePercent: row.average_percent ?? 0,
    bestPercent: row.best_percent ?? 0,
  };
}
