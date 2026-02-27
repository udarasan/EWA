import {
  getEmployeeWellbeingSnapshot,
  getFeedbackStats,
  getFeedbackTrend,
  getFilteredFeedbackForAdmin
} from "../models/feedbackModel.js";

export const getDashboard = async (_req, res) => {
  try {
    const data = await getFeedbackStats();

    const sentiment = {
      Positive: 0,
      Negative: 0,
      Neutral: 0
    };

    for (const item of data.sentimentBreakdown) {
      sentiment[item.emotion_label] = Number(item.count);
    }

    return res.json({
      totalFeedback: data.totalFeedback,
      sentiment,
      moodDistribution: data.moodBreakdown,
      recentFeedback: data.recentFeedback
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load dashboard.", error: error.message });
  }
};

export const getTrend = async (req, res) => {
  try {
    const days = Number(req.query.days || 14);
    const trend = await getFeedbackTrend(days);
    return res.json({ days: Number.isFinite(days) ? days : 14, trend });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load trend data.", error: error.message });
  }
};

export const getEmployeeInsights = async (_req, res) => {
  try {
    const employees = await getEmployeeWellbeingSnapshot();
    return res.json({ employees });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to load employee insights.", error: error.message });
  }
};

export const getFeedbackExplorer = async (req, res) => {
  try {
    const data = await getFilteredFeedbackForAdmin({
      language: req.query.language || "",
      mood: req.query.mood || "",
      emotion: req.query.emotion || "",
      fromDate: req.query.fromDate || "",
      toDate: req.query.toDate || "",
      query: req.query.query || ""
    });
    return res.json({ feedback: data });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to load filtered feedback.", error: error.message });
  }
};
