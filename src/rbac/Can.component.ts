import { subject as caslSubject } from '@casl/ability';
import { createContextualCan } from '@casl/react';
import { createContext } from 'react';
import { defineAbilityFor, subjects } from '~src/rbac/ability';

export const AbilityContext = createContext(defineAbilityFor());
export const Can = createContextualCan(AbilityContext.Consumer);

export const subject = <T extends (typeof subjects)[number]>(
    type: T,
    object: string | object,
) => {
    object = typeof object === 'string' ? { [type]: object } : object;
    return caslSubject(type, object);
};
