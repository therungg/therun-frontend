"use client";
import { Col, Row } from "react-bootstrap";
import { FromNow } from "./util/datetime";

export const Blogpost = ({ post }) => {
    return (
        <div>
            <a href="/blog">{"< "}Back to Blog</a>
            <h1 style={{ textAlign: "center" }}>{post.title}</h1>
            <div style={{ textAlign: "center" }}>
                <small>
                    {post.date.toDateString()}, <FromNow time={post.date} />
                </small>
            </div>
            <hr />
            <Row>
                <Col />
                <Col xl={6} lg={8} md={12}>
                    {post.full}
                </Col>
                <Col />
            </Row>
        </div>
    );
};
