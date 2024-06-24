"use client";

import { useState } from "react";

export const RacesWelcomeMessage = () => {
    const [show, setShow] = useState(false);

    if (!show) return <></>;

    return (
        <div className="p-3 game-border border-secondary rounded bg-body-secondary mb-4">
            <div className="d-sm-flex">
                <div className="w-100">
                    <h3 className="flex-center">
                        Welcome to Racing on therun.gg
                    </h3>
                </div>
                <div
                    className="d-flex justify-content-end link-underline cursor-pointer"
                    onClick={() => {
                        setShow(false);
                    }}
                >
                    <u>Close</u>
                </div>
            </div>
            <div className="px-sm-1 px-lg-5">
                <p className="flex-center">
                    In this newest feature you compete against others to get the
                    fastest time. You will receive a rating for every category
                    you run. After every race, your rating will increase or
                    decrease, based on your performance. Can you get the top
                    rating for your category?
                </p>
                <p className="flex-center">
                    <span>
                        By using the
                        <a
                            href="/livesplit"
                            rel="noreferrer"
                            target="_blank"
                            className="ps-1"
                        >
                            therun.gg LiveSplit Component
                        </a>
                        , your race will be tracked automatically. All you have
                        to do is join a race, click Ready and start your run as
                        you are used to. When you are finished, your time will
                        automatically be recorded. During your run, you will see
                        your progress on the race page and compare yourself in
                        real-time against the other participants!
                    </span>
                </p>
                <p className="flex-center">
                    Below here, you see the races that are currently in
                    progress. Just click one to view the race in detail. To
                    create a new race, just press the &quot;Create new
                    race&quot;-button to the top right. To the right, you see a
                    list of upcoming races, some popular race statistics, and
                    the most recent finished races.
                </p>
                <span className="flex-center">
                    <h5>Have fun and thank you!!!</h5>
                </span>
                <span className="d-flex justify-content-end"> Joey</span>
            </div>
        </div>
    );
};
