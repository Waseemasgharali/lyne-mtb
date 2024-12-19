const express = require("express");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { Pool } = require("pg");

const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Configure Nodemailer for sending emails
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "reece020408@gmail.com", // Replace with your email
    pass: "lpjm kiwl ssme wuyx", // Replace with your app-specific password
  },
});

// Endpoint to initiate password reset
router.post("/reset-password", async (req, res) => {
  const { username, email } = req.body;

  const token = crypto.randomBytes(20).toString("hex");

  try {
    // Check if user exists in PostgreSQL
    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1 AND email = $2",
      [username, email]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update reset token in the database
    await pool.query("UPDATE users SET reset_token = $1 WHERE id = $2", [
      token,
      user.id,
    ]);

    // Generate password reset link
    const resetLink = `https://lynemtb.co.uk/set_new_password?token=${token}`;

    // Send reset email
    const mailOptions = {
      from: "reece020408@gmail.com",
      to: email,
      subject: "Password Reset",
      html: `<p>To reset your password, click on the following link: <a href="${resetLink}">${resetLink}</a></p>`,
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: "Password reset link sent to your email" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to send password reset email" });
  }
});

// Endpoint to update the password
router.post("/update_password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res
      .status(400)
      .json({ error: "Token and new password are required" });
  }

  try {
    // Find user by reset token in PostgreSQL
    const result = await pool.query(
      "SELECT * FROM users WHERE reset_token = $1",
      [token]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: "Token not found or expired" });
    }

    // Update password and clear reset token
    await pool.query(
      "UPDATE users SET password = $1, reset_token = NULL WHERE reset_token = $2",
      [newPassword, token]
    );

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update password" });
  }
});

module.exports = router;
