"use client";
import { Accordion } from "react-bootstrap";
import AccordionHeader from "react-bootstrap/AccordionHeader";
import AccordionBody from "react-bootstrap/AccordionBody";
import AccordionItem from "react-bootstrap/AccordionItem";

export const Faq = () => {
    return (
        <div>
            <h1>Frequently Asked Questions</h1>

            <p>Here are some questions people may or may not have asked!</p>

            <h2>General</h2>
            <Accordion>
                <AccordionItem eventKey={"help"}>
                    <AccordionHeader>How can I help?</AccordionHeader>
                    <AccordionBody>
                        <p>
                            I am already thrilled to see so many people using
                            the tool, either by uploading runs or checking out
                            stats. If you want to help in other ways, following
                            The Run on{" "}
                            <a
                                href={process.env.NEXT_PUBLIC_TWITTER_URL}
                                target={"_blank"}
                                rel={"noreferrer"}
                            >
                                Twitter
                            </a>
                            , joining the{" "}
                            <a
                                href={process.env.NEXT_PUBLIC_DISCORD_URL}
                                target={"_blank"}
                                rel={"noreferrer"}
                            >
                                Discord
                            </a>{" "}
                            or, if you want to take it a step further, tell your
                            favorite streamer about the project and ask them to
                            upload their splits!
                        </p>
                        <p>
                            About money: I built the architecture in a way that
                            is very cheap, and only costs me a bunch of time
                            right now, so I don&apos;t ask for any money. If the
                            project takes off and becomes more expensive to keep
                            running, I might consider doing a Patreon or
                            something. Don&apos;t worry, I&apos;ll never put
                            anything on the site behind a paywall!
                        </p>
                    </AccordionBody>
                </AccordionItem>
                <AccordionItem eventKey={"splitsio"}>
                    <AccordionHeader>
                        Why did you build this? There is already Splits.io
                    </AccordionHeader>
                    <AccordionBody>
                        <p>
                            Even though I like Splits.io, I felt like there are
                            some features that are either missing, or behind a
                            paywall. I figured I would fill the gap in
                            accessibility to these features myself.
                        </p>
                    </AccordionBody>
                </AccordionItem>
                <h2 style={{ marginTop: "1rem" }}>Troubleshooting</h2>
                <AccordionItem eventKey={"a"}>
                    <AccordionItem eventKey={"features"}>
                        <AccordionHeader>
                            Why can&apos;t I do X? Is there a way to do Y?
                        </AccordionHeader>
                        <AccordionBody>
                            <p>
                                This site is still in beta, so there are a lot
                                of feature that are still missing or implemented
                                sub-optimally. You can check out the{" "}
                                <a href={"/roadmap"}>Roadmap</a> to see if the
                                feature you want is already on there. If not,
                                don&apos;t hesitate to{" "}
                                <a href={"/contact"}>contact me</a> and request
                                the feature!
                            </p>
                        </AccordionBody>
                    </AccordionItem>
                    <AccordionHeader>
                        The PB Time on my profile shows up as <i>Unknown</i>.
                        What gives?
                    </AccordionHeader>
                    <AccordionBody>
                        To keep things simple, your PB is simply determined as
                        the end time on your splits. In the majority of the
                        cases, this is correct. I don&apos;t really want to
                        determine your PB as the lowest time in your run
                        history, because there are a bunch of people
                        accidentally splitting at a very low time and then not
                        setting that time as the actual splits. But that run
                        will still be in history. To check when you got that PB,
                        however, I need to go through your run history and find
                        a run with the same time as your PB. If I can&apos;t
                        find that run, because the splits are not directly from
                        your runs, it will cause a mismatch and I can&apos;t
                        figure out when you actually got that PB.
                    </AccordionBody>
                </AccordionItem>
                <AccordionItem eventKey={"b"}>
                    <AccordionHeader>
                        My run shows up seperately from other games or other
                        runs in the same category on the leaderboards
                    </AccordionHeader>
                    <AccordionBody>
                        This happens because of differences in naming the game
                        or the category in Livesplit. If one runner names the
                        game Super Mario Sunshine, but the other runner names
                        the game SMS, the games will not show up together. I
                        have two solutions for this. You can rename your splits
                        to be the same as the ones you want to compare to, and
                        then reupload. I also have a way to match the game/run,
                        even though they do not have the same name. I have to do
                        this manually though, so send me a message if you want
                        this!
                    </AccordionBody>
                </AccordionItem>
                <AccordionItem eventKey={"c"}>
                    <AccordionHeader>
                        My run has been uploaded, but I cannot click it on my
                        profile
                    </AccordionHeader>
                    <AccordionBody>
                        This is usually because you have not set the Category
                        field in LiveSplit.
                    </AccordionBody>
                </AccordionItem>
                <AccordionItem eventKey={"d"}>
                    <AccordionHeader>
                        My Best Achieved Time shows up all weird or is lower
                        than my Best Possible Time
                    </AccordionHeader>
                    <AccordionBody>
                        This was a bug that could occur when uploading before
                        june 20th, which I cannot retroactively fix for
                        everyone. If you reupload, it should fix itself.
                    </AccordionBody>
                </AccordionItem>
                <AccordionItem eventKey={"e"}>
                    <AccordionHeader>
                        My run shows up, but does not have a PB.
                    </AccordionHeader>
                    <AccordionBody>
                        Actually not sure yet why this happens. I enabled
                        logging for this and will monitor it. Often, just
                        uploading again already helps.
                    </AccordionBody>
                </AccordionItem>
                <AccordionItem eventKey={"f"}>
                    <AccordionHeader>
                        I changed my Twitch name, but now all my runs are gone!
                    </AccordionHeader>
                    <AccordionBody>
                        The system identifies you by your Twitch name. I can
                        copy your profile, please{" "}
                        <a href={"/contact"}>Contact me</a>!
                    </AccordionBody>
                </AccordionItem>
            </Accordion>
        </div>
    );
};

export default Faq;
