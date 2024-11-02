import Link from "next/link";
import { PatreonBunnySvgWithoutLink } from "~app/patron/patreon-info";
import React from "react";
import { Col, Row, Button } from "react-bootstrap";
import { DataHolder } from "~src/components/frontpage/data-holder";
import { SkeletonPersonalBests } from "~src/components/skeleton/index/skeleton-personal-bests";
import { PopularGames } from "~src/components/game/popular-games";
import { SkeletonPopularGames } from "~src/components/skeleton/index/skeleton-popular-games";
import { useTranslations } from "next-intl";

export const Homepage = () => {
    const t = useTranslations("homepage");

    return (
        <div>
            <div className="px-4 pt-5 mt-3 mb-5 text-center">
                <h1 className="display-1 fw-medium">{t("title")}</h1>
                <h2 className="display-6 mb-5">{t("subtitle")}</h2>
                <div className="col-lg-6 mx-auto">
                    <p className="lead mb-4"></p>
                    <div className="d-grid gap-2 d-sm-flex justify-content-sm-center mb-5">
                        <Link href="/patron">
                            <Button
                                variant="secondary"
                                className="btn-lg me-sm-3 px-3 w-160p h-3r fw-medium hover:text-white"
                            >
                                {t("support")} <PatreonBunnySvgWithoutLink />
                            </Button>
                        </Link>
                        <Link href="/about">
                            <Button
                                variant="primary"
                                className="btn-lg me-sm-3 px-3 w-160p h-3r fw-medium"
                            >
                                {t("learnMore")}
                            </Button>
                        </Link>
                        <Link href="/livesplit">
                            <Button
                                variant="primary"
                                className="btn-lg px-3 w-160p h-3r fw-medium"
                            >
                                {t("liveSplitKey")}
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            <div>
                <Row className="text-center">
                    <Col xl={6} className="mt-4">
                        <h2>Recent Personal Bests</h2>
                        <React.Suspense fallback={<SkeletonPersonalBests />}>
                            <DataHolder />
                        </React.Suspense>
                    </Col>
                    <Col xl={6} className="mt-4">
                        <h2>Popular Games</h2>
                        <React.Suspense fallback={<SkeletonPopularGames />}>
                            <PopularGames />
                        </React.Suspense>
                    </Col>
                </Row>
            </div>
        </div>
    );
};
