import { Prisma } from "@prisma/client";
import { DataMemo } from "~/services/llm/llm.interface";

export interface conversationProps {
  name?: string;
  from?: string;
  lastMessage?: string;
  userID: string;
}

export interface msgProps {
  text: string;
  isBot: boolean;
  userID: string;
  conversationId: string;
  relatedMemo?: DataMemo[] | null,
  memoStorage?: DataMemo[] | null
}
export interface msgFuncProps {
  name: string;
  data?: string;
  comment?: string;
}

export interface conversationModifyProps {
  name?: string;
  from?: string;
  summarize?: string | null;
  lastMessage?: string;
}

export interface conversationFileProps {
  id: string;
  name: string;
  originalname: string;
  path: string;
  extension: string;
  size: number;
  url: string;
  userId: string;
  vectorDBIds: Prisma.JsonValue | null;
  conversationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
