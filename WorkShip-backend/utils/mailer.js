/**
 * Nodemailer transport configuration.
 *
 * Reads credentials from environment variables so the actual secrets never
 * live in source code.  Set the following in your .env:
 *
 *   EMAIL_HOST=smtp.gmail.com
 *   EMAIL_PORT=587
 *   EMAIL_USER=your-email@gmail.com
 *   EMAIL_PASS=your-app-password        ← Gmail App Password (not account password)
 *   EMAIL_FROM="Workship <your-email@gmail.com>"
 *
 * For Gmail you must use an App Password generated at:
 *   https://myaccount.google.com/apppasswords
 */
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: process.env.EMAIL_PORT === '465', // true only for port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send the 6-digit OTP to the user's email address.
 * @param {string} to      - Recipient email address
 * @param {string} otp     - 6-digit OTP string
 */
async function sendOtpEmail(to, otp) {
  const from = process.env.EMAIL_FROM || `"Workship" <${process.env.EMAIL_USER}>`;

  await transporter.sendMail({
    from,
    to,
    subject: 'Your Workship password reset OTP',
    text: `Your OTP to reset your Workship password is: ${otp}\n\nThis code expires in 5 minutes. Do not share it with anyone.`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0f0f13; color: #f4f4f5; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -0.5px;">Workship</h1>
          <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.8);">Password Reset</p>
        </div>
        <div style="padding: 36px 32px;">
          <p style="margin: 0 0 16px; font-size: 15px; color: #a1a1aa;">Use the OTP below to reset your password. It expires in <strong style="color: #f4f4f5;">5 minutes</strong>.</p>
          <div style="text-align: center; margin: 28px 0;">
            <span style="display: inline-block; font-size: 42px; font-weight: 900; letter-spacing: 10px; color: #10b981; background: rgba(16,185,129,0.12); padding: 18px 28px; border-radius: 12px; border: 1.5px solid rgba(16,185,129,0.3);">${otp}</span>
          </div>
          <p style="margin: 0; font-size: 13px; color: #71717a;">If you didn't request this, you can safely ignore this email. Your password will not change.</p>
        </div>
        <div style="padding: 16px 32px 24px; text-align: center; border-top: 1px solid #27272a;">
          <p style="margin: 0; font-size: 12px; color: #52525b;">© ${new Date().getFullYear()} Workship · Do not reply to this email</p>
        </div>
      </div>
    `,
  });
}

module.exports = { sendOtpEmail };
