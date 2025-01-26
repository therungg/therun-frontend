import { Form } from "react-bootstrap";
import {
    SubmitButton,
    SubmitButtonProps,
} from "~src/components/Button/SubmitButton";

export interface RaceActionProps
    extends Omit<SubmitButtonProps, "pendingText" | "innerText"> {
    raceId: string;
}

interface RaceActionButtonProps extends SubmitButtonProps {
    action: (raceInput: FormData) => Promise<void>;
    raceId: string;
}

export const RaceActionButton = (props: RaceActionButtonProps) => {
    const { action, raceId, ...buttonProps } = props;
    return (
        <Form action={action} className={buttonProps.className}>
            <input hidden name="raceId" value={raceId} readOnly />
            <SubmitButton {...buttonProps} />
        </Form>
    );
};
