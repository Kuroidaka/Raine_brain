import { ChatOpenAI, OpenAI } from "@langchain/openai";
import { loadSummarizationChain } from "langchain/chains";
import { PromptTemplate } from "@langchain/core/prompts";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";

async function splitText(text: string) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 500,
    separators: ["\n\n", "\n"],
  });

  const docOutput = await splitter.splitDocuments([
    new Document({ pageContent: text }),
  ]);

  return docOutput;
}

export async function summaryLongText(
  text: string,
  objective: string
): Promise<string> {
  const model = new ChatOpenAI({ modelName: "gpt-4o-mini", temperature: 0 });
  console.log("summerizing...", objective);
  const docOutput = await splitText(text);

  const promptTemplate = `
    Write a summary of the following text for {objective}: 
    --------
    {text}
    --------

    SUMMARY:
    `;

  const map_prompt_template = new PromptTemplate({
    inputVariables: ["objective", "text"],
    template: promptTemplate,
  });

  const summarizeChain = loadSummarizationChain(model, {
    type: "map_reduce",
    verbose: false,
    combineMapPrompt: map_prompt_template,
    combinePrompt: map_prompt_template,
  });

  const summary = await summarizeChain.invoke({
    input_documents: docOutput,
    objective: objective,
  });

  return summary.text;
}
