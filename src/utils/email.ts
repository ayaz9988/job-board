import { Resend } from "resend";
import { httpLogger } from "../logger"; // Adjust path to your logger file
import { env } from "../config/env"; // Your Zod-validated env file

const resend = new Resend(env.RESEND_API_KEY);

interface SendAuthEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendAuthEmail({ to, subject, html }: SendAuthEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM, // e.g., "Job Board <noreply@yourdomain.com>"
      to,
      subject,
      html,
    });

    if (error) {
      // Your logger will automatically redact if 'to' somehow contained sensitive keys, 
      // and it will format this beautifully with your appVersion and pid.
      httpLogger.error("Email delivery failed", { 
        error: error.message, 
        to, 
        subject,
        provider: "resend"
      });
      throw new Error(`Email delivery failed: ${error.message}`);
    }

    httpLogger.info("Auth email sent successfully", { 
      emailId: data?.id, 
      to, 
      subject,
      provider: "resend"
    });
    
    return data;
  } catch (error) {
    httpLogger.error("Exception while sending auth email", { 
      error: error instanceof Error ? error.message : String(error),
      to,
      subject,
      provider: "resend"
    });
    throw error;
  }
}