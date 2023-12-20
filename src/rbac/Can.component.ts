import { createContext } from "react";
import { createContextualCan } from "@casl/react";
import { defineAbilityFor, subjects } from "~src/rbac/ability";
import { subject as caslSubject } from "@casl/ability";

export const AbilityContext = createContext(defineAbilityFor());
export const Can = createContextualCan(AbilityContext.Consumer);

export const subject = <T extends (typeof subjects)[number]>(
    type: T,
    object: string | object,
) => {
    object = typeof object === "string" ? { [type]: object } : object;
    return caslSubject(type, object);
};
