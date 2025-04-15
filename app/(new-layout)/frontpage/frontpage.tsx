import { Suspense } from "react";
import { Panel } from "../components/panel.component";
import RacePanel from "./panels/race-panel";

export default async function FrontPage() {
    return (
        <div className="row d-flex flex-wrap">
            <div className="col col-xl-7 col-12">
                <section>
                    <Panel subtitle="Subtitle" title="Title">
                        <div>Item 1</div>
                        <div>Item 2</div>
                    </Panel>
                    <Panel subtitle="Subtitle" title="Title">
                        <div>Item 1</div>
                        <div>Item 2</div>
                    </Panel>
                </section>
            </div>
            <div className="col col-xl-5 col-12">
                <Suspense fallback={<div>Loading??</div>}>
                    <RacePanel />
                </Suspense>
                <Panel subtitle="Subtitle" title="Title">
                    <div>Item 1</div>
                    <div>Item 2</div>
                </Panel>
            </div>
        </div>
    );
}
