import { Col } from "react-bootstrap";
import { PatreonBunnyHeartWithoutLink } from "~app/patron/patreon-info";
import { getSession } from "~src/actions/session.action";
import { TwitchLoginButton } from "~src/components/twitch/TwitchLoginButton";
import { safeDecodeURI } from "~src/utils/uri";

export default async function Page() {
    const session = await getSession();

    const hasSession = session.id && session.id !== "";

    return (
        <Col width="100%">
            <div className="text-center">
                <h1 className="display-2 mb-4">
                    Your 2024 Recap from The Run is Here!
                </h1>
                <div className="fs-5 mb-5">
                    <p>
                        We've been watching from the sidelines here at The Run,
                        and we've seen the{" "}
                        <b>
                            <i>incredible</i>
                        </b>{" "}
                        amount of dedication you've poured into your favorite
                        speed games.
                    </p>
                    <p>We think this is worth celebrating.</p>
                    <p>
                        We've compiled your 2024 stats into a Recap which you
                        can view and share with others in your community.
                    </p>
                    <p>
                        We hope the Recap can bring you some joy, laughs,
                        intrigue, and - most importantly - pride in yourself and
                        all you have achieved.
                    </p>
                </div>
                {hasSession ? (
                    <a
                        href={`/${safeDecodeURI(session.user)}/recap`}
                        className="btn btn-lg btn-primary mb-4"
                    >
                        View your 2024 Recap
                    </a>
                ) : (
                    <div className="mb-5">
                        <p className="fs-6 leading-relaxed mb-4">
                            To view your 2024 Recap, please login with Twitch.
                        </p>
                        <TwitchLoginButton url="/recap" />
                    </div>
                )}

                <Col className="justify-content-center">
                    <p className="display-6">Here's to 2025!</p>
                    <PatreonBunnyHeartWithoutLink size={125} />
                    <p className="mt-3">
                        -- Joey and <b>The</b>{" "}
                        <span
                            style={{
                                color: "var(--bs-link-color)",
                                fontWeight: "bold",
                            }}
                        >
                            Run
                        </span>
                    </p>
                </Col>
            </div>
        </Col>
    );
}
