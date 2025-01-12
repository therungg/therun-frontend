# Races progress

## Entities

Right now the API response is pretty straightforward. You can either get all races, or get a single race by id. I will
document paginated and grouped by race-status endpoints soon. Also available by player, game, etc, but not relevant atm.

When you get all races, you only get the 5 top participants in `topParticipants`. A `topParticipant` has a very small
amount of data to keep payload small. When you get a single race, you get a
detailed list of all participants.

See `races.types.ts` for full data. This should make it pretty clear what the data looks like.

## Api

Base URL: `races.therun.gg` or `https://6nkfyze0o7.execute-api.eu-west-1.amazonaws.com/prod` if main url breaks

-   `/` - list races with topParticipants
-   `/<raceId>` - get race with all participant data
-   `/participations/<username>` - get all race participations for a user

There's also three websocket endpoints, find them in `components/websocket/use-reconnect-websocket`:

-   `useAllRacesWebsocket` - keeps track of all races, but without detailed data, like above.
-   `useRaceWebsocket` - keeps track of one specific race, with detailed data. Used to view the races details.

## Pages

These are the basic pages I want to start with

-   `/races` - Contains an overview of in progress, upcoming, paginated finished races and probably leaderboards
-   `/races/create` - Form to create a race
-   `/races/{raceId}` - The race details

### `/races`

Here the races should be displayed in an engaging way. One section should be the in progress races, another should be
upcoming races. I haven't quite decided which actions I want to allow on this page (should a player directly
join/unjoin/ready/unready a race here, or only on the race detail page?)

I wrote a shitty implementation of the websockets to keep data real-time. Feel free to change however you like.

### `/races/create`

I will update this soon to allow all relevant fields to be sent. Will be around 10-ish fields, like:

-   race name
-   game+category
-   (boolean) start when everybody is ready. When false, specific start time must be given.
-   (boolean) creator joins race
-   list of rules
-   ranked/unranked
-   (dis)allow specific users
-   probably more in the future

### `/races/{raceId}` (THE BIG ONE)

This is where the magic happens. See the interface `RaceLiveData` for most info.

Everything is working on the backend. Now we should display in neat ways the races status. Who is in what position can
be infered from `runPercentageTime` and works very well. On this page I want

-   Overview of race data. Timer, game/category, creator, etc.
-   Leaderboard of current runners. Right now i have some lame percentage bars. We can really make this a cool experience.
-   Stream of a runner when selected probably
-   Detailed stats per runner
-   Much more???

I have no idea yet how exactly I want the data to look, but I'm convinced this will be huge
