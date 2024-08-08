import { Prisma } from "@prisma/client";

export interface TaskProps {
    title: string;
    color?: string;
    time: Date;
    note?: string;
    userId: string;
}

export interface UpdateTaskProps {
    title?: string;
    color?: string;
    time?: Date;
    note?: string;
}

export interface TaskWithCateProps extends TaskProps {
    categories?: Prisma.TaskCategoryCreateNestedManyWithoutTaskInput
}

export interface UpdateTaskWithCateProps extends UpdateTaskProps {
    categories?: Prisma.TaskCategoryCreateNestedManyWithoutTaskInput
}

  
export interface SubTaskProps {
    title: string;
    taskId: string;
}

export interface UpdateSubTaskProps {
    title?: string;
    status: boolean;
}
  
enum Categories {
    HEALTH = "health",
    PLAY = "play",
    SPIRITUALITY = "spirituality",
    ENVIRONMENT = "environment",
    WORK = "work",
    FINANCE = "finance",
    DEVELOPMENT = "development",
    RELATIONSHIPS = "relationships",
}
  