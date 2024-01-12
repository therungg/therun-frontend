import { Form } from "react-bootstrap";
import {
    SubmitButton,
    SubmitButtonProps,
} from "~src/actions/components/submit-button";

interface RaceActionButtonProps extends SubmitButtonProps {
    raceId: string;
    // eslint-disable-next-line no-unused-vars
    action: (raceInput: FormData) => Promise<any>;
}

export const RaceActionButton = ({
    raceId,
    pendingText,
    innerText,
    action,
}: RaceActionButtonProps) => {
    return (
        <Form action={action}>
            <input hidden name={"raceId"} value={raceId} readOnly />
            <SubmitButton innerText={innerText} pendingText={pendingText} />
        </Form>
    );
};
