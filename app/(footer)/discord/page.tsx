import { redirect } from "next/navigation";
import buildMetadata from "~src/utils/metadata";

export const metadata = buildMetadata({
    title: "Discord",
    description:
        "Join The Run's Discord server! Get support, give feedback and ideas, or just come hang out!",
});

export default function DiscordPage() {
    redirect(process.env.NEXT_PUBLIC_DISCORD_URL || "");
}
