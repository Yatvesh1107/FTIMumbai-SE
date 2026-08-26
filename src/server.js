require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const nodemailer = require("nodemailer");
const connectDB = require("./config/db");

// Initialize Database
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: "*",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Uploads Directory Statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Email Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: String(process.env.SMTP_SECURE) !== "false",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function buildEnquiryMail({ name, mobile, email, course, message }) {
  const rows = [
    ["Name", name],
    ["Mobile No.", mobile],
    ["Email", email],
    ["Course", course],
    ...(message ? [["Message", message]] : []),
  ]
    .map(([k, v]) => `<tr><td style="padding:6px 14px;font-weight:600;">${k}</td><td>${v}</td></tr>`)
    .join("");

  return {
    from: `"FTI Mumbai Website" <${process.env.SMTP_USER}>`,
    to: process.env.MAIL_TO || process.env.SMTP_USER,
    replyTo: email,
    subject: `New Enquiry: ${course} - ${name}`,
    html: `
      <h2 style="color:#0B3C68;margin-bottom:4px;">New Course Enquiry</h2>
      <p style="color:#8A6A5B;margin-top:0;">Received via ftimumbai website enquiry form</p>
      <table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-color:#ddd;">
        ${rows}
      </table>`,
  };
}

// Health Check
app.get("/api/health", (_req, res) => res.json({ ok: true, timestamp: new Date() }));

// Mount API Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/courses", require("./routes/courseRoutes"));
app.use("/api/admissions", require("./routes/admissionRoutes"));
app.use("/api/fees", require("./routes/feeRoutes"));
app.use("/api/batches", require("./routes/batchRoutes"));
app.use("/api/lms", require("./routes/lmsRoutes"));
app.use("/api/academics", require("./routes/academicRoutes"));
app.use("/api/exams", require("./routes/examRoutes"));
app.use("/api/certificates", require("./routes/certificateRoutes"));
app.use("/api/marksheets", require("./routes/marksheetRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));

// Public Enquiry Form Route
app.post("/api/enquiry", async (req, res) => {
  const { name, mobile, email, course, message } = req.body || {};

  if (!name || !name.trim()) return res.status(400).json({ error: "Name is required" });
  if (!mobile || !mobile.trim()) return res.status(400).json({ error: "Mobile No. is required" });
  if (!email || !email.trim()) return res.status(400).json({ error: "Email is required" });
  if (!course || !course.trim()) return res.status(400).json({ error: "Course is required" });

  try {
    await transporter.sendMail(buildEnquiryMail({ name, mobile, email, course, message }));
    return res.status(201).json({ status: 201, message: "Query Added Successfully" });
  } catch (err) {
    console.error("Mail error:", err.message);
    return res.status(500).json({ error: "Could not send enquiry. Try again later." });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Express Error:", err.stack);
  res.status(500).json({ success: false, message: err.message || "Internal Server Error" });
});

// Increased timeouts for large video uploads + server-side compression (1 hour)
const { scheduleFeeReminders, scheduleLiveSessionStatus } = require('./cronJobs');

const server = app.listen(PORT, () => {
  console.log(`🚀 FTI Mumbai Backend Server running on http://localhost:${PORT}`);
  scheduleFeeReminders();
  scheduleLiveSessionStatus();
});
server.timeout = 3600000;
server.keepAliveTimeout = 3600000;
server.headersTimeout = 3605000;
