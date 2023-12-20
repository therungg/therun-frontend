import nodemailer from "nodemailer";
import { apiResponse } from "~app/api/response";

export async function POST(request: Request) {
    const body = await request.json();

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: 587,
        auth: {
            user: "info@therun.gg",
            pass: process.env.SMTP_PASSWORD,
        },
    });

    const response = await new Promise((resolve, reject) => {
        transporter.sendMail(
            {
                from: "info@therun.gg",
                to: "info@therun.gg",
                subject: `${body.category}: ${body.subject} (${body.email})`,
                text: body.text,
            },
            (error, info) => {
                if (error) return reject(error);
                return resolve(info);
            },
        );
    });

    return apiResponse({ body: response });
}
