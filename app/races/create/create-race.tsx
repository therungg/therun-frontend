"use client";

import { CreateRaceInput } from "../races.types";
import { joiResolver } from "@hookform/resolvers/joi";
import { useForm } from "react-hook-form";
import Joi from "joi";
import { createRace } from "~src/lib/races";
import { useRouter } from "next/navigation";

const raceSchema: Joi.ObjectSchema<CreateRaceInput> = Joi.object({
    game: Joi.string().required().min(1).max(200),
    category: Joi.string().required().min(1).max(200),
    canStartEarly: Joi.boolean().optional(),
    customName: Joi.string().min(1).max(200).optional(),
});

export default function CreateRace() {
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<CreateRaceInput>({
        resolver: joiResolver(raceSchema),
    });

    const onSubmit = async (values: CreateRaceInput) => {
        const result = await createRace(values);

        if (result.raceId) {
            router.push(`/races/${result.raceId}`);
        }
    };

    return (
        <div>
            <h1>Start a new Race</h1>

            <form onSubmit={handleSubmit(onSubmit)}>
                <div>
                    {errors.game && <div>{errors.game?.message as string}</div>}
                    Game: <input {...register("game")} />
                </div>
                <div>
                    {errors.category && (
                        <div>{errors.category?.message as string}</div>
                    )}
                    Category: <input {...register("category")} />
                </div>
                <div>
                    <input type="submit" />
                </div>
            </form>
        </div>
    );
}
