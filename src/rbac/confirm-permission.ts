import { actions, defineAbilityFor, subjects } from "./ability";
import { ForbiddenError, subject } from "@casl/ability";
import { User } from "../../types/session.types";
import { Race } from "~app/races/races.types";

export const confirmPermission = (
    user: User | undefined | null,
    action: (typeof actions)[number],
    subjectName: (typeof subjects)[number],
    subjectObject?: string | object,
) => {
    if (user === undefined || user === null || !user.username) {
        throw new Error("No user found");
    }

    if (typeof subjectObject === "string") {
        subjectObject = {
            [subjectName]: subjectObject,
        };
    }

    const ability = defineAbilityFor(user);
    ForbiddenError.from(ability).throwUnlessCan(
        action,
        subjectObject ? subject(subjectName, subjectObject) : subjectName,
    );
};

export const isRaceAdmin = (user: User) => {
    try {
        checkAdminPermission(user);
    } catch (e) {
        return false;
    }
    return true;
};

export const isRaceModerator = (race: Race, user: User) => {
    try {
        checkModeratorPermission(race, user);
    } catch (e) {
        return false;
    }
    return true;
};

export const checkAdminPermission = (user: User) => {
    confirmPermission(user, "moderate", "race");
};

export const checkModeratorPermission = (race: Race, user: User) => {
    if (
        race.moderators &&
        Array.isArray(race.moderators) &&
        race.moderators.includes(user.username)
    ) {
        return;
    }

    // Check if user is race game moderator
    // const game = await getGlobalGamedata(race.game);
    // checkRacePermission(game.moderators, user)

    try {
        checkAdminPermission(user);
        return;
    } catch (e) {
        // Fine if this fails, just not an admin
    }

    try {
        confirmPermission(user, "edit", "race", race);
    } catch (e) {
        throw Error(
            `Race Log: User is not allowed to moderate race ${race.raceId}, user: ${user.user}`,
        );
    }
};
