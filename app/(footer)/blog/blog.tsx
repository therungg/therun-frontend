"use client";
import { FromNow } from "~src/components/util/datetime";
import React, { ReactElement } from "react";
import { Button, Col, Row } from "react-bootstrap";
import Image from "next/image";
import Link from "next/link";
import { PatreonBunnySvgWithoutLink } from "~app/patron/patreon-info";

export interface BlogInterface {
    title: string;
    short: ReactElement;
    full: ReactElement;
    date: Date;
    url: string;
}

// This should probably use a CMS, but whatever, this works
export const Blog = () => {
    return (
        <div>
            <h1>Blog</h1>
            <p style={{ textAlign: "center", marginTop: "5rem" }}>
                <small>The latest news and updates</small>
            </p>

            <Row>
                <Col />
                <Col xl={6} lg={8} md={12}>
                    <div>
                        {getBlogs()
                            .reverse()
                            .map((blog) => {
                                return (
                                    <div key={blog.title}>
                                        <hr />
                                        <div style={{ textAlign: "center" }}>
                                            <h2>
                                                <a href={blog.url}>
                                                    {blog.title}
                                                </a>
                                            </h2>
                                            <small>
                                                {blog.date.toDateString()},{" "}
                                                <FromNow time={blog.date} />
                                            </small>
                                        </div>

                                        <p style={{ marginTop: "1rem" }}>
                                            {blog.short}
                                        </p>
                                        <a href={blog.url}>Read more...</a>
                                    </div>
                                );
                            })}
                    </div>
                </Col>
                <Col />
            </Row>
        </div>
    );
};

export const getBlogs = (): BlogInterface[] => {
    return [
        {
            title: "Welcome to The Run!",
            date: new Date("2022-07-01"),
            short: (
                <>
                    About 2 weeks ago, I launched the first version of The Run,
                    a new speedrun statistics tool. I posted about it on{" "}
                    <a
                        href={
                            "https://www.reddit.com/r/speedrun/comments/veivgh/introducing_therungg_a_new_free_speedrun/"
                        }
                    >
                        Reddit
                    </a>
                    , and got a bunch of great comments, feedback and bug
                    reports. In this blog post, I will introduce myself, tell
                    you about the launch and about the future.
                </>
            ),
            full: (
                <div>
                    <h2>The Run</h2>
                    <p>
                        About 2 weeks ago, I launched the first version of The
                        Run, a new speedrun statistics tool. I posted about it
                        on{" "}
                        <a
                            href={
                                "https://www.reddit.com/r/speedrun/comments/veivgh/introducing_therungg_a_new_free_speedrun/"
                            }
                        >
                            Reddit
                        </a>
                        , and got a bunch of great comments, feedback and bug
                        reports. In this blog post, I will introduce myself,
                        tell you about the launch and about the future.
                    </p>
                    <h2>About me</h2>
                    <p>
                        I am a{" "}
                        <a
                            href={"https://www.speedrun.com/user/joeys64"}
                            rel={"noreferrer"}
                            target={"_blank"}
                        >
                            former Super Mario 64 speedrunner{" "}
                        </a>{" "}
                        turned programmer (if you{"'"}re reading this, good odds
                        that you are too!) from the Netherlands who loves to
                        build hobby projects. Since I also watch a bunch of
                        speedrunning streams, I often see people asking
                        {
                            ' "Did you get any good runs today?", "What\'s your best ever X split?", "When did you get your PB?"'
                        }
                        , things like that. This got me thinking about building
                        a tool that you could upload your splits to, and would
                        give you all the info you&apos;ll ever need. My main
                        requirements were:
                    </p>
                    <ul>
                        <li>Everything completely free, no ads.</li>
                        <li>
                            One-to-one user mapping with Twitch. This way,
                            viewers can replace twitch.tv{"/<username>"} with
                            therun.gg{"/<username>"} and see the stats of the
                            streamer they are watching.
                        </li>
                        <li>
                            Easy to use. Logging in, uploading and viewing stats
                            should all be straightforward.
                        </li>
                    </ul>
                    <h2>Building The Run</h2>
                    <p>
                        So in the beginning of 2022, I started using some of my
                        evenings (sometimes nights) and weekends to build a
                        prototype of this thing, to see if I could put together
                        something fun and useful. Turns out, it was a ton of
                        fun! I put together a prototype and put up a message in
                        the SM64 discord if they could try out the tool. A
                        couple of days later, around 150 people had already
                        uploaded runs!
                    </p>
                    <p>
                        This motivated me a lot to work on the tool more and
                        make it more usable and reliable. I took all the
                        feedback I could get from the community and worked on a
                        first beta version, the one that is available right now.
                        I put the tool public, posted about it on Reddit, and
                        asked for any and all feedback. This way, I ironed out a
                        ton of bugs, usability issues and weird interactions.
                    </p>
                    <h2>How can I help?</h2>
                    <p>
                        I am already thrilled to see so many people using the
                        tool, either by uploading runs or checking out stats. If
                        you want to help in other ways, following The Run on{" "}
                        <a
                            href={process.env.NEXT_PUBLIC_TWITTER_URL}
                            target={"_blank"}
                            rel={"noreferrer"}
                        >
                            Twitter
                        </a>
                        , joining the{" "}
                        <a
                            href={process.env.NEXT_PUBLIC_DISCORD_URL}
                            target={"_blank"}
                            rel={"noreferrer"}
                        >
                            Discord
                        </a>{" "}
                        or, if you want to take it a step further, tell your
                        favorite streamer about the project and ask them to
                        upload their splits!
                    </p>
                    <p>
                        About money: I built the architecture in a way that is
                        very cheap, and only costs me a bunch of time right now,
                        so I don&apos;t ask for any money. If the project takes
                        off and becomes more expensive to keep running, I might
                        consider doing a Patreon or something. Don&apos;t worry,
                        I&apos;ll never put anything on the site behind a
                        paywall!
                    </p>
                    <h2>What{"'"}s next?</h2>
                    <p>
                        Now that the tool is pretty much stable (almost no
                        uploads have failed for a couple of weeks now, most bugs
                        are gone), I can start working on the{" "}
                        <a href={"/roadmap"}>Toadmap</a> (Roadmap, but funny.
                        Get it? Please laugh) I put together again. Here{"'"}s
                        what I{"'"}m looking forward to building next:
                    </p>
                    <ul>
                        <li>
                            More customization options. I want you to be able to
                            edit your profile, like adding social urls, a bio,
                            maybe custom color schemes, things like that. But
                            also to be able to edit and delete your runs, give
                            them descriptions, video urls, custom names, etc.
                            This way the site should feel more like you own it,
                            than just some static tool.
                        </li>
                        <li>
                            UI work. I{"'"}m mainly a back-end developer, with
                            not a lot of knowledge about frontend, design, or
                            UX. And even though I tried my best to make the site
                            look alright and usable, any experienced developer
                            will notice that this is not my forte. I know how to
                            make things work, not how to make them pretty. I
                            will try to learn and collect as much knowledge and
                            feedback as possible to take this aspect of the site
                            to the next level. Also part of this is adding
                            things like icons, game images and your custom split
                            images. Everything is mostly text now, that can be
                            improved a lot.
                        </li>
                        <li>
                            Usability. Most graphs and tables are just that,
                            static graphs and tables. They cannot be customized,
                            filtered or searched through. I will find some ways
                            to make this more suitable to anyone{"'"}s use case
                            and needs.
                        </li>
                        <li>
                            More features! Right now, I want to build a new tab
                            on the page of a run called Tools. This will have
                            things like querying through your splits (how often
                            did I get a sub 1:45.30 in January, things like
                            that), calculating PB chance or best possible time
                            from any split and split time, getting a bunch of
                            custom graphs and charts etc. Basically, anything
                            that is not readily available right now yet, can be
                            available through this tab with some smart
                            searching. There are many other features I want to
                            be building. Just have to figure out prioritization
                            :)
                        </li>
                        <li>
                            Improving existing stuff. Even though I{"'"}m
                            generally satisfied with the current state of the
                            tool, a lot of things are still very improvable. The
                            compare tab is a bit wonky, splits stats are not yet
                            how I want them to be (consistenty score really does
                            not help with anything yet), the search function is
                            okay, but not great and the leaderboards are nothing
                            to write home about yet, either. So all of that and
                            much more I will revisit soon.
                        </li>
                    </ul>
                    <p>
                        For the long term, my idea is to build a LiveSplit
                        plugin that automatically sends the data to the tool, so
                        that you never have to think about uploading your splits
                        at all, and your stats are always up to date for your
                        viewers to see.
                    </p>
                    <h2>Conclusion</h2>
                    <p>
                        I{"'"}m really glad that the first version was received
                        so well and that so many people are already enjoying it.
                        Thanks so much to everyone who uploaded, gave feedback
                        or just checked out the tool. If you have any feedback,
                        remarks or just want to talk, please do not hesitate to{" "}
                        <a href={"/contact"}>contact me</a>. Let{"'"}s keep
                        working to make this thing used by many for a long time
                        to come!
                    </p>
                </div>
            ),
            url: "/blog/welcome-to-the-run",
        },

        {
            title: "Twitch extension!",
            date: new Date("2022-08-02 14:00:00"),
            short: (
                <>
                    Today, I released a Twitch Extension that allows your
                    viewers to see your stats right on your Twitch page! It
                    shows a bunch of data about your runs, about your global
                    stats and about your recent sessions. It is a great way for
                    your viewers to engage even more to your stream!
                </>
            ),
            full: (
                <div>
                    <h2>I built an extension!</h2>
                    <p>
                        Today, I released a Twitch Extension that allows your
                        viewers to see your stats right on your Twitch page! It
                        shows a bunch of data about your runs, about your global
                        stats and about your recent sessions. It is a great way
                        for your viewers to engage even more to your stream!
                    </p>
                    <h2>How to install</h2>
                    <p>
                        Installing the extension is super easy. All you have to
                        do is go to your Creator Dashboard on Twitch, find the
                        Extensions menu item, and search for The Run. (Or just
                        go{" "}
                        <a
                            href={
                                "https://dashboard.twitch.tv/extensions/gl1gra1r6ucnkchrswmdsefomfwxai-0.1.0"
                            }
                            target={"_blank"}
                            rel={"noreferrer"}
                        >
                            here
                        </a>
                        ) From there you can install the extension. After
                        installing, hit My extensions in the top menu and
                        activate the extension. Add it to a Panel and your
                        stream and you will be all good to go!
                        <br />
                        <br /> Because you use Twitch already to login to The
                        Run, your data will automatically show up on your
                        profile.
                    </p>
                    <h2>What can it do?</h2>
                    <p>
                        For now, there are three tabs on the extension. The
                        first one shows basic data about all your runs. What is
                        your PB? Sum of bests? How many attempts did you do and
                        how many did you finish? All this data is readily
                        available, grouped by game and then by category. Check
                        it out here:
                        <span
                            style={{
                                display: "flex",
                                justifyContent: "center",
                                marginTop: "1rem",
                            }}
                        >
                            <a
                                href={
                                    "https://dashboard.twitch.tv/extensions/gl1gra1r6ucnkchrswmdsefomfwxai-0.1.0"
                                }
                                target={"_blank"}
                                rel={"noreferrer"}
                            >
                                <Image
                                    src={"/media/speedruns.png"}
                                    alt={"component"}
                                    style={{
                                        maxWidth: "100%",
                                        height: "auto",
                                    }}
                                    width="200"
                                    height="250"
                                />
                            </a>
                        </span>
                    </p>
                    <p>
                        By clicking the column that says Personal Best, viewers
                        can change that column to display a bunch of different
                        statistics. This way all your stats fit into that tiny
                        little 350px screen!
                    </p>
                    <p>
                        The second tab, Stats, show your global stats. How much
                        time have you played lifetime? When were you last
                        active? How many attempts did you finish in total? All
                        this is filterable by game.
                    </p>
                    <p>
                        The last tab, Sessions, displays your recent speedrun
                        sessions. This way, your viewers can always view when
                        you last played, what you played and if you got any good
                        runs!
                    </p>
                    <h2>What is next?</h2>
                    <p>
                        The extension is not finished yet and I will improve on
                        it later. For example, exact data about your splits is
                        not available yet. Viewers have to go to your The Run
                        page to see this. That is good for me, but I can imagine
                        it would be nicer to have all this data right there on
                        your Twitch profile.
                        <br />
                        <br />
                        If you like the extension, please tell your favorite
                        streamers to upload their runs to The Run and use the
                        extension! It would mean a lot to me and I believe it
                        really can make for a better viewing experience.
                    </p>
                    <p>
                        As for other The Run features, right now I am working on
                        Community Sum of Bests/Best evers. This means every
                        game/category will have leaderboards for every split,
                        along with a theoretical best time. It will even include
                        histories, so you can see how the best time for a split
                        has progressed over time and who improved it the most! I
                        think it is going to be very cool stuff.
                    </p>
                    <p>
                        After this project, I will start working on a LiveSplit
                        Component that automatically sends your runs to The Run
                        while you are running. This means never having to
                        manually upload again and always having up to date data.
                        The most important thing, however, is that The Run will
                        be able to show your currently in progress run, along
                        with a bunch of stats. This allows for almost limitless
                        amounts of very neat stuff, but I will write about that
                        later!
                    </p>
                    <p>
                        Thanks for reading and if you like The Run, please
                        spread the word!
                    </p>
                </div>
            ),
            url: "/blog/twitch-extension",
        },
        {
            title: "The Run Live and Automatic Uploading!",
            date: new Date("2022-10-26"),
            short: (
                <>
                    I launched a huge update today, which includes Automatic
                    Uploading and a The Run Live. All this is is powered by a
                    custom built LiveSplit Component. The component will track
                    your live runs and display them in real time, along with
                    your stream, on the <a href={"/live"}>Live Page</a>.
                    Furthermore, it will upload your splits after every reset.
                    You never have to manually upload your runs again!
                </>
            ),
            full: (
                <div>
                    <h2>About the new features</h2>
                    <p>
                        I launched a huge update today, which includes Automatic
                        Uploading and a The Run Live. All this is is powered by
                        a <b>custom built LiveSplit Component</b>. The component
                        will track your live runs and display them in real time,
                        along with your stream, on the{" "}
                        <a href={"/live"}>Live Page</a>. Furthermore, it will
                        upload your splits after every reset.{" "}
                        <b>
                            You never have to manually upload your runs again!
                        </b>
                    </p>
                    <h2>How does it work?</h2>
                    <p>
                        It is simple! Just follow the instructions on{" "}
                        <a href={"/livesplit"}>this page</a> and you are done!
                        Forever! Never upload manually again. All your stats
                        will be tracked forever, and you will be featured on the
                        Live page forever!
                    </p>
                    <p>
                        In short, you install the LiveSplit Component{" "}
                        <a
                            rel={"noreferrer"}
                            target={"_blank"}
                            href={
                                "https://github.com/therungg/LiveSplit.TheRun"
                            }
                        >
                            from GitHub
                        </a>
                        . Plug the .dll file into your Components folder. Then,
                        get the upload-key from the{" "}
                        <a href={"/upload-key"}>upload-key page</a> and plug
                        that into the LiveSplit Layout. Done!
                    </p>
                    <h2>Features</h2>
                    <p>
                        First of all, your stats will always be up to date. You
                        never have to manually upload again. This means that
                        your viewers can always check in real time how your
                        session has been, or view your latest runs.
                    </p>
                    <p>
                        The second part is <b>The Run Live</b>. All runs are
                        tracked in real-time. When you are running, your current
                        run will be displayed on your profile, your run detail
                        page, but most importantly: on the{" "}
                        <a href={"/live"}>Live Page!</a>
                    </p>
                    <p>
                        The live page was inspired by{" "}
                        <a
                            rel={"noreferrer"}
                            target={"_blank"}
                            href={"https://speedrunslive.com"}
                        >
                            SRL
                        </a>{" "}
                        and shows every runner who currently is running. The
                        little panels on the bottom of the page each denote one
                        runner. It shows their timer, what they are running and
                        how far ahead/behind they are. The panels are sorted by
                        which runs are doing well and are far into the run. It
                        is basically <b>a pacepal tool</b>! You can search for a
                        game or player through the search bar.
                    </p>
                    <p>
                        When you click a panel, you can see more details about
                        the current runner. On the left, you see their splits,
                        just like you see in LiveSplit itself. In the middle,
                        you see their stream. On the right, you can see various
                        data about their runs, their splits, and about the
                        current run.
                    </p>
                    <h2>In the future</h2>
                    <p>
                        While this tool is already very useful for watching
                        speedruns and keeping track of stats, there is still A
                        LOT more to do! In the coming weeks, I will improve the
                        live page to show a lot more data, the ability to select
                        what you want to compare to (not just PB), and to be
                        able to favorite games or runners, so that you will only
                        see the runners that interest you.
                    </p>
                    <p>
                        Moreover, this tool has huge potential to build more
                        cool stuff. Think Discord bots that show new Personal
                        Bests. Think a Twitter Bot that tweets out when a runner
                        is on pace to get a WR. Think creating clips
                        automatically in real time for Personal Bests or for
                        Gold Splits. The options are endless!
                    </p>
                    <p>
                        I hope you will enjoy the new features. If you want
                        something added, changed, or want to let me know that
                        you like (or do not like) something, do not hesitate to
                        contact me on{" "}
                        <a
                            rel={"noreferrer"}
                            target={"_blank"}
                            href={process.env.NEXT_PUBLIC_DISCORD_URL}
                        >
                            our Discord!
                        </a>
                    </p>
                    <p>
                        A lot more cool stuff is coming for The Run, including
                        tools for marathons, community leaderboards, and much
                        more.
                    </p>
                    <h2>Thanks</h2>
                    <p>
                        I would like to thank everyone who helped me building
                        this new project, like{" "}
                        <a
                            rel={"noreferrer"}
                            target={"_blank"}
                            href={"https://twitter.com/mini54_"}
                        >
                            Mini
                        </a>{" "}
                        for creating a first skeleton of the LiveSplit
                        Component, and{" "}
                        <a
                            rel={"noreferrer"}
                            target={"_blank"}
                            href={"https://twitter.com/CryZe107"}
                        >
                            CryZe
                        </a>{" "}
                        and the rest of the LiveSplit team for creating
                        LiveSplit and supporting me along the way!
                    </p>
                </div>
            ),
            url: "/blog/the-run-live",
        },
        {
            title: "New major feature: The Run Racing!",
            date: new Date("2024-03-15 14:00:00"),
            short: (
                <>
                    It has been a while since the last update, since updates are
                    mostly done through Discord and Twitter. Today is special
                    however. You can now do speedrun races on therun.gg! Races
                    are fully real-time, so you can track your position and
                    status live during the race, all tracked automatically by
                    LiveSplit. Go check it out!
                </>
            ),
            full: (
                <>
                    <p>
                        tl;dr:{" "}
                        <a href={"/races"} className={"fst-italic"}>
                            Race on therun.gg, in real time, with cool stats,
                            graphs. Easy, fun, and fully free.
                        </a>
                    </p>
                    <p>
                        It has been a while since the last update, since updates
                        are mostly done through Discord and Twitter. Today is
                        special however. You can now do speedrun races on
                        therun.gg! Races are fully real-time, so you can track
                        your position and status live during the race, all{" "}
                        <b>tracked automatically</b> by LiveSplit.
                    </p>
                    <h2>About 2023</h2>
                    <p>
                        But first, let us talk about 2023. The start of the year
                        was pretty slow. I had worked very hard throughout 2022
                        and the beginning of 2023 for the Live page and the
                        LiveSplit Component, and I was slightly burnt out after.
                        I still built the tournaments feature, and did a lot of
                        improvements on the site, but took it a lot slower.
                    </p>
                    <p>
                        Thankfully, due to{" "}
                        <a
                            href={"/patron"}
                            target={"_blank"}
                            rel={"noreferrer"}
                        >
                            our fantastic supporters
                        </a>
                        , I could easily keep the site running while not doing
                        too much work on it. Around September last 2023, I felt
                        fine again and decided to work on the next big feature:
                        Races!
                    </p>
                    <p>
                        The site is completely free and has no ads.{" "}
                        <b>
                            If you can afford it, please consider supporting us.
                        </b>{" "}
                        It keeps the site running and allows me to build more
                        cool stuff!
                    </p>{" "}
                    <Link href={"/patron"} className={"w-100 flex-center"}>
                        <Button
                            variant={"secondary"}
                            className="btn-lg me-sm-3 px-3 w-160p h-3r fw-medium"
                        >
                            Support <PatreonBunnySvgWithoutLink />
                        </Button>
                    </Link>
                    <h2>Races!!!</h2>
                    <p>
                        Now, on to races! Back in 2013, when I started
                        speedrunning, races were a BIG deal. SpeedRunsLive was
                        the place to be for everything speedrunning. At the
                        peak, over 4000 races were done there every single month
                        there. I, myself, did well over a hundred races on the
                        site.
                    </p>
                    <p>
                        Unfortunately, SRL is not very active anymore. Out of
                        nostalgia, I decided I want to build my own version of
                        races. I figured it could integrate nicely with the live
                        data, and I could do some really cool stuff with it. And
                        I did.
                    </p>
                    <h2>Real-Time</h2>
                    <p>
                        The big difference between racing on therun.gg and other
                        sites, like racetime.gg and speedrunslive, is that you
                        can track all participants in real-time throughout the
                        race. It is like playing Mario Kart, but with
                        speedrunning. You will know who is ahead, how far the
                        tailgaters are behind, and you will get a cool graph of
                        the entire race status.
                    </p>
                    <h2>Ease of use</h2>
                    <p>
                        My main goal when designing the feature was that it has
                        to be easy, fun, quick and free to create, join,
                        participate in and spectate races. Creating a race is a
                        matter of entering the game, category, and pressing Go.
                        Joining a race is one click of the button. Playing in
                        the race is just... Doing your run. The LiveSplit
                        Component will automatically start, track and finish
                        your race for you.
                    </p>
                    <p>
                        In addition to that, everything about your race is
                        manually modified easily.
                        <ul>
                            <li>
                                Accidentally reset? Just click Undo Abandon on
                                therun.
                            </li>
                            <li>
                                Accidentally finished? Just click Undo Finish on
                                therun.
                            </li>
                            <li>Time is wrong? Adjust it easily.</li>
                            <li>
                                Decided to both abandon and start a new race? No
                                need to create a new one, just click Reset Race.
                            </li>
                        </ul>
                        And much more. As you can see, racing on the site is
                        convenient and very easy. Everything was thought of (I
                        hope???)
                    </p>
                    <h2>Creating a race</h2>
                    <p>
                        Creating a race is easy. All you have to do is be logged
                        in with Twitch. Hit the Create new Race button on the
                        races page, and you will be taken to the Race Create
                        form. The only things you <b>must</b> enter are the game
                        and category, but there are many optional
                        customizations:
                        <ul>
                            <li>
                                Set a custom race name and description for bingo
                                seed, tournament name etc.
                            </li>
                            <li>
                                Set a custom Twitch stream that shows on the
                                page
                            </li>
                            <li>Set a password to join the race</li>
                            <li>Customize how long the countdown should be</li>
                            <li>
                                Customize when the race should start: manually,
                                automatically when everyone is ready, or at a
                                specific date/time
                            </li>
                            <li>Will the race be ranked or unranked?</li>
                        </ul>
                        And more customization options will be available in the
                        future. Of course, feel free to ignore any of these!
                    </p>
                    <p>
                        Now, hit Create Race and your race will be done in a
                        second or two. Invite fellow runners to join and you are
                        good to go!
                    </p>
                    <h2>Doing a race</h2>
                    <p>
                        Participating in a race is just as easy. When the start
                        condition has been fulfilled (everyone is ready or the
                        starttime has passed), the countdown will start. You can
                        just do your run like you are used to.
                    </p>
                    <h5>With the LiveSplit Component</h5>
                    <p>
                        I recommend using the{" "}
                        <a href={"/upload-key"}>
                            therun.gg LiveSplit Component
                        </a>
                        , which will allow the site to track you during your
                        race. You will also appear on the Live page if you
                        enable it! When you use the component, all of the race
                        will be done automatically. When you finish your run
                        your final time will be recorded automatically. If you
                        reset, you will be abandoned from the race
                        automatically, etc.
                    </p>
                    <h5>What if something goes wrong?</h5>
                    <p>
                        Any action can be overridden manually on the race page.
                        You will see buttons to manually abandon, manually
                        unabandon, manually finish, manually unfinish, and much
                        more.
                    </p>
                    <h5>
                        What if I can not or do not want to use the component?
                    </h5>
                    <p>
                        That is fine! Your run will not be tracked live, but you
                        can still join the race. When you finish your run, just
                        hit the Finish Race button on the race page. The site
                        will guess your time based on how long you took to press
                        the button, but you can always manually adjust your
                        time.
                    </p>
                    <h2>Stats</h2>
                    <p>
                        As you are used from me, I love stats, and I
                        incorperated a bunch of them for races.
                    </p>
                    <h5>Race Profile</h5>
                    <p>
                        Every user that has done races has a Race Profile. Click
                        your name from the race page, or check your profile to
                        see your race stats, and go to your race stats from
                        there. You can see your past races, your total stats,
                        and your stats per game/category you have raced.
                    </p>
                    <h5>Ratings</h5>
                    <p>
                        I spent a lot of time to implement a custom implentation
                        of the Elo rating system. You will have a rating for
                        every category you run. It starts at 1500 and increases
                        or decreased based on your performance.
                    </p>
                    <h5>Leaderboards</h5>
                    <p>
                        For every category, there are leaderboards for many
                        stats:
                        <ul>
                            <li>Rating</li>
                            <li>Best Time Ever</li>
                            <li>Best Time this month</li>
                            <li>Most # Races</li>
                            <li>Most amount of races</li>
                        </ul>
                        And more!
                    </p>
                    <h5>Stats per game/category</h5>
                    <p>
                        Lastly, you can see stats for every game, and for every
                        category. Go to the main /races page, and check out the
                        stats on the right side of the page. By clicking
                        through, you will find many cool stats!
                    </p>
                    <h2>Finishing up</h2>
                    <p>
                        There is much, much more to say about races, but this
                        blog is already extremely long, and I want you guys to
                        just go have fun and do some speedrun races! I worked
                        extremely hard on this feature, and I sincerely hope you
                        will like it.
                    </p>
                    <p>
                        Thank you for checking out the site, reading the blog,
                        and supporting me!
                    </p>
                    <p>Joey</p>
                </>
            ),
            url: "/blog/the-run-racing",
        },
    ];
};

export default Blog;
