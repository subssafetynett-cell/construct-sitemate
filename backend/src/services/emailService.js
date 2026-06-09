const nodemailer = require("nodemailer");

// Create a transporter using SMTP transport
// You should configure these environment variables
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.example.com",
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER || "user@example.com",
        pass: process.env.SMTP_PASS || "password",
    },
    connectionTimeout: 5000, // 5 seconds
    greetingTimeout: 5000,   // 5 seconds
    socketTimeout: 5000,     // 5 seconds
});

console.log("Email Service Initialized with:");
console.log("Host:", process.env.SMTP_HOST ? process.env.SMTP_HOST : "USING DEFAULT MOCK");
console.log("User:", process.env.SMTP_USER ? process.env.SMTP_USER : "USING DEFAULT MOCK");

/**  
 * Send an email 
 * @param {Object} options
 * @param {string} options.to - Recipient email 
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.replyTo - Reply-to email address
 */
const sendEmail = async ({ to, subject, html, replyTo, from }) => {
    try {
        const info = await transporter.sendMail({
            from: from || process.env.SMTP_FROM || '"Safety App" <no-reply@example.com>', // sender address
            to, // list of receivers
            subject, // Subject line
            html, // html body
            replyTo, // reply-to address
        });

        console.log("Message sent: %s", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("Error sending email:", error);
        return { success: false, error: error.message }; 
    }
};

module.exports = { sendEmail };
