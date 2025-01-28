import React from "react";
import { Button } from "~src/components/Button/Button";

interface ErrorBoundaryState {
    hasError: boolean;
}
class ErrorBoundary extends React.Component<
    React.PropsWithChildren,
    ErrorBoundaryState
> {
    constructor(props: React.PropsWithChildren) {
        super(props);

        // Define a state variable to track whether is an error or not
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        // Update state so the next render will show the fallback UI

        return { hasError: true };
    }

    render() {
        // Check if the error is thrown
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div>
                    <h2>Oops, there is an error!</h2>
                    <Button onClick={() => this.setState({ hasError: false })}>
                        Try again?
                    </Button>
                </div>
            );
        }

        // Return children components in case of no error

        return this.props.children;
    }
}

export default ErrorBoundary;
