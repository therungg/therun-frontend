'use client';

import { useState } from 'react';
import { Accordion, Button, Modal } from 'react-bootstrap';

export const RaceFaq = () => {
    const [show, setShow] = useState(false);
    return (
        <div>
            <Button
                onClick={() => {
                    setShow(true);
                }}
                variant="secondary"
                className="ms-2"
            >
                View info about therun.gg races
            </Button>

            <Modal
                size="xl"
                show={show}
                onHide={() => {
                    setShow(false);
                }}
            >
                <Modal.Header closeButton>
                    <Modal.Title>Welcome to racing at therun.gg!</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <RaceFaqBody />
                </Modal.Body>
            </Modal>
        </div>
    );
};

const RaceFaqBody = () => {
    return (
        <div>
            <p className="flex-center fs-4">
                This is an attempt to modernize speedrun racing.
            </p>
            <p>
                It has a modern ELO-based rating system, live tracking of the
                race with live-standings as the race happens with full LiveSplit
                Integration. It is extremely easy to start, join and participate
                in a race. Read on to find out how it works!
            </p>
            <p>
                If you have any further questions, feedback, remarks, insults or
                compliments, feel free to contact us on{' '}
                <a href="therun.gg/discord" target="_blank" rel="noreferrer">
                    Discord
                </a>
                !
            </p>
            <Accordion>
                <Accordion.Item eventKey="how-does-it-work">
                    <Accordion.Header>
                        How do I create or join a race?
                    </Accordion.Header>
                    <Accordion.Body>
                        <h5>1. Log in and use the LiveSplit Component</h5>
                        <p>
                            The races on therun.gg integrate seamlessly with the
                            therun.gg LiveSplit component. If you already use
                            it. You are good to go! Just log in with Twitch in
                            the top right corner and you are all set. If you do
                            not use the component yet, checkout{' '}
                            <a href="/livesplit">this tutorial</a>. It will take
                            5 minutes max. Want to test out if it is working?
                            Start your LiveSplit timer and see yourself appear
                            on <a href="/live">the live page!</a>
                        </p>
                        <h5>2. Create or join a race</h5>
                        <p>
                            After you logged in, you can hit <b>Create Race</b>{' '}
                            in the top right corner (next to the button for this
                            FAQ). Just select your game, your category and start
                            the race. There are a bunch of extra options too if
                            you want to use those. Feel free to ignore them,
                            though.
                        </p>
                        <p>
                            If you want to join an existing race instead, go to
                            the race from the Upcoming Races panel on this page.
                            You will be able to join the race from there.
                            Remember the location of this button: every single
                            action you can do in a race presents itself here.
                        </p>
                        <h5>3. Wait for the race to start</h5>
                        <p>
                            The race will automatically start with a countdown
                            once every participant has indicated they are ready
                            to go. To indicate this, hit the huge green button
                            that says <b>READY</b>. While you wait, chat with
                            the other participants in the chat box!
                        </p>
                    </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="how-to-race">
                    <Accordion.Header>
                        So the race has started. What do I do now?
                    </Accordion.Header>
                    <Accordion.Body>
                        <h5>1. Run your game</h5>
                        <p>
                            Since you have your therun.gg LiveSplit Component
                            setup, you can just start your run as you are used
                            to. The site will automatically detect your run.
                            While you are running, keep an eye on the race page!
                            It will show your and other participants updates,
                            and compare you all against each other in real-time!
                        </p>
                        <h5>2a. Finish your run</h5>
                        <p>
                            Once you are done, you should be done in LiveSplit
                            as well. Therefore, therun.gg will automatically
                            mark you as Finished. It will also show you your
                            final time. If that time is incorrect, you may
                            insert the correct time and click the Confirm
                            button. If you do not confirm your time manually, it
                            will happen automatically after 10 minutes.
                        </p>
                        <p>
                            If you accidentally finish or confirm your time
                            while not meaning to, you can always undo these
                            actions through the race page.
                        </p>
                        <h5>2b. Abandon your run</h5>
                        <p>
                            Alternatively, it can happen that you are not able
                            (or not willing) to finish your run. If you reset in
                            LiveSplit your run will be automatically marked as
                            Abandoned. If you reset on accident, you can undo
                            your abandon, as long as the race has not finished.
                        </p>
                    </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="race-ending">
                    <Accordion.Header>
                        So the race has ended. What happens now?
                    </Accordion.Header>
                    <Accordion.Body>
                        <h5>1. Finishing up the race</h5>
                        <p>
                            When all participants have either confirmed their
                            time, the race will be considered finished. That
                            means you can no longer undo your abandon or adjust
                            your final time. The game statistics will be updated
                            and your rankings will be adjusted according to your
                            performance in the race.
                        </p>
                        <h5>2. Start a new race</h5>
                        <p>
                            The creator of the race can select a button that
                            says Create Successor Race. This will automatically
                            create a new race with the same settings. When the
                            creator did this, all other participants will see a
                            button leading them to the new race!
                        </p>
                    </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="do-i-need-livesplits">
                    <Accordion.Header>
                        Must I use the therun.gg LiveSplit Component?
                    </Accordion.Header>
                    <Accordion.Body>
                        <p>
                            No, you do not have to. You can just join a race,
                            and when you are done, finish up and enter your
                            final time during confirmation.
                        </p>
                        <p>
                            However, we strongly recommend you do use the
                            therun.gg LiveSplit Component. It allows
                            live-tracking of everyone&quot;s runs and makes it
                            much more fun for everyone!
                        </p>
                    </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="action-overview">
                    <Accordion.Header>
                        When can I do which race action? How does that work?
                    </Accordion.Header>
                    <Accordion.Body>
                        <h5>Before the race</h5>
                        <b>Before the race</b>, you can:
                        <ul>
                            <li>
                                <b>Join</b> the race
                            </li>
                            <li>
                                <b>Unjoin</b> the race
                            </li>
                            <li>
                                Set yourself to <b>Ready</b>
                            </li>
                            <li>
                                Set yourself to <b>Unready</b>
                            </li>
                        </ul>
                        <h5>During the race</h5>
                        While the run is <b>in progress</b>, you can:
                        <ul>
                            <li>
                                <b>Create</b> a new race if you created the race
                            </li>
                            <li>
                                <b>Abandon</b> the race (either reset in
                                LiveSplit or click the Abandon-button)
                            </li>
                            <li>Do your run and be tracked in real-time</li>
                            <li>
                                <b>Finish</b> the race (either finish in
                                LiveSplit or click the Finish-button)
                            </li>
                        </ul>
                        <h5>After the race</h5>
                        <p>
                            When you have <b>finished</b>, you can:
                        </p>
                        <ul>
                            <li>
                                <b>Undo your abandon</b> after you reset in
                                LiveSplit. I understand this can easily be done
                                accidentally.
                            </li>
                            <li>
                                <b>Undo your finish</b> and resume your race.
                            </li>
                            <li>
                                <b>Undo your confirmation</b> and enter a new
                                time. After this, you could also undo your
                                finish to resume your race.
                            </li>
                        </ul>
                        <p>
                            Please note that these options are <b>only</b>{' '}
                            available once the full race has not yet finished.
                            That means if every participant is either confirmed
                            or abandoned, you are locked in.
                        </p>
                    </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="how-do-ratings work">
                    <Accordion.Header>
                        How the hell does the rating system work?
                    </Accordion.Header>
                    <Accordion.Body>
                        <p>
                            The rating system is a custom implementation of the
                            Elo-ranking system. This means that if you beat
                            someone, you gain rating. If you lose to someone,
                            you lose rating. However, the larger the rating gap,
                            the more you can win or lose.
                        </p>
                        <p>
                            For example: if you have a rating of 1200 and your
                            opponent has a rating of 1900, it is pretty much
                            expected that you lose. If that does indeed happen,
                            you will not lose many rating. If you beat them,
                            however, you will <i>gain</i> a massive amount of
                            rating.
                        </p>
                        <p>
                            You have a seperate rating for every game/category
                            combination. That means your rating is different for
                            Any% than it is for 100%.
                        </p>
                    </Accordion.Body>
                </Accordion.Item>
            </Accordion>
        </div>
    );
};
