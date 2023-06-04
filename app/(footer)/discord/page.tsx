import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "Discord",
    description: "Join the Discord server",
};

export default function DiscordPage() {
    redirect(process.env.NEXT_PUBLIC_DISCORD_URL || "");
}
