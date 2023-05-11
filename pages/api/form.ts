import nodemailer from "nodemailer";

export const handler = async (req, res) => {
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
                subject: `${req.body.category}: ${req.body.subject} (${req.body.email})`,
                text: req.body.text,
            },
            (error, info) => {
                if (error) return reject(error);
                return resolve(info);
            }
        );
    });

    res.status(200).json(response);
};

export default handler;
