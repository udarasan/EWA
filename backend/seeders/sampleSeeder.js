import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import { generateSentimentFromText } from "../services/sentimentService.js";

dotenv.config();

const runSeeder = async () => {
  try {
    const adminPassword = await bcrypt.hash("Admin@123", 10);
    const employeePassword = await bcrypt.hash("Employee@123", 10);

    await pool.query("DELETE FROM feedback");
    await pool.query("DELETE FROM users WHERE email <> ?", ["admin@sentisphere.com"]);

    await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), password = VALUES(password), role = VALUES(role)`,
      ["HR Manager", "admin@sentisphere.com", adminPassword, "admin"]
    );

    const employees = [
      { name: "John Employee", email: "employee@sentisphere.com" },
      { name: "Nadeesha Perera", email: "nadeesha@sentisphere.com" },
      { name: "Kavindya Silva", email: "kavindya@sentisphere.com" },
      { name: "Arjun Ravi", email: "arjun@sentisphere.com" },
      { name: "Tharushi Fernando", email: "tharushi@sentisphere.com" },
      { name: "Mohan Raj", email: "mohan@sentisphere.com" },
      { name: "Sanjana Hettiarachchi", email: "sanjana@sentisphere.com" },
      { name: "Rashmi De Alwis", email: "rashmi@sentisphere.com" }
    ];

    for (const employee of employees) {
      await pool.query(
        `INSERT INTO users (name, email, password, role)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), password = VALUES(password), role = VALUES(role)`,
        [employee.name, employee.email, employeePassword, "employee"]
      );
    }

    const [employeeRows] = await pool.query(
      `SELECT id, name, email
       FROM users
       WHERE role = 'employee'
       ORDER BY id ASC`
    );

    const languageSamples = {
      English: [
        "I feel happy and good about our sprint planning this week.",
        "I am stressed about deadlines and unclear tasks.",
        "Workload is bad this month and stress is increasing.",
        "Support from my team is good and I feel motivated.",
        "I feel neutral about current project assignments."
      ],
      Sinhala: [
        "Ada mage wada hamadama good wage hithenawa.",
        "Deadline nisa mata stress danenawa.",
        "Team support eka hondai, mama happy.",
        "Mata ada neutral mood ekak thiyenawa.",
        "Schedule eka bad nisa pressure wedi."
      ],
      Tamil: [
        "Innaiku work nalla good irukku, happy feel panren.",
        "Deadline nala stress adhigam aa irukku.",
        "Team support good, confidence adhigam.",
        "Ippo neutral aa iruken about tasks.",
        "Project plan bad, romba pressure irukku."
      ]
    };

    const allLanguages = ["English", "Sinhala", "Tamil"];

    for (const employee of employeeRows) {
      const entriesPerEmployee = 8;
      for (let i = 0; i < entriesPerEmployee; i += 1) {
        const language = allLanguages[(employee.id + i) % allLanguages.length];
        const samples = languageSamples[language];
        const message = samples[(employee.id + i) % samples.length];
        const { sentimentScore, emotionLabel, mood } = await generateSentimentFromText(message);

        await pool.query(
          `INSERT INTO feedback (
            user_id, message, language, audio_path, sentiment_score, emotion_label, mood, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
          [
            employee.id,
            message,
            language,
            null,
            sentimentScore,
            emotionLabel,
            mood,
            (employee.id * 3 + i) % 30
          ]
        );
      }
    }

    console.log("Sample data seeded successfully.");
    console.log("Admin login: admin@sentisphere.com / Admin@123");
    console.log("Employee login: employee@sentisphere.com / Employee@123");
    process.exit(0);
  } catch (error) {
    console.error("Seeder failed:", error.message);
    process.exit(1);
  }
};

runSeeder();
