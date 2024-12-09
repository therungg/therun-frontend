import Head from "next/head";
import { Col, Container, Row, SSRProvider } from "react-bootstrap";
import { ReactNode, useEffect, useState } from "react";
import Topbar from "./topbar";
import { UserLink } from "./links/links";
import { usePatreons } from "./patreon/use-patreons";

interface LayoutInput {
    children: ReactNode;
    title: string;
    description: string;
    username?: string;
    picture?: string;
}

// TODO: Move this to `scripts.tsx`
const themeInitializerScript = `
       (function () {
         document.documentElement.dataset.bsTheme = window.localStorage.getItem("theme") || "light";
       })();
   `;

export const Layout = ({
    children,
    title,
    description,
    username,
    picture,
}: LayoutInput) => {
    const [light, setLight] = useState(false);
    const prefix = light ? "/lightmode" : "";
    const { data: patreonData, isLoading } = usePatreons();
    const [animationDuration, setAnimationDuration] = useState(30);

    useEffect(() => {
        if (patreonData && !isLoading) {
            // Calculate the animation duration based on the text length
            setAnimationDuration(Object.keys(patreonData).length * 0.5 + 30);
        }
    }, [patreonData, isLoading]);

    useEffect(() => {
        if (
            window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: light)").matches
        ) {
            setLight(true);
        }
    }, []);

    if (!title) {
        title = "The Run - Speedrun Statistics";
    } else {
        title += " - The Run - Speedrun Statistics";
    }

    return (
        <SSRProvider>
            <div>
                <Head>
                    <title>{title}</title>
                    <meta name="description" content={description} />
                    <link rel="icon" href={`${prefix}/favicon.ico`} />

                    <link
                        rel="apple-touch-icon"
                        sizes="180x180"
                        href={`${prefix}/apple-touch-icon.png`}
                    />
                    <link
                        rel="icon"
                        type="image/png"
                        sizes="32x32"
                        href={`${prefix}/favicon-32x32.png`}
                    />
                    <link
                        rel="icon"
                        type="image/png"
                        sizes="16x16"
                        href={`${prefix}/favicon-16x16.png`}
                    />
                    <link rel="manifest" href="/site.webmanifest" />
                    <link
                        rel="mask-icon"
                        href="/safari-pinned-tab.svg"
                        color="#5bbad5"
                    />
                    <meta name="msapplication-TileColor" content="#da532c" />
                    <meta name="theme-color" content="#ffffff" />
                </Head>

                <script
                    dangerouslySetInnerHTML={{ __html: themeInitializerScript }}
                />
                <Topbar username={username} picture={picture} />
                <Container className="mt-4 main-container">
                    {children}
                </Container>

                <footer className="footer">
                    <div className="scroll-bar">
                        <div
                            style={{
                                animationDuration: `${animationDuration}s`,
                            }}
                        >
                            <div className="d-flex">
                                <span className="me-4">
                                    A special thanks to our Tier 3 Patrons:
                                </span>

                                {Object.entries(patreonData || {})
                                    .sort(() => Math.random() - 0.5)
                                    .filter(([, v]) => {
                                        if (!v.tier || v.tier < 3) return false;

                                        return (
                                            !v.preferences ||
                                            v.preferences.featureInScrollbar
                                        );
                                    })
                                    .map(([k]) => {
                                        return (
                                            <div
                                                className="me-4"
                                                key={`${k}patron`}
                                            >
                                                <UserLink
                                                    key={`${k}patron`}
                                                    username={k}
                                                />
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    </div>

                    <div className="pb-3">
                        <div className="container">
                            <Row>
                                <Col>
                                    <h3>General</h3>
                                    <a href="/about">About</a> <br />
                                    <a href="/roadmap">Roadmap</a> <br />
                                    <a href="/faq">FAQ</a> <br />
                                    <a href="/live">Live</a> <br />
                                    <a href="/blog">Blog</a> <br />
                                </Col>
                                <Col>
                                    <h3>Media</h3>
                                    <a href="/media">Media kit</a> <br />
                                </Col>
                                <Col>
                                    <h3>Privacy and Terms</h3>
                                    <a href="/terms">
                                        Terms and conditions
                                    </a>{" "}
                                    <br />
                                    <a href="/privacy-policy">Privacy Policy</a>
                                </Col>
                                <Col>
                                    <h3>Contact</h3>
                                    <a href="/contact">Contact form</a> <br />
                                    <a
                                        rel="noreferrer"
                                        target="_blank"
                                        href={
                                            process.env.NEXT_PUBLIC_DISCORD_URL
                                        }
                                    >
                                        Discord
                                    </a>
                                    <br />
                                    <a
                                        rel="noreferrer"
                                        target="_blank"
                                        href={
                                            process.env.NEXT_PUBLIC_TWITTER_URL
                                        }
                                    >
                                        Twitter
                                    </a>{" "}
                                    <br />
                                    <a
                                        rel="noreferrer"
                                        target="_blank"
                                        href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL}`}
                                    >
                                        {process.env.NEXT_PUBLIC_CONTACT_EMAIL}
                                    </a>
                                </Col>
                            </Row>
                        </div>
                    </div>
                </footer>
            </div>
        </SSRProvider>
    );
};
