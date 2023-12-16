import { createContext } from "react";
import { createContextualCan } from "@casl/react";
import { defineAbilityFor } from "~src/rbac/ability";

export const AbilityContext = createContext(defineAbilityFor());
export const Can = createContextualCan(AbilityContext.Consumer);

//todo:: fix instance stuff
