import { Prisma } from "@prisma/client";

export type TaskProps = {
    title: string;
    color?: string | null;
    deadline: Date | string;
    note?: string | null;
    userId: string;
}

export type UpdateTaskProps = {
    title?: string;
    color?: string;
    deadline?: Date | string;
    note?: string;
    googleEventId?: string | null
}

export interface TaskWithAreaProps extends TaskProps {
    area?: Prisma.TaskAreasCreateNestedManyWithoutTaskInput
}

export interface UpdateTaskWithCateProps extends UpdateTaskProps {
    area?: Prisma.TaskAreasCreateNestedManyWithoutTaskInput
}

  
export type SubTaskProps = {
    title: string;
    taskId: string;
}

export type UpdateSubTaskProps = {
    title?: string;
    status: boolean;
}
  
enum Area {
    HEALTH = "health",
    PLAY = "play",
    SPIRITUALITY = "spirituality",
    ENVIRONMENT = "environment",
    WORK = "work",
    FINANCE = "finance",
    DEVELOPMENT = "development",
    RELATIONSHIPS = "relationships",
}
  