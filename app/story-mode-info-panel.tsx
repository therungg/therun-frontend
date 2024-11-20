"use client";

import { Can } from "~src/rbac/Can.component";
import React from "react";

export const StoryModeInfoPanel = () => {
    return (
        <Can I="view-restricted" a="stories">
            <div className="rounded-3 px-4 pt-2 pb-2 mb-3 border border-secondary bg-body-secondary text-center">
                <h3>Story Mode</h3>
                <p>You have been granted access to the Beta of Story Mode.</p>
                <p>
                    Please go to the{" "}
                    <a href="/stories/manage">Story Preferences Dashboard</a> to
                    setup the Twitch Bot!
                </p>
            </div>
        </Can>
    );
};
