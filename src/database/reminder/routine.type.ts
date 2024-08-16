import { Prisma } from "@prisma/client";

export type RoutineProps = {
    title: string;
    color?: string;
    note?: string;
    userId: string;
    isActive?: boolean;
}

export type UpdateRoutineProps = {
    title?: string;
    color?: string;
    note?: string;
    isActive?: boolean;
}

export interface RoutineWithAreaProps extends RoutineProps {
    area?: Prisma.RoutineAreasCreateNestedManyWithoutRoutineInput;
}

export interface RoutineUpdateWithAreaProps extends UpdateRoutineProps {
    area?: Prisma.RoutineAreasCreateNestedManyWithoutRoutineInput;
}


export type RoutineDateProps = {
    routineID: string;
    completion_date: Date;
};

export type UpdateRoutineDateProps = {
    completion_date: Date;
};
