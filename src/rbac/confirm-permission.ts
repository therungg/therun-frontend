import { actions, defineAbilityFor, subjects } from "./ability";
import { subject } from "@casl/ability";
import { User } from "../../types/session.types";

export const confirmPermission = (
    user: User | undefined | null,
    action: (typeof actions)[number],
    subjectName: (typeof subjects)[number],
    subjectObject?: string | object
) => {
    if (user === undefined || user === null || !user.username) {
        return false;
    }

    if (typeof subjectObject === "string") {
        subjectObject = {
            [subjectName]: subjectObject,
        };
    }

    const ability = defineAbilityFor(user);
    return ability.can(
        action,
        subjectObject ? subject(subjectName, subjectObject) : subjectName
    );
};
