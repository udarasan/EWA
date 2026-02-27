import pool from "../config/db.js";

export const createFeedback = async ({
  userId,
  message,
  language,
  audioPath,
  sentimentScore,
  emotionLabel,
  mood
}) => {
  const [result] = await pool.query(
    `INSERT INTO feedback (
      user_id,
      message,
      language,
      audio_path,
      sentiment_score,
      emotion_label,
      mood
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, message, language, audioPath, sentimentScore, emotionLabel, mood]
  );
  return result.insertId;
};

export const getFeedbackByUser = async (userId) => {
  const [rows] = await pool.query(
    `SELECT id, message, language, audio_path, sentiment_score, emotion_label, mood, created_at
     FROM feedback
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
};

export const getFeedbackSummaryByUser = async (userId) => {
  const [[summary]] = await pool.query(
    `SELECT
      COUNT(*) AS total_count,
      ROUND(AVG(sentiment_score), 2) AS avg_sentiment,
      SUM(CASE WHEN emotion_label = 'Positive' THEN 1 ELSE 0 END) AS positive_count,
      SUM(CASE WHEN emotion_label = 'Negative' THEN 1 ELSE 0 END) AS negative_count,
      SUM(CASE WHEN emotion_label = 'Neutral' THEN 1 ELSE 0 END) AS neutral_count
     FROM feedback
     WHERE user_id = ?`,
    [userId]
  );
  return summary;
};

export const getFeedbackStats = async () => {
  const [[{ totalFeedback }]] = await pool.query(
    "SELECT COUNT(*) AS totalFeedback FROM feedback"
  );

  const [sentimentBreakdown] = await pool.query(
    `SELECT emotion_label, COUNT(*) AS count
     FROM feedback
     GROUP BY emotion_label`
  );

  const [moodBreakdown] = await pool.query(
    `SELECT mood, COUNT(*) AS count
     FROM feedback
     GROUP BY mood`
  );

  const [recentFeedback] = await pool.query(
    `SELECT
      f.id,
      u.name AS employee_name,
      f.language,
      f.message,
      f.mood,
      f.emotion_label,
      f.sentiment_score,
      f.created_at
     FROM feedback f
     JOIN users u ON u.id = f.user_id
     ORDER BY f.created_at DESC
     LIMIT 10`
  );

  return { totalFeedback, sentimentBreakdown, moodBreakdown, recentFeedback };
};

export const getFeedbackTrend = async (days = 14) => {
  const safeDays = Number.isFinite(Number(days)) ? Math.max(1, Math.min(Number(days), 90)) : 14;
  const [rows] = await pool.query(
    `SELECT DATE(created_at) AS day, COUNT(*) AS count
     FROM feedback
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY DATE(created_at)
     ORDER BY day ASC`,
    [safeDays]
  );
  return rows;
};

export const getEmployeeWellbeingSnapshot = async () => {
  const [rows] = await pool.query(
    `SELECT
      u.id AS user_id,
      u.name,
      u.email,
      COUNT(f.id) AS feedback_count,
      ROUND(AVG(f.sentiment_score), 2) AS avg_sentiment,
      SUM(CASE WHEN f.emotion_label = 'Negative' THEN 1 ELSE 0 END) AS negative_count,
      MAX(f.created_at) AS last_feedback_at
     FROM users u
     LEFT JOIN feedback f ON f.user_id = u.id
     WHERE u.role = 'employee'
     GROUP BY u.id, u.name, u.email
     ORDER BY avg_sentiment ASC, negative_count DESC`
  );
  return rows;
};

export const getFilteredFeedbackForAdmin = async (filters) => {
  const { language, mood, emotion, fromDate, toDate, query } = filters;
  const clauses = [];
  const params = [];

  if (language) {
    clauses.push("f.language = ?");
    params.push(language);
  }
  if (mood) {
    clauses.push("f.mood = ?");
    params.push(mood);
  }
  if (emotion) {
    clauses.push("f.emotion_label = ?");
    params.push(emotion);
  }
  if (fromDate) {
    clauses.push("DATE(f.created_at) >= ?");
    params.push(fromDate);
  }
  if (toDate) {
    clauses.push("DATE(f.created_at) <= ?");
    params.push(toDate);
  }
  if (query) {
    clauses.push("(f.message LIKE ? OR u.name LIKE ?)");
    const likeQuery = `%${query}%`;
    params.push(likeQuery, likeQuery);
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `SELECT
      f.id,
      u.name AS employee_name,
      u.email AS employee_email,
      f.language,
      f.message,
      f.mood,
      f.emotion_label,
      f.sentiment_score,
      f.created_at
     FROM feedback f
     JOIN users u ON u.id = f.user_id
     ${whereSql}
     ORDER BY f.created_at DESC
     LIMIT 200`,
    params
  );

  return rows;
};
