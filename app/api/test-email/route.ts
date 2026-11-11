
import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST() {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { success: false, error: "Resend API key is missing." },
        { status: 500 }
      );
    }

    if (!process.env.RESEND_FROM_EMAIL) {
      return NextResponse.json(
        { success: false, error: "Sender email is missing." },
        { status: 500 }
      );
    }

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: ["vattesaiteja@gmail.com"],
      subject: "SamayQ - Email Test",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Welcome to SamayQ!</h2>
          <p>Your email integration is working successfully.</p>
          <p>You can now proceed with the SamayQ staff invitation setup.</p>
          <br />
          <p>Regards,<br /><strong>SamayQ Team</strong></p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend email error:", error);

      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Test email sent successfully!",
      data,
    });
  } catch (error) {
    console.error("Test email exception:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to send test email.",
      },
      { status: 500 }
    );
  }
}
