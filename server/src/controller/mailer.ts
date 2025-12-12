import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { config } from '../config/config';

// OAuth2 setup
const OAuth2 = google.auth.OAuth2;

const createTransporter = async () => {
  const oauth2Client = new OAuth2(
    config.clientId,
    config.clientSecret,
    'https://developers.google.com/oauthplayground' // Redirect URL for testing
  );

  oauth2Client.setCredentials({
    refresh_token: config.refreshToken,
  });

  try {
    const accessToken = await new Promise<string>((resolve, reject) => {
      oauth2Client.getAccessToken((err, token) => {
        if (err) {
          console.error('Error retrieving access token:', err);
          reject(new Error('Error retrieving access token'));
        } else {
          resolve(token || '');
        }
      });
    });

    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: config.emailUser,
        accessToken,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        refreshToken: config.refreshToken,
      },
    });
  } catch (error) {
    console.error('Error creating transporter:', error);
    throw new Error('Error creating transporter');
  }
};

export const sendVerificationEmail = async (email: string, token: string) => {
  const transporter = await createTransporter();
  const verificationUrl = `${config.frontendDomain}/auth/login?token=${token}`;
  const mailOptions = {
    from: config.emailUser,
    to: email,
    subject: 'Verify Your Email',
    text: `Please click on the following link to verify your email: ${verificationUrl}`,
    html: `<p>Please click on the following link to verify your email:</p><a href="${verificationUrl}">${verificationUrl}</a>`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Error while sending verification email');
  }
};

export const sendResetPasswordEmail = async (email: string, token: string) => {
  const transporter = await createTransporter();
  const resetUrl = `${config.frontendDomain}/auth/login?forgottoken=${token}`;
  const mailOptions = {
    from: config.emailUser,
    to: email,
    subject: 'Reset Your Password',
    text: `Please click on the following link to reset your password: ${resetUrl}`,
    html: `<p>Please click on the following link to reset your password:</p><a href="${resetUrl}">${resetUrl}</a>`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending reset password email:', error);
    throw new Error('Error while sending reset password email');
  }
};
