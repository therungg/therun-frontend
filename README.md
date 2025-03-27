# [The Run](https://therun.gg/): The Free Speedrun Statistics Site

_Therun_ is a free speedrun statistics website. It provides live data and advanced statistics for participating
speedrunners.

## Features

-   Live Runs tracking
-   Advanced statistics
-   Games overview
-   Splits backup
-   Twitch Extension

and many, many more.

## Getting Started

You'll need node.js version 22 or higher. First clone this repository.

```
cp .env .env.local
npm i
npm run dev
```

Navigate to `localhost:3000`

## Setting up the database

Since early 2025, we use this project as our backend, with a new SQL database. To set it up:

-   Get yourself a Postgres DB (I recommend using Supabase)
-   Add your DATABASE_URL to `env.local`
-   Run `npm run migrate` to create the database tables
-   Run `npm run seed` to fill the database with seed data

## Setting up storage

We use https://vercel.com/docs/vercel-blob for storing images. Set the environment variable `BLOB_READ_WRITE_TOKEN` in your `env.local` to use it.

## Setting up Algolia

We use Algolia for searching things like events, games, users. Set the `ALGOLIA_` environment variables in your `env.local` to use it.

## Support

Love what we do? You can support the project on [Patreon](patreon.com/therungg)!

## Contribute

Check out our [Contribution guide](https://github.com/therungg/therun-frontend/blob/main/CONTRIBUTING.md).
