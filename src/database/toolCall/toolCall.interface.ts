import { AiTool, UserOnAiTools } from "@prisma/client";

export type tools = UserOnAiTools & { aiTool: AiTool }