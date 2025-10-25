import {
    AbilityBuilder,
    CreateAbility,
    createMongoAbility,
    ForcedSubject,
    MongoAbility,
} from '@casl/ability';
import { Role, User } from '../../types/session.types';

export const actions = [
    'create',
    'join',
    'edit',
    'delete',
    'ban',
    'style',
    // eslint-disable-next-line sonarjs/no-duplicate-string
    'view-restricted',
    'moderate',
] as const;
export const subjects = [
    'user',
    'run',
    'race',
    'game',
    'event',
    'leaderboard',
    'moderators',
    'admins',
    'stories',
    'roles',
] as const;
type AllowedActions = (typeof actions)[number];
type AllowedSubjects = (typeof subjects)[number];
type AppAbilities = [
    AllowedActions,
    (
        | AllowedSubjects
        | ForcedSubject<AllowedSubjects>
        | ForcedSubject<{ [key in AllowedSubjects]?: string }>
    ),
];

export type AppAbility = MongoAbility<AppAbilities>;
export const createAppAbility = createMongoAbility as CreateAbility<AppAbility>;

type DefinePermissions = (
    user: User,
    builder: AbilityBuilder<AppAbility>,
) => void;

const rolePermissions: Record<Role, DefinePermissions> = {
    // Admin can do anything to any entity
    admin(_user, { can }) {
        actions.forEach((action) => {
            subjects.forEach((subject) => {
                can(action, subject);
            });
        });
    },
    patreon1(user, { can }) {
        can('style', 'user');
        can('view-restricted', 'stories');
        can('edit', 'stories', { user: user.username });
    },
    patreon2(user, { can }) {
        can('style', 'user');
        can('view-restricted', 'stories');
        can('edit', 'stories', { user: user.username });
    },
    patreon3(user, { can }) {
        can('style', 'user');
        can('view-restricted', 'stories');
        can('edit', 'stories', { user: user.username });
    },
    // Moderators can ban users, remove runs, and edit runs
    moderator(_user, { can }) {
        can('ban', 'user');
        can('ban', 'run');
        can('edit', 'run');
    },
    'story-beta-user': function (user, { can }) {
        can('view-restricted', 'stories');
        can('edit', 'stories', { user: user.username });
    },
    'board-admin': function (_user, { can }) {
        can('edit', 'leaderboard');
        can('edit', 'moderators');
    },
    'board-moderator': function (_user, { can }) {
        can('edit', 'leaderboard');
    },
    'race-admin': function (_user, { can }) {
        can('edit', 'race');
        can('delete', 'race');
        can('moderate', 'race');
    },
    'event-admin': function (_user, { can }) {
        can('create', 'event');
        can('edit', 'event');
        can('delete', 'event');
        can('moderate', 'event');
    },
    'event-creator': function (_user, { can }) {
        can('create', 'event');
    },
    // role-admins can remove and add roles for other users, but only specific ones.
    'role-admin': function (_user, { can }) {
        can('moderate', 'roles', {
            role: { $in: ['event-admin', 'race-admin', 'event-creator'] },
        });
    },
};

// These are default permissions, you don't need a role to do this.
const defaultPermissions: DefinePermissions = (user, { can }) => {
    const moderatedGames = user.moderatedGames || [];
    actions.forEach((action) => {
        moderatedGames.forEach((game) => {
            can(action, 'leaderboard', { game });
        });

        // You can manage your own user (e.g. profile)
        can(action, 'user', { user: user.username });

        // You can manage your own runs (e.g. delete, set vod etc.)
        can(action, 'run', { run: user.username });

        // You can manage your own races
        can('edit', 'race', { creator: user.username });
        can('moderate', 'race', { creator: user.username });

        // You can manage your own events
        can('edit', 'event', { createdBy: user.username });
        can('delete', 'event', { createdBy: user.username });

        // Anyone can create a race
        can('create', 'race');

        // Anyone can join a race
        can('join', 'race');
    });
};

export function defineAbilityFor(user?: User): AppAbility {
    const builder = new AbilityBuilder(createAppAbility);

    if (!user || !user.username) return builder.build();

    const userRoles = user.roles || [];

    userRoles?.forEach((role) => {
        if (!rolePermissions[role]) return;

        rolePermissions[role](user, builder);
    });

    defaultPermissions(user, builder);

    return builder.build();
}
