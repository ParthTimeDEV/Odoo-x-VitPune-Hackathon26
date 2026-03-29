const nodemailer = require("nodemailer");

let cachedTransporter = null;

function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    streamTransport: true,
    newline: "unix",
    buffer: true
  });
  return cachedTransporter;
}

async function sendTemporaryPasswordEmail({ toEmail, userName, tempPassword }) {
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@reimbursements.local";
  const transporter = getTransporter();

  const info = await transporter.sendMail({
    from: fromEmail,
    to: toEmail,
    subject: "Your temporary password",
    text: `Hello ${userName},\n\nYour temporary password is: ${tempPassword}\n\nPlease log in and change your password immediately.\n\nThanks,\nReimbursement Management System`
  });

  if (info?.message) {
    console.log("[Email Preview]", info.message.toString());
  }

  return info;
}

module.exports = {
  sendTemporaryPasswordEmail
};
