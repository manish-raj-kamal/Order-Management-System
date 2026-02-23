const nodemailer = require('nodemailer');

const parseBoolean = (value, defaultValue = false) => {
    if (typeof value !== 'string') {
        return defaultValue;
    }
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const getMailerConfig = () => {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = parseBoolean(process.env.SMTP_SECURE, false);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;

    return {
        host,
        port,
        secure,
        user,
        pass,
        from,
        enabled: Boolean(host && port && user && pass && from)
    };
};

const createTransporter = () => {
    const config = getMailerConfig();
    if (!config.enabled) {
        return null;
    }

    return nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
            user: config.user,
            pass: config.pass
        }
    });
};

const sendEmailOtp = async ({ to, name, otp, expiryMinutes }) => {
    const config = getMailerConfig();
    const transporter = createTransporter();
    const subject = 'Verify your email address';
    const html = `
        <div style="font-family: Arial, sans-serif; color: #1f2c3f;">
            <h2 style="margin-bottom: 8px;">Email Verification</h2>
            <p style="margin: 0 0 12px 0;">Hi ${name || 'User'},</p>
            <p style="margin: 0 0 12px 0;">Use this OTP to verify your account:</p>
            <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; margin: 0 0 14px 0;">${otp}</p>
            <p style="margin: 0;">This OTP expires in ${expiryMinutes} minutes.</p>
        </div>
    `;

    if (!config.enabled || !transporter) {
        // Development fallback: keeps flow testable without SMTP config.
        console.log(`[OTP DEV MODE] Email: ${to} OTP: ${otp}`);
        return { delivered: false, mode: 'log' };
    }

    await transporter.sendMail({
        from: config.from,
        to,
        subject,
        html
    });

    return { delivered: true, mode: 'smtp' };
};

module.exports = {
    sendEmailOtp
};
