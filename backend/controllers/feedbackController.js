import {
  createFeedback,
  getFeedbackByUser,
  getFeedbackSummaryByUser
} from "../models/feedbackModel.js";
import { generateSentimentFromText } from "../services/sentimentService.js";

export const submitFeedback = async (req, res) => {
  try {
    const { message, language, mood } = req.body;

    if (!message || !language || !mood) {
      return res.status(400).json({ message: "Message, language and mood are required." });
    }

    const allowedLanguages = ["Sinhala", "Tamil", "English"];
    const allowedMoods = ["Happy", "Neutral", "Stressed", "Angry"];

    if (!allowedLanguages.includes(language)) {
      return res.status(400).json({ message: "Invalid language selected." });
    }

    if (!allowedMoods.includes(mood)) {
      return res.status(400).json({ message: "Invalid mood selected." });
    }

    // AI integration point: replace this local call with FastAPI microservice request.
    const { sentimentScore, emotionLabel } = generateSentimentFromText(message, mood);
    const audioPath = req.file ? `/uploads/${req.file.filename}` : null;

    const feedbackId = await createFeedback({
      userId: req.user.id,
      message,
      language,
      audioPath,
      sentimentScore,
      emotionLabel,
      mood
    });

    return res.status(201).json({
      message: "Feedback submitted successfully.",
      feedback: {
        id: feedbackId,
        sentimentScore,
        emotionLabel,
        audioPath
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to submit feedback.", error: error.message });
  }
};

export const getMyFeedback = async (req, res) => {
  try {
    const feedback = await getFeedbackByUser(req.user.id);
    return res.json({ feedback });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch feedback.", error: error.message });
  }
};

export const getMyFeedbackSummary = async (req, res) => {
  try {
    const summary = await getFeedbackSummaryByUser(req.user.id);
    return res.json({ summary });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch feedback summary.", error: error.message });
  }
};
