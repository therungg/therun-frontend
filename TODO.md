# Todo

Here's some things that have to be worked on on the site. The backend tickets can only be done with Joey's help, the
frontend tickets by anyone.

https://trello.com/b/xw842PmA/therungg-roadmap for more ideas.

# Needs Backend

- The Activity tab on the users page doesn't take into account game/category, can only show global.
- The games pages just retrieve all data, and are very slow or crash sometimes. Should lazy load much more and be much
  smarter about loading data.

# Frontend only

These issues can be done on the frontend, and don't require backend changes. In general, many pages can use a redesign,
and I'm always open for changes if they are good and well-reasoned.

## Huge

- Complete redesign of the front page
    - Twitter feed
    - Highlighted live run
    - News
    - Other interesting data?
    - Just has to be fun to visit the frontpage
- Expansion of the live page
    - Filters (only show people who are live, who are on pb pace, who are deep into a run)
    - Sorting options (sort by name, game, current time, pb potential, viewers)
    - Grouping (show live runs grouped by game, for example, and then you can click on a game to see all runs in that
      game)
    - Favoriting users/games, where you can only show games/users you favorited
    - Performance improvements, pagination, lazy loading
    - Theatre mode
    - Pause/Resume timer support
    - Integrate stats better

## Large

- All pagination, table search and table columns sorting needs to be refactored. Right now, it is a horrible mess of
  duplicate code, and I would rather just use one library for it all.
- Rewrite search frontend - nicer layout, only search after a delay etc etc.
- Some files are have grown HUGE over time (components/run/history/history.tsx). Should be smaller modules. Not
  React-like at all now.

## Medium

- Undoing merging gold splits is fully broken. `components/run/dashboard/golds.tsx:314`
- Placeholders for lazy loading, for example on the front page. Better UX
- Fix layout of runs on profile, indentation etc.
- The tournament page (especially the info tab) potentially has a bunch of cool data that is displayed terrible or not
  at all.
- The forms (contact form, edit user, edit run) should just use some form library instead of the custom stuff i wrote
- Redesign the splits viewer tab on user profiles
- A bunch of TS warnings: missing types etc. ignoreBuildErrors: true in next config should not be needed.
- Trim down on the turned off ESLint rules
- Add more ESLint rules
- Implement feature flags from env vars

## Small

- For patreon's names, the name sometimes shows up as a solid gradient block. No idea why. Can't reproduce reliably, but
  usually the patron page will display it in light mode.
- Allow collapsing subsplits on splits overview
- Limit amount of categories shown by default on the game page - looks cluttered now
- Live page detail panel doesn't work for people with a username starting with a number
- The countdowns on the tournament page (pages/tournaments/[tournament].tsx) should be fixed and use the eligiblePeriods
  instead of the start and enddate
- Implement reconnect mechanism after 2 hours (or after disconnect) on the websockets
