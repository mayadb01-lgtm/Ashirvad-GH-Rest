import nodemailer from "nodemailer";
import fs from "fs";

const sendMailWithAttachment = async () => {
  const BUSINESS_NAME =
    process.env.VITE_REACT_APP_BUSINESS_NAME || "Your Business";

  const transporter = nodemailer.createTransport({
    host: process.env.SMPT_HOST,
    port: process.env.SMPT_PORT,
    service: process.env.SMPT_SERVICE,
    auth: {
      user: process.env.SMPT_MAIL,
      pass: process.env.SMPT_PASSWORD,
    },
  });

  const mailOptions = {
    from: `"${BUSINESS_NAME} Backup Service" <${process.env.SMPT_MAIL}>`,
    to: process.env.SMPT_MAIL_RECEIVER, // client's email
    subject: `📦 Monthly MongoDB Backup - ${BUSINESS_NAME}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
        <h2 style="color: #333;">📦 MongoDB Backup Report - ${BUSINESS_NAME}</h2>
        <p>Hello,</p>
        <p>Your latest <strong>MongoDB backup</strong> is ready. Please find the <code>backup.zip</code> file attached with this email.</p>

        <div style="margin: 20px 0; padding: 15px; background-color: #fff3cd; color: #856404; border: 1px solid #ffeeba; border-radius: 5px;">
          ⚠️ <strong>Important:</strong> Store this backup file securely and do not share it with unauthorized users.
        </div>

        <p style="margin-top: 40px;">Best regards,<br>
        <strong>The ${BUSINESS_NAME} Team</strong></p>

        <hr style="margin: 30px 0;">
        <footer style="font-size: 12px; color: #888;">
          This is an automated email. Please do not reply directly.<br>
          &copy; ${new Date().getFullYear()} ${BUSINESS_NAME}
        </footer>
      </div>
    `,
    attachments: [
      {
        filename: "backup.zip",
        content: fs.createReadStream("backup.zip"),
      },
    ],
  };

  await transporter.sendMail(mailOptions);
  console.log(`📧 Email sent successfully from ${BUSINESS_NAME}`);
};

export default sendMailWithAttachment;
