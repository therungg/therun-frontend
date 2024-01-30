import { Form } from "react-bootstrap";
import {
    SubmitButton,
    SubmitButtonProps,
} from "~src/actions/components/submit-button";

export interface RaceActionProps
    extends Omit<SubmitButtonProps, "pendingText" | "innerText"> {
    raceId: string;
}

interface RaceActionButtonProps extends SubmitButtonProps {
    // eslint-disable-next-line no-unused-vars
    action: (raceInput: FormData) => Promise<any>;
    raceId: string;
}

export const RaceActionButton = (props: RaceActionButtonProps) => {
    const { action, raceId, ...buttonProps } = props;
    return (
        <Form action={action}>
            <input hidden name={"raceId"} value={raceId} readOnly />
            <SubmitButton {...buttonProps} />
        </Form>
    );
};
