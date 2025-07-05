import nodemailer from "nodemailer";
import fs from "fs";

const sendMailWithAttachment = async () => {
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
    from: `"TGT" <${process.env.SMPT_MAIL}>`,
    to: "harshprajapati9023@gmail.com", // <-- client's email here
    subject: "MongoDB Backup - TGT",
    text: "Attached is the latest MongoDB backup (JSON zipped).",
    attachments: [
      {
        filename: "backup.zip",
        content: fs.createReadStream("backup.zip"),
      },
    ],
  };

  await transporter.sendMail(mailOptions);
  console.log("📧 Email sent successfully to client");
};

export default sendMailWithAttachment;
