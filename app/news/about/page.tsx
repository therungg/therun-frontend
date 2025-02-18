import Link from "next/link";

export default function AboutNewsPage() {
    return (
        <div>
            <h1>Introducing News on The Run</h1>

            <p>
                We've wanted to add a news section to The Run for a while - but,
                we weren't really sure what that would look like.
            </p>
            <p>
                Where would it come from? Who would make it? Would it be
                engaging and, most importantly, useful?
            </p>
            <p>
                We're very happy to have partnered with Fatzke to syndicate his
                publication,{" "}
                <Link href="https://goldsplit.substack.com/" target="_blank">
                    <i>The Gold Split</i>
                </Link>
                , on The Run. His column is a must-read for any speedrun
                enthusiast! It is free and without a paywall, but 50% of all
                revenue from publication subscriptions is donated to charity
                events within the speedrunning community; so you can feel good
                about reading it, too. Thank you, Fatzke!
            </p>
            <p>
                We also will be publishing news of our own on the site -
                primarily, about the site itself including updates, polls /
                surveys, etc.
            </p>

            <p>We hope you enjoy!</p>

            <p>
                Do you have feedback - or, do you have an interesting source of
                news you'd like to see us feature on The Run?
            </p>

            <p>
                Reach out to us on our{" "}
                <Link href={process.env.NEXT_PUBLIC_DISCORD_URL}>Discord</Link>
            </p>
        </div>
    );
}
