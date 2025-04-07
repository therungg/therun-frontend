"use client";

import { useState } from "react";
import { Form } from "react-bootstrap";
import { MultiValue } from "react-select";
import CreatableSelect from "react-select/creatable";
import { Event } from "types/events.types";

export const EventTagInput = ({ event }: { event?: Event }) => {
    const [tags, setTags] = useState<MultiValue<{ value: string }>>(
        event?.tags?.map((tag) => {
            return {
                label: tag,
                value: tag,
            };
        }) || [],
    );
    const [inputValue, setInputValue] = useState("");

    const handleChange = (newValue: MultiValue<{ value: string }>) => {
        setTags(newValue);
    };

    const handleKeyDown = (event: {
        key: string;
        preventDefault: () => void;
    }) => {
        if (!inputValue) return;

        if (event.key === "Enter") {
            const alreadyExists = tags.some((tag) => tag.value === inputValue);
            if (!alreadyExists) {
                const newTag = {
                    label: inputValue,
                    value: inputValue,
                };
                setTags((prev) => [...prev, newTag]);
            }
            setInputValue(""); // clear input
            event.preventDefault(); // prevent form submit
        }
    };

    return (
        <div>
            <Form.Group className="mb-3">
                <Form.Label htmlFor="tags" className="mb-2">
                    Tags{" "}
                    <span className="text-muted fs-small ms-1">
                        Press enter to submit tag - Allows people to search for
                        your event by these tags.
                    </span>
                </Form.Label>
                <CreatableSelect
                    classNames={{
                        control: () =>
                            "cursor-text bg-body-tertiary border border-none",
                        menu: () =>
                            "pointer bg-body-tertiary border border-none",
                        input: () => "color-text ms-1",
                        multiValueLabel: () => "color-text",
                        multiValue: () => "bg-body-secondary ms-1",
                        indicatorsContainer: () => "d-none",
                    }}
                    isMulti
                    menuIsOpen={false}
                    options={[]}
                    value={tags}
                    onChange={handleChange}
                    placeholder="Add Event Tags here..."
                    inputValue={inputValue}
                    onInputChange={(val) => setInputValue(val)}
                    onKeyDown={handleKeyDown}
                />
                <input
                    hidden
                    value={tags.map((tag) => tag.value).join(",")}
                    name="tags"
                    id="tags"
                />
            </Form.Group>
        </div>
    );
};
