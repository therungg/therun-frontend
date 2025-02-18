"use client";

import moment from "moment";
import { Card, Placeholder } from "react-bootstrap";
import useSWR from "swr";
import { FeedEntry } from "~app/api/feeds/gold-split/route";
import { fetcher } from "~src/utils/fetcher";

// TODO: This is the wrong approach. A "News" section should be able to combine multiple feeds and / or sources, whether that's
// The Run or anything else, sorted by date. Right now, this obviously heavily favours a single source.
export default function GoldSplitFeed() {
    const { data, error, isLoading } = useSWR(
        "/api/feeds/gold-split",
        fetcher,
        {
            revalidateOnFocus: false,
            refreshInterval: 900000, // 15 minutes
        },
    );

    if (error) return <div>Failed to load feed</div>;

    if (isLoading)
        return (
            <div className="d-flex flex-column gap-4">
                {[...Array(3)].map((_, index) => (
                    <div key={index} className="d-flex flex-column gap-2 p-2">
                        <div className="d-flex align-items-center justify-content-between">
                            <Placeholder animation="glow" className="w-75">
                                <Placeholder
                                    xs={12}
                                    className="text-light opacity-90 fs-6"
                                />
                            </Placeholder>
                            <Placeholder animation="glow" className="w-25">
                                <Placeholder
                                    xs={12}
                                    className="text-light opacity-60 small"
                                />
                            </Placeholder>
                        </div>
                        <Placeholder animation="glow" className="w-100">
                            <Placeholder
                                xs={12}
                                className="text-light opacity-70 small"
                            />
                            <Placeholder
                                xs={8}
                                className="text-light opacity-70 small"
                            />
                        </Placeholder>
                    </div>
                ))}
            </div>
        );

    return (
        <div className="d-flex flex-column gap-4">
            {data.slice(0, 3).map((article: FeedEntry, i: number) => (
                <Article article={article} key={i} />
            ))}
        </div>
    );
}

const Article = ({ article }) => (
    <Card className="bg-transparent border-0 mb-3">
        <Card.Body className="p-2">
            <div className="d-flex justify-content-between align-items-start mb-1">
                <Card.Title
                    className="text-light opacity-90 mb-0 fw-semibold"
                    style={{ fontSize: "0.9rem" }}
                >
                    {article.title}
                </Card.Title>
            </div>

            <div
                className="text-light opacity-60 mb-2"
                style={{ fontSize: "0.75rem" }}
            >
                {moment(new Date(article.pubDate)).fromNow()}
            </div>

            <Card.Text
                className="card-text text-light opacity-70 mb-2"
                style={{
                    fontSize: "0.8rem",
                    display: "-webkit-box",
                    WebkitLineClamp: "2",
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                }}
            >
                {article.description}
            </Card.Text>

            <a
                href={article.link}
                className="text-primary text-decoration-none"
                style={{ fontSize: "0.75rem" }}
                target="_blank"
                rel="noopener noreferrer"
            >
                Read {article.source === "substack" ? "on Substack" : "Article"}{" "}
                →
            </a>
        </Card.Body>
    </Card>
);
