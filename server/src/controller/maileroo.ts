import nodemailer from 'nodemailer';
import { config } from "../config/config";

/**
 * Create Maileroo SMTP transporter
 */
const createMailerooTransporter = () => {
    const host = process.env.MAILEROO_SMTP_HOST || 'smtp.maileroo.com';
    const port = parseInt(process.env.MAILEROO_SMTP_PORT || '587');
    const user = process.env.MAILEROO_SMTP_USER;
    const pass = process.env.MAILEROO_SMTP_PASS;

    if (!user || !pass) {
        throw new Error("MAILEROO_SMTP_USER and MAILEROO_SMTP_PASS must be defined in environment variables");
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: false, // true for 465, false for other ports (587 uses STARTTLS)
        auth: {
            user,
            pass,
        },
    });
};

/**
 * Email template for welcome/verification email
 */
const getWelcomeEmailTemplate = (userName: string, verificationUrl: string): { html: string; text: string } => {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to TourBNT</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="padding: 40px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Welcome to TourBNT!</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Hello ${userName}! 👋</h2>
                  <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                    Thank you for joining TourBNT - your gateway to amazing travel experiences! We're excited to have you on board.
                  </p>
                  <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                    To get started and verify your email address, please click the button below:
                  </p>
                  
                  <!-- CTA Button -->
                  <table role="presentation" style="margin: 0 auto;">
                    <tr>
                      <td style="border-radius: 4px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <a href="${verificationUrl}" target="_blank" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 4px;">
                          Verify Email Address
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 30px 0 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                    Or copy and paste this link into your browser:
                  </p>
                  <p style="margin: 0 0 30px 0; color: #667eea; font-size: 14px; word-break: break-all;">
                    ${verificationUrl}
                  </p>
                  
                  <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-left: 4px solid #667eea; border-radius: 4px;">
                    <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                      <strong>⏰ This link will expire in 1 hour</strong> for security reasons. If you didn't create an account with TourBNT, please ignore this email.
                    </p>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px; background-color: #f8f9fa; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px;">
                    Need help? Contact us at <a href="mailto:support@tourbnt.com" style="color: #667eea; text-decoration: none;">support@tourbnt.com</a>
                  </p>
                  <p style="margin: 0; color: #999999; font-size: 12px;">
                    © ${new Date().getFullYear()} TourBNT. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

    const text = `
Welcome to TourBNT!

Hello ${userName}!

Thank you for joining TourBNT - your gateway to amazing travel experiences! We're excited to have you on board.

To get started and verify your email address, please click the link below:

${verificationUrl}

⏰ This link will expire in 1 hour for security reasons.

If you didn't create an account with TourBNT, please ignore this email.

Need help? Contact us at support@tourbnt.com

© ${new Date().getFullYear()} TourBNT. All rights reserved.
  `.trim();

    return { html, text };
};

/**
 * Email template for password reset
 */
const getPasswordResetTemplate = (userName: string, resetUrl: string): { html: string; text: string } => {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password - TourBNT</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="padding: 40px 30px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Password Reset Request</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Hello ${userName}! 🔐</h2>
                  <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                    We received a request to reset your password for your TourBNT account. Don't worry, we're here to help!
                  </p>
                  <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                    Click the button below to create a new password:
                  </p>
                  
                  <!-- CTA Button -->
                  <table role="presentation" style="margin: 0 auto;">
                    <tr>
                      <td style="border-radius: 4px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                        <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 4px;">
                          Reset Password
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 30px 0 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                    Or copy and paste this link into your browser:
                  </p>
                  <p style="margin: 0 0 30px 0; color: #f5576c; font-size: 14px; word-break: break-all;">
                    ${resetUrl}
                  </p>
                  
                  <div style="margin: 30px 0; padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                    <p style="margin: 0 0 10px 0; color: #856404; font-size: 14px; line-height: 1.6;">
                      <strong>⚠️ Security Notice:</strong>
                    </p>
                    <ul style="margin: 0; padding-left: 20px; color: #856404; font-size: 14px; line-height: 1.6;">
                      <li>This link will expire in 1 hour</li>
                      <li>If you didn't request a password reset, please ignore this email</li>
                      <li>Your password won't change until you create a new one</li>
                    </ul>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px; background-color: #f8f9fa; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px;">
                    Need help? Contact us at <a href="mailto:support@tourbnt.com" style="color: #f5576c; text-decoration: none;">support@tourbnt.com</a>
                  </p>
                  <p style="margin: 0; color: #999999; font-size: 12px;">
                    © ${new Date().getFullYear()} TourBNT. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

    const text = `
Password Reset Request - TourBNT

Hello ${userName}!

We received a request to reset your password for your TourBNT account. Don't worry, we're here to help!

Click the link below to create a new password:

${resetUrl}

⚠️ Security Notice:
- This link will expire in 1 hour
- If you didn't request a password reset, please ignore this email
- Your password won't change until you create a new one

Need help? Contact us at support@tourbnt.com

© ${new Date().getFullYear()} TourBNT. All rights reserved.
  `.trim();

    return { html, text };
};

/**
 * Send verification email to newly registered user
 * @param email - User's email address
 * @param userName - User's name
 * @param token - Verification token
 * @returns Promise<string> - Message ID of sent email
 */
export const sendVerificationEmail = async (
    email: string,
    userName: string,
    token: string
): Promise<string> => {
    try {
        const transporter = createMailerooTransporter();
        const verificationUrl = `${config.frontendDomain}/auth/login?token=${token}`;
        const { html, text } = getWelcomeEmailTemplate(userName, verificationUrl);

        const fromEmail = process.env.MAILEROO_FROM_EMAIL || process.env.MAILEROO_SMTP_USER || "info@tourbnt.com";

        const info = await transporter.sendMail({
            from: `"TourBNT" <${fromEmail}>`,
            to: email,
            subject: "Welcome to TourBNT - Verify Your Email",
            text,
            html,
        });

        console.log(`✅ Verification email sent to ${email} with message ID:`, info.messageId);
        return info.messageId;
    } catch (error) {
        console.error("❌ Error sending verification email:", error);
        throw new Error("Failed to send verification email");
    }
};

/**
 * Send password reset email to user
 * @param email - User's email address
 * @param userName - User's name
 * @param token - Password reset token
 * @returns Promise<string> - Message ID of sent email
 */
export const sendResetPasswordEmail = async (
    email: string,
    userName: string,
    token: string
): Promise<string> => {
    try {
        const transporter = createMailerooTransporter();
        const resetUrl = `${config.frontendDomain}/auth/login?forgottoken=${token}`;
        const { html, text } = getPasswordResetTemplate(userName, resetUrl);

        const fromEmail = process.env.MAILEROO_FROM_EMAIL || process.env.MAILEROO_SMTP_USER || "info@tourbnt.com";

        const info = await transporter.sendMail({
            from: `"TourBNT" <${fromEmail}>`,
            to: email,
            subject: "Reset Your Password - TourBNT",
            text,
            html,
        });

        console.log(`✅ Password reset email sent to ${email} with message ID:`, info.messageId);
        return info.messageId;
    } catch (error) {
        console.error("❌ Error sending password reset email:", error);
        throw new Error("Failed to send password reset email");
    }
};
