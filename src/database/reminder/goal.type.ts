import { Prisma } from "@prisma/client";

export type GoalProps = {
    title: string;
    color?: string;
    note?: string;
    userId: string;
    percent: number;
}

export type UpdateGoalProps = {
    title?: string;
    color?: string;
    note?: string;
    percent?: number;
}

export interface GoalWithAreaProps extends GoalProps {
    area?: Prisma.GoalAreasCreateNestedManyWithoutGoalInput;
}

export interface GoalUpdateWithAreaProps extends UpdateGoalProps {
    area?: Prisma.GoalAreasCreateNestedManyWithoutGoalInput;
}
