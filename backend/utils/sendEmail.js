const nodemailer = require('nodemailer');

// Sends transactional email via Gmail SMTP.
// Requires EMAIL_USER and EMAIL_PASS (16-character app password) in backend/.env.
module.exports = async function sendEmail({ to, subject, text }) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error('Email service is not configured. Set EMAIL_USER and EMAIL_PASS in backend/.env.');
    }
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    return transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, text });
};
