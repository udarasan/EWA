import {
  createFeedback,
  getFeedbackByUser,
  getFeedbackSummaryByUser
} from "../models/feedbackModel.js";
import {
  generateSentimentFromText,
  mapApiPayloadToSentiment,
  stressLevelToMood,
  voiceAndStressFromFile
} from "../services/sentimentService.js";

export const submitFeedback = async (req, res) => {
  try {
    const { message, language } = req.body;

    if (!message || !language) {
      return res.status(400).json({ message: "Message and language are required." });
    }

    const allowedLanguages = ["Sinhala", "Tamil", "English"];

    if (!allowedLanguages.includes(language)) {
      return res.status(400).json({ message: "Invalid language selected." });
    }

    let sentimentScore;
    let emotionLabel;
    let mood;
    try {
      ({ sentimentScore, emotionLabel, mood } = await generateSentimentFromText(message));
    } catch (err) {
      return res.status(503).json({
        message: err.message || "Stress analysis is unavailable."
      });
    }
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

/**
 * Voice check-in: optional live transcript from the browser (Web Speech API);
 * if missing, the model service transcribes the uploaded audio via /voice-and-stress.
 */
export const submitVoiceFeedback = async (req, res) => {
  try {
    const language = req.body?.language;
    const liveTranscript = String(req.body?.transcript || "").trim();

    const allowedLanguages = ["Sinhala", "Tamil", "English"];
    if (!language || !allowedLanguages.includes(language)) {
      return res.status(400).json({ message: "Valid language is required." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Audio recording is required." });
    }

    let message;
    let sentimentScore;
    let emotionLabel;
    let mood;

    if (liveTranscript) {
      message = liveTranscript;
      try {
        ({ sentimentScore, emotionLabel, mood } = await generateSentimentFromText(message));
      } catch (err) {
        return res.status(503).json({
          message: err.message || "Stress analysis is unavailable."
        });
      }
    } else {
      let payload;
      try {
        payload = await voiceAndStressFromFile(
          req.file.path,
          req.file.originalname,
          language
        );
      } catch (err) {
        return res.status(503).json({
          message: err.message || "Voice analysis is unavailable."
        });
      }
      message = String(payload.text || "").trim();
      if (!message) {
        return res.status(400).json({
          message:
            "No speech detected in the recording. Try again or wait for live captions."
        });
      }
      const mapped = mapApiPayloadToSentiment(payload);
      if (!mapped) {
        return res.status(503).json({ message: "Stress analysis returned an invalid result." });
      }
      mood = stressLevelToMood(mapped.stressLevel);
      sentimentScore =
        Math.round(Math.min(0.99, Math.max(0.01, mapped.sentimentScore)) * 100) / 100;
      emotionLabel = mapped.emotionLabel;
    }

    const audioPath = `/uploads/${req.file.filename}`;

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
      message: "Voice feedback saved.",
      feedback: {
        id: feedbackId,
        transcript: message,
        sentimentScore,
        emotionLabel,
        mood,
        audioPath
      }
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to submit voice feedback.", error: error.message });
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
