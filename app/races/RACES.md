# Races progress

## Entities

Right now the API response is pretty straightforward. You can either get all races, or get a single race by id. I will
create paginated and grouped by race-status endpoints soon. Eventually also by game, player, etc.

When you get all races, you only get the 5 top participants in `topParticipants`. A `topParticipant` has a very small
amount of data to keep payload small. When you get a single race, you get a
detailed list of all participants.

See `races.types.ts` for full data.

## Api

Base URL: `races.therun.gg` or `https://6nkfyze0o7.execute-api.eu-west-1.amazonaws.com/prod` if main url breaks

-   `/` - list races with topParticipants
-   `/<raceId>` - get race with all participant data
-   `/participations/<username>` - get all race participations for a user

## Pages
