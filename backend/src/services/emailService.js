import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";

dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendContactCreatedEmail(name, email) {
  const msg = {
    to: email,
    from: process.env.EMAIL_FROM,
    subject: "Contact Created Successfully",
    text: `Hello ${name}, your contact has been successfully created in the system.`,
  };

  try {
    await sgMail.send(msg);
    console.log("📧 Email sent successfully");
  } catch (err) {
    console.error("Email error:", err.message);
  }
}