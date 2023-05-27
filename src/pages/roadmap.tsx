export const Roadmap = () => {
    return (
        <div>
            <h1>Toadmap</h1>

            <p>
                These are the things I am working on or want to be working on.
            </p>

            <h2>Done!</h2>
            <ul>
                <li>
                    <s>
                        Frontend/design revamp + make usable (enough) on mobile
                    </s>
                </li>
                <li>
                    <s>
                        Navigating through games/categories/runners improvement
                        (breadcrumbs?)
                    </s>
                </li>
                <li>
                    <s>Support Game Time as well instead of only Real Time</s>
                </li>
                <li>
                    <s>
                        Give users a profile for deleting/hiding/highlighting
                        runs etc, editing some settings and probably a lot more
                    </s>
                </li>
                <li>
                    <s>
                        Compare run to same run of other user or compare runs
                        within same splits
                    </s>
                </li>
                <li>
                    <s>Discord/socials to better communicate/handle feedback</s>
                </li>
                <li>
                    <s>Overview page for most popular games (or all)</s>
                </li>
                <li>
                    <s>Feedback form</s>
                </li>
                <li>
                    <s>
                        Option to add other data to runs, like vod url,
                        description etc
                    </s>
                </li>
                <li>
                    <s>Download splits from run</s>
                </li>
                <li>
                    <s>Compare to different splits within file</s>
                </li>
                <li>
                    <s>Dark mode</s>
                </li>
                <li>
                    <s>Footer</s>
                </li>
                <li>
                    <s>Privacy/Terms of use</s>
                </li>
                <li>
                    <s>Show game art next to games</s>
                </li>
                <li>
                    <s>Twitch panel for under stream with your data</s>
                </li>
                <li>
                    <s>Tab to analyze gold splits</s>
                </li>
                <li>
                    <s>
                        Important time saves overview / Overview of strong and
                        weak splits or parts of run in pb
                    </s>
                </li>
                <li>
                    <s>
                        Show how often a sub-x time was achieved for splits/runs
                    </s>
                </li>

                <li>
                    <s>
                        Handle secondary data from livesplit (region - platform
                        - custom vars)
                    </s>
                </li>
                <li>
                    <s>Upload automatically from LiveSplit with a plugin</s>
                </li>
                <li>
                    <s>The Run Live</s>
                </li>
            </ul>

            <h2>What I am working on next / Coming soon</h2>

            <ul>
                <li>
                    Working on fixing bugs and QOL changes for The Run Live,
                    including improving the sorting algorithm, the shifting of
                    runs on the overview and the bug that does not update game
                    and category name when you select new splits in LiveSplit.
                </li>
            </ul>

            <h2>Next up (priority is not set)</h2>
            <ul>
                <li>Filters on data/tables + pagination everywhere?</li>
                <li>Display subsplits nicer</li>
                <li>
                    Better feedback on uploading splits + uploading multiple
                    files at a time
                </li>
                <li>Show splits icons from livesplit</li>
                <li>Leaderboards per week/month?</li>
                <li>
                    Add runs that you have no splits for (no data, but will
                    still show up on profile, twitch extension etc)
                </li>
                <li>Improve consistency score</li>
                <li>
                    Community sum of bests/best achieved/ideal run/other
                    community records?
                </li>
                <li>Use LiveSplit variables in game leaderboards</li>
                <li>Mark graphs with PB time at date</li>
                <li>Be able to select a range of runs on run filters</li>
            </ul>

            <h2>In the future (will happen but not really soon I think)</h2>

            <ul>
                <li>Exports from GUI</li>
                <li>Friendlist/Follow</li>
                <li>
                    Historical pbs, see how often pb pace has been reached (at
                    the time) etc
                </li>
                <li>Open source and/or API</li>
                <li>Support non-twitch login (seperate account, youtube)?</li>
                <li>Show live stream(s) for game</li>
            </ul>

            <h2>Thought about but no real plans (yet)</h2>

            <ul>
                <li>Twitch extension to show stats directly on stream</li>
                <li>Mobile app</li>
            </ul>
        </div>
    );
};

export default Roadmap;
