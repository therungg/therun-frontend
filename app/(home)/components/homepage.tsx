import { Col, Row } from "react-bootstrap";
import { DataHolder } from "~app/(home)/components/server/data-holder";
import { SkeletonPersonalBests } from "~src/components/skeleton/index/skeleton-personal-bests";
import SupportSection from "./client/SupportSection";
import React from "react";
import {
    HomeLayout,
    ContentCard,
    MainContainer,
    SidebarContainer,
} from "./client/home-layout";
import HappeningNowSection from "./client/sidebar/happening-now";
import { LatestNewsSection } from "./client/sidebar/latest-news";
import NewAndTrending from "./client/sidebar/new-and-trending";
import RecentlyVisited from "./client/sidebar/recently-visited";
import RelevantRacesFetcher from "./server/relevant-races-fetcher";
import TournamentsFetcher from "./server/tournaments-fetcher";
import LiveRunsFetcher from "./server/live-runs-fetcher";

export default function Homepage() {
    return (
        <HomeLayout>
            <MainContainer>
                <ContentCard
                    title="Live Runs"
                    callToActionText="View All"
                    callToActionHref="/live"
                >
                    <React.Suspense>
                        <LiveRunsFetcher />
                    </React.Suspense>
                </ContentCard>
                <Row className="g-4">
                    <Col md={8}>
                        <ContentCard
                            title="Recent PBs"
                            scrollable
                            maxHeight="500px"
                        >
                            <React.Suspense
                                fallback={<SkeletonPersonalBests />}
                            >
                                <DataHolder />
                            </React.Suspense>
                        </ContentCard>
                    </Col>
                    <Col md={4}>
                        <SupportSection />
                    </Col>
                    <Col md={6}>
                        <ContentCard
                            title="Races"
                            callToActionText="View All"
                            callToActionHref="/races"
                        >
                            <React.Suspense>
                                <RelevantRacesFetcher />
                            </React.Suspense>
                        </ContentCard>
                    </Col>
                    <Col md={6}>
                        <ContentCard
                            title="Tournaments"
                            callToActionText="View All"
                            callToActionHref="/tournaments"
                        >
                            <React.Suspense>
                                <TournamentsFetcher />
                            </React.Suspense>
                        </ContentCard>
                    </Col>
                </Row>
            </MainContainer>

            <SidebarContainer>
                <HappeningNowSection />
                <LatestNewsSection />
                <NewAndTrending />
                <RecentlyVisited />
            </SidebarContainer>
        </HomeLayout>
    );
}
