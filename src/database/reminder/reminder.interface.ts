import { Prisma } from "@prisma/client";

export interface TaskProps {
    title: string;
    color?: string;
    deadline: Date | string | null;
    note?: string;
    userId: string;
}

export interface UpdateTaskProps {
    title?: string;
    color?: string;
    deadline?: Date | string | null;
    note?: string;
}

export interface TaskWithAreaProps extends TaskProps {
    area?: Prisma.TaskAreasCreateNestedManyWithoutTaskInput
}

export interface UpdateTaskWithCateProps extends UpdateTaskProps {
    area?: Prisma.TaskAreasCreateNestedManyWithoutTaskInput
}

  
export interface SubTaskProps {
    title: string;
    taskId: string;
}

export interface UpdateSubTaskProps {
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
  