import { getSession } from "~src/actions/session.action";
import HowItWorksPanels from "~app/how-it-works/how-it-works-panels";

export const revalidate = 0;

export default async function howItWorks() {
    const session = getSession();

    return (
        <>
            <h2>How it works</h2>
            <p>
                The Run is a 100% free speedrun statistics tool. Read how it
                works below!
            </p>
            <HowItWorksPanels session={session} />
        </>
    );
}
