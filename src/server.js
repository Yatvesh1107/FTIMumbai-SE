require("dotenv").config();
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

app.get("/api/health", (_req, res) => res.json({ ok: true }));

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

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
