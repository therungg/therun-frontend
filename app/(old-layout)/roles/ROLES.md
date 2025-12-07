# Roles

Roles are handled in the SQL database in the `roles` table.

# Which roles?

We currently have the following roles:

-   admin (Can do everything)
-   role-admin (Can assign roles, but not admin or role-admin)
-   event-admin (Can manage events)
-   event-creator (Can create events and manage their own events)
-   race-admin (Can manage races)

# What can roles do?

Roles are managed by https://casl.js.org/v6/en/. See the file `src/rbac/ability.ts` for the role definitions

# Check roles

To check roles in React, use the `<Can>` component:

```typescript jsx
'use client';

// To check if a user can do something to a specific entity
<Can I="moderate" this={subject("race", race)} />

// To check if a user can do something, regardless of this specific entity
<Can I="create" a="race" />
<Can I="moderate" a="race" />
```

To check roles on the server, use the `confirmPermission()` function:

```typescript jsx
"use server";

const user = await getSession();

// To check if a user can do something to a specific entity
confirmPermission(user, "edit", "race", race);

// To check if a user can do something, regardless of this specific entity
confirmPermission(user, "create", "race");
confirmPermission(user, "moderate", "race");
```
