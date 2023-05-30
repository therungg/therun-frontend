import type { AppProps } from "next/app";
import App from "next/app";
//import "bootstrap/dist/css/bootstrap.min.css";
import { Layout } from "../components/layout";
import { AppContext } from "../common/app.context";
import "../styles/globals.css";
import "../styles/calendar-heatmap.min.css";
import Router from "next/router";
import NProgress from "nprogress"; //nprogress module
import "nprogress/nprogress.css";
import { GoogleAnalytics } from "nextjs-google-analytics";
import { IncomingMessage } from "http";
import { getSessionData } from "../components/twitch/get-session-data";

interface AppPropsHome extends AppProps {
    customProps: CustomProps;
}

interface CustomProps {
    session: any;
    baseUrl: string;
    title: string;
    description: string;
}

Router.events.on("routeChangeStart", () => NProgress.start());
Router.events.on("routeChangeComplete", () => NProgress.done());
Router.events.on("routeChangeError", () => NProgress.done());

export default function MyApp({
    Component,
    pageProps = {},
    customProps,
}: AppPropsHome) {
    pageProps.session = customProps.session;

    return (
        <>
            <AppContext.Provider value={{ baseUrl: customProps.baseUrl }}>
                <Layout
                    title={customProps.title}
                    description={customProps.description}
                    username={customProps.session.username}
                    picture={customProps.session.picture}
                >
                    <GoogleAnalytics
                        trackPageViews={true}
                        gaMeasurementId={process.env.ANALYTICS_MEASUREMENT_ID}
                    />
                    <Component {...pageProps} {...customProps} />
                </Layout>
            </AppContext.Provider>
        </>
    );
}

//TOD:: Find a better solution for that, on the page itself, because I always forget to update this on a new page
const getTitleAndDescription = (
    pathname: string,
    query: any
): { title: string; description: string } => {
    let result = {
        title: "",
        description: "The Run - a free tool for speedrun statistics",
    };

    switch (pathname) {
        case "":
            break;
        case "/[username]/[game]/[run]": {
            const title = `${query.game} - ${query.run.split("$")[0]} By ${
                query.username
            }`;
            result = { title, description: title };
            break;
        }
        case "/[username]":
            result = {
                title: query.username,
                description: `The Run runs by ${query.username}`,
            };
            break;
        case "/game/[game]":
            result = {
                title: query.game,
                description: `The Run game overview for ${query.game}`,
            };
            break;
        case "/live":
            result = {
                title: "Live",
                description: "The Run Live",
            };
            break;
        case "/marathon":
            result = {
                title: "Marathon Dashboard",
                description: "The Run Marathon Dashboard",
            };
            break;
        case "/games":
            result = {
                title: "Game overview",
                description: "All games overview",
            };
            break;
        case "/roadmap":
            result = {
                title: "Roadmap",
                description: "Roadmap",
            };
            break;
        case "/contact":
            result = {
                title: "Contact",
                description: "Contact",
            };
            break;
        case "/faq":
            result = {
                title: "FAQ",
                description: "FAQ",
            };
            break;
        case "/gsa":
            result = {
                title: "GSA Tournament",
                description: "GSA Tournament",
            };
            break;
    }

    return result;
};

const getBaseUrl = (req: IncomingMessage) => {
    if (process.env.NEXT_PUBLIC_BASE_URL)
        return process.env.NEXT_PUBLIC_BASE_URL;
    if (process.env.NEXT_PUBLIC_VERCEL_URL)
        return process.env.NEXT_PUBLIC_VERCEL_URL;

    const host = req.headers.host;
    const protocol = host === "localhost:3000" ? "http://" : "https://";
    return protocol + host;
};

MyApp.getInitialProps = async ({ ctx, Component }: AppProps) => {
    const appInitialProps = App.getInitialProps({ Component, ctx });

    const { pathname, query } = ctx;
    const baseUrl = getBaseUrl(ctx.req as IncomingMessage);

    const session = await getSessionData(ctx, baseUrl);

    const customProps = {
        session,
        baseUrl,
        ...getTitleAndDescription(pathname, query),
    };

    return { customProps, ...appInitialProps };
};
