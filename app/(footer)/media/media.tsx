"use client";
import { Title } from "~src/components/title";
import { Button, Col, Image, Row } from "react-bootstrap";
import Switch from "react-switch";
import { useEffect, useState } from "react";

export const Media = () => {
    const [loaded, setLoaded] = useState(false);
    const cfBaseUrl = "https://d73zqe3h0v0mi.cloudfront.net/therun/";

    const [logoTransparent, setLogoTransparent] = useState(true);
    const [logoDark, setLogoDark] = useState(true);
    const [logoCropped, setLogoCropped] = useState(true);
    const [logoUrl, setLogoUrl] = useState(true);

    const [bannerTransparent, setBannerTransparent] = useState(true);
    const [bannerDark, setBannerDark] = useState(true);
    const [bannerWithLogo, setBannerWithLogo] = useState(true);

    const getLogoPath = () => {
        let path = "media/";
        path += logoCropped ? "logo_cropped/" : "logo/";

        path += "logo_";
        path += logoDark ? "dark_theme_" : "light_theme_";
        path += logoUrl ? "text" : "no_text";

        if (logoTransparent) path += "_transparent";

        path += ".png";

        return path;
    };

    const getBannerPath = () => {
        let path = "media/banner/";
        path += bannerWithLogo ? "twitterbanner_" : "banner_no_logo_";
        path += bannerDark ? "dark_theme" : "light_theme";
        path += bannerTransparent ? "_transparent" : "";
        path += ".png";

        return path;
    };

    const logoPath = getLogoPath();
    const logoCfUrl = cfBaseUrl + logoPath;

    const bannerPath = getBannerPath();
    const bannerCfUrl = cfBaseUrl + bannerPath;

    useEffect(() => {
        if (!loaded) {
            setLoaded(true);
        }
    }, [loaded]);

    return (
        <div>
            <Title>Media</Title>
            <p>
                I created a little media kit with the logo, some banners, and
                the original gimp files. Use them however you want, as long as
                you link back to therun.gg. If you can not explicitly link back
                to the site, please use the version of the logo that has the url
                in it.
            </p>

            <hr />

            <div>Download full media kit (925kb zipped):</div>
            <div className="my-3">
                <a href={`${cfBaseUrl}therun-media.zip`}>
                    <Button
                        variant={"primary"}
                        className="btn-lg px-3 h-3r fw-medium"
                    >
                        Download full kit
                    </Button>
                </a>
            </div>

            <hr />
            <p>
                You can also download all the files seperately. First select
                which variant you want to download, then click the download
                button.
            </p>
            {loaded && (
                <div>
                    <Row className="g-4">
                        <Col xs={12} xl={6}>
                            <h2 className="mb-3">Logo</h2>
                            <Row className="mb-3">
                                <Col xs={12} md={6}>
                                    <div className="d-flex justify-content-start align-self-center mb-2">
                                        <Switch
                                            onColor={getComputedStyle(
                                                document.documentElement
                                            ).getPropertyValue(
                                                "--bs-link-color"
                                            )}
                                            offColor={getComputedStyle(
                                                document.documentElement
                                            ).getPropertyValue(
                                                "--bs-tertiary-bg"
                                            )}
                                            name={"switch"}
                                            onChange={(checked) => {
                                                setLogoTransparent(checked);
                                            }}
                                            checked={logoTransparent}
                                        />
                                        <label
                                            htmlFor={"switch"}
                                            className="ms-2 align-self-center text-nowrap"
                                        >
                                            {" "}
                                            Transparent background{" "}
                                        </label>
                                    </div>
                                    <div className="d-flex justify-content-start align-self-center mb-2">
                                        <Switch
                                            onColor={getComputedStyle(
                                                document.documentElement
                                            ).getPropertyValue(
                                                "--bs-link-color"
                                            )}
                                            offColor={getComputedStyle(
                                                document.documentElement
                                            ).getPropertyValue(
                                                "--bs-tertiary-bg"
                                            )}
                                            name={"switch"}
                                            onChange={(checked) => {
                                                setLogoDark(checked);
                                            }}
                                            checked={logoDark}
                                        />
                                        <label
                                            htmlFor={"switch"}
                                            className="ms-2 align-self-center text-nowrap"
                                        >
                                            {" "}
                                            Dark theme{" "}
                                        </label>
                                    </div>
                                    <div className="d-flex justify-content-start align-self-center mb-2">
                                        <Switch
                                            onColor={getComputedStyle(
                                                document.documentElement
                                            ).getPropertyValue(
                                                "--bs-link-color"
                                            )}
                                            offColor={getComputedStyle(
                                                document.documentElement
                                            ).getPropertyValue(
                                                "--bs-tertiary-bg"
                                            )}
                                            name={"switch"}
                                            onChange={(checked) => {
                                                setLogoCropped(checked);
                                            }}
                                            checked={logoCropped}
                                        />
                                        <label
                                            htmlFor={"switch"}
                                            className="ms-2 align-self-center text-nowrap"
                                        >
                                            {" "}
                                            Cropped{" "}
                                        </label>
                                    </div>
                                    <div className="d-flex justify-content-start align-self-center mb-2">
                                        <Switch
                                            onColor={getComputedStyle(
                                                document.documentElement
                                            ).getPropertyValue(
                                                "--bs-link-color"
                                            )}
                                            offColor={getComputedStyle(
                                                document.documentElement
                                            ).getPropertyValue(
                                                "--bs-tertiary-bg"
                                            )}
                                            name={"switch"}
                                            onChange={(checked) => {
                                                setLogoUrl(checked);
                                            }}
                                            checked={logoUrl}
                                        />
                                        <label
                                            htmlFor={"switch"}
                                            className="ms-2 align-self-center text-nowrap"
                                        >
                                            {" "}
                                            With URL text in logo{" "}
                                        </label>
                                    </div>
                                </Col>
                                <Col xs={12} md={6} className="ps-md-5">
                                    <Image
                                        src={`/${logoPath}`}
                                        height={130}
                                        alt={"The Run Logo"}
                                    />
                                </Col>
                            </Row>
                            <div>
                                <a href={logoCfUrl}>
                                    <Button
                                        variant={"primary"}
                                        className="btn-lg px-3 h-3r fw-medium"
                                    >
                                        Download logo
                                    </Button>
                                </a>
                            </div>
                        </Col>

                        <Col xs={12} xl={6}>
                            <h2 className="mb-3">Banner</h2>
                            <Row className="mb-3">
                                <Col xs={12} md={6}>
                                    <div className="d-flex justify-content-start align-self-center mb-2">
                                        <Switch
                                            onColor={getComputedStyle(
                                                document.documentElement
                                            ).getPropertyValue(
                                                "--bs-link-color"
                                            )}
                                            offColor={getComputedStyle(
                                                document.documentElement
                                            ).getPropertyValue(
                                                "--bs-tertiary-bg"
                                            )}
                                            name={"switch"}
                                            onChange={(checked) => {
                                                setBannerTransparent(checked);
                                            }}
                                            checked={bannerTransparent}
                                        />
                                        <label
                                            htmlFor={"switch"}
                                            className="ms-2 align-self-center text-nowrap"
                                        >
                                            {" "}
                                            Transparent background{" "}
                                        </label>
                                    </div>
                                    <div className="d-flex justify-content-start align-self-center mb-2">
                                        <Switch
                                            onColor={getComputedStyle(
                                                document.documentElement
                                            ).getPropertyValue(
                                                "--bs-link-color"
                                            )}
                                            offColor={getComputedStyle(
                                                document.documentElement
                                            ).getPropertyValue(
                                                "--bs-tertiary-bg"
                                            )}
                                            name={"switch"}
                                            onChange={(checked) => {
                                                setBannerDark(checked);
                                            }}
                                            checked={bannerDark}
                                        />
                                        <label
                                            htmlFor={"switch"}
                                            className="ms-2 align-self-center text-nowrap"
                                        >
                                            {" "}
                                            Dark theme{" "}
                                        </label>
                                    </div>
                                    <div className="d-flex justify-content-start align-self-center mb-2">
                                        <Switch
                                            onColor={getComputedStyle(
                                                document.documentElement
                                            ).getPropertyValue(
                                                "--bs-link-color"
                                            )}
                                            offColor={getComputedStyle(
                                                document.documentElement
                                            ).getPropertyValue(
                                                "--bs-tertiary-bg"
                                            )}
                                            name={"switch"}
                                            onChange={(checked) => {
                                                setBannerWithLogo(checked);
                                            }}
                                            checked={bannerWithLogo}
                                        />
                                        <label
                                            htmlFor={"switch"}
                                            className="ms-2 align-self-center text-nowrap"
                                        >
                                            {" "}
                                            With logo{" "}
                                        </label>
                                    </div>
                                </Col>
                                <Col xs={12} md={6}>
                                    <Image
                                        src={`/${bannerPath}`}
                                        height={130}
                                        alt={"The Run Logo"}
                                    />
                                </Col>
                            </Row>

                            <div className="align-self-end">
                                <a href={bannerCfUrl}>
                                    <Button
                                        variant={"primary"}
                                        className="btn-lg px-3 h-3r fw-medium"
                                    >
                                        Download banner
                                    </Button>
                                </a>
                            </div>
                        </Col>
                    </Row>
                </div>
            )}
        </div>
    );
};

export default Media;
