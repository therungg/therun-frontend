"use client";

import { UserData } from "~src/lib/get-session-data";
import { Userform } from "~src/components/user/userform";
import { NameAsPatreon } from "~src/components/patreon/patreon-name";
import { WrappedTitle } from "~app/[username]/wrapped/wrapped-title";
import { Button } from "react-bootstrap";
import React from "react";
import { usePathname, useRouter } from "next/navigation";

export const TimezoneWarning = ({ user }: { user: UserData }) => {
    const router = useRouter();
    const pathname = usePathname();
    return (
        <div>
            <WrappedTitle user={user.user} />
            <div className="px-4 pt-3 pb-3 mb-3 card game-border border-secondary mh-100">
                <div className="h5">
                    <p>
                        Hi, <NameAsPatreon name={user.username} />! To display
                        your Wrapped properly, it is best to set your timezone
                        in your profile. I have inserted the Profile Edit form
                        below for your convenience. When you are done (or if you
                        do not care), please click this button below to start
                        generating your Wrapped!
                    </p>
                    <p></p>
                    <Button
                        variant="secondary"
                        className="btn-lg me-sm-3 px-3 w-160p h-3r fw-medium"
                        style={{ minWidth: "20rem", minHeight: "5rem" }}
                        onClick={() => {
                            router.push(pathname + "?ignoreTimezone=true");
                        }}
                    >
                        <span className="h3">Wrap it up!</span>
                    </Button>
                </div>
            </div>
            <hr className="mt-4" />
            <div>
                <Userform
                    username={user.username}
                    userData={user}
                    session={user}
                    editInfo={true}
                />
            </div>
        </div>
    );
};
