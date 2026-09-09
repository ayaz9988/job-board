// Keep your HTML clean and inline-styled for maximum email client compatibility
export const verificationTemplate = (url: string, name?: string) => `
  <!DOCTYPE html>
  <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #111;">Verify your email address</h2>
        <p>Hello ${name || "there"},</p>
        <p>Thank you for signing up! Please verify your email address by clicking the button below.</p>
        <a href="${url}" style="display: inline-block; background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Verify Email
        </a>
        <p style="font-size: 14px; color: #666;">If you didn't create an account, you can safely ignore this email.</p>
        <p style="font-size: 12px; color: #999;">This link will expire in 24 hours.</p>
      </div>
    </body>
  </html>
`;

export const resetPasswordTemplate = (url: string, name?: string) => `
  <!DOCTYPE html>
  <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #111;">Reset your password</h2>
        <p>Hello ${name || "there"},</p>
        <p>We received a request to reset your password. Click the button below to choose a new one.</p>
        <a href="${url}" style="display: inline-block; background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Reset Password
        </a>
        <p style="font-size: 14px; color: #666;">If you didn't request a password reset, please ignore this email or contact support.</p>
      </div>
    </body>
  </html>
`;
