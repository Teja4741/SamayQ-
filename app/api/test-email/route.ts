
import { Resend } from "resend";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Resend API key is missing." },
        { status: 500 }
      );
    }

    if (!fromEmail) {
      return NextResponse.json(
        { success: false, error: "Sender email is missing." },
        { status: 500 }
      );
    }

    // Initialize Resend only when the API is called.
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: fromEmail,
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
