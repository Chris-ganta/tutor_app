import { Resend } from "resend";

let resendInstance: Resend | null = null;

function getResend(): Resend {
    if (!resendInstance) {
        resendInstance = new Resend(process.env.RESEND_API_KEY);
    }
    return resendInstance;
}

const FROM_EMAIL = "TutorTrack <onboarding@resend.dev>";

export interface EmailResult {
    success: boolean;
    error?: string;
}

export async function sendClassSummary(
    parentEmail: string,
    parentName: string,
    studentName: string,
    tutorName: string,
    date: string,
    durationMinutes: number,
    summary: string
): Promise<EmailResult> {
    try {
        const resend = getResend();
        await resend.emails.send({
            from: FROM_EMAIL,
            to: parentEmail,
            subject: `Class Summary for ${studentName} - ${date}`,
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                    <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; border-radius: 12px 12px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">📚 Class Summary</h1>
                    </div>
                    <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                        <p style="color: #374151; font-size: 16px;">Hi ${parentName},</p>
                        <p style="color: #374151; font-size: 16px;">Here's a summary of <strong>${studentName}</strong>'s recent tutoring session:</p>
                        
                        <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">📅 Date</td>
                                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${date}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">⏱️ Duration</td>
                                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${durationMinutes} minutes</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">👩‍🏫 Tutor</td>
                                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${tutorName}</td>
                                </tr>
                            </table>
                        </div>

                        ${summary ? `
                        <div style="margin: 20px 0;">
                            <h3 style="color: #374151; font-size: 16px; margin-bottom: 8px;">Session Notes</h3>
                            <p style="color: #4b5563; font-size: 14px; line-height: 1.6; background: #f0fdf4; padding: 16px; border-radius: 8px; border-left: 4px solid #22c55e;">${summary}</p>
                        </div>
                        ` : ""}

                        <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">Sent via TutorTrack</p>
                    </div>
                </div>
            `,
        });
        return { success: true };
    } catch (error: any) {
        console.error("Failed to send class summary email:", error);
        return { success: false, error: error.message || "Failed to send email" };
    }
}

export async function sendPaymentReminder(
    parentEmail: string,
    parentName: string,
    studentName: string,
    tutorName: string,
    amountDue: number,
    unpaidSessions: number
): Promise<EmailResult> {
    try {
        const resend = getResend();
        await resend.emails.send({
            from: FROM_EMAIL,
            to: parentEmail,
            subject: `Payment Reminder for ${studentName}'s Tutoring`,
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                    <div style="background: linear-gradient(135deg, #f59e0b, #ef4444); padding: 32px; border-radius: 12px 12px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">💰 Payment Reminder</h1>
                    </div>
                    <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                        <p style="color: #374151; font-size: 16px;">Hi ${parentName},</p>
                        <p style="color: #374151; font-size: 16px;">This is a friendly reminder about the outstanding balance for <strong>${studentName}</strong>'s tutoring sessions.</p>
                        
                        <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                            <p style="color: #92400e; font-size: 14px; margin: 0 0 4px 0;">Amount Due</p>
                            <p style="color: #92400e; font-size: 36px; font-weight: 700; margin: 0;">$${amountDue}</p>
                            <p style="color: #b45309; font-size: 14px; margin: 8px 0 0 0;">${unpaidSessions} unpaid session${unpaidSessions !== 1 ? "s" : ""}</p>
                        </div>

                        <p style="color: #4b5563; font-size: 14px;">Please arrange payment at your earliest convenience. If you've already paid, please disregard this reminder.</p>
                        
                        <p style="color: #374151; font-size: 14px; margin-top: 24px;">Best regards,<br/><strong>${tutorName}</strong></p>
                        <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">Sent via TutorTrack</p>
                    </div>
                </div>
            `,
        });
        return { success: true };
    } catch (error: any) {
        console.error("Failed to send payment reminder email:", error);
        return { success: false, error: error.message || "Failed to send email" };
    }
}

export async function sendCustomNotification(
    parentEmail: string,
    parentName: string,
    studentName: string,
    tutorName: string,
    subject: string,
    message: string
): Promise<EmailResult> {
    try {
        const resend = getResend();
        await resend.emails.send({
            from: FROM_EMAIL,
            to: parentEmail,
            subject: subject,
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                    <div style="background: linear-gradient(135deg, #06b6d4, #3b82f6); padding: 32px; border-radius: 12px 12px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">✉️ Message from ${tutorName}</h1>
                    </div>
                    <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                        <p style="color: #374151; font-size: 16px;">Hi ${parentName},</p>
                        <p style="color: #374151; font-size: 16px;">A message regarding <strong>${studentName}</strong>:</p>
                        
                        <div style="background: #f0f9ff; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                            <p style="color: #1e3a5f; font-size: 15px; line-height: 1.7; margin: 0; white-space: pre-wrap;">${message}</p>
                        </div>

                        <p style="color: #374151; font-size: 14px; margin-top: 24px;">Best regards,<br/><strong>${tutorName}</strong></p>
                        <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">Sent via TutorTrack</p>
                    </div>
                </div>
            `,
        });
        return { success: true };
    } catch (error: any) {
        console.error("Failed to send custom notification:", error);
        return { success: false, error: error.message || "Failed to send email" };
    }
}
