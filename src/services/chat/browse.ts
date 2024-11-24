import { ChatOpenAI, OpenAI } from "@langchain/openai";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  PromptTemplate,
} from "@langchain/core/prompts";
import { OpenAIAgentTokenBufferMemory } from "langchain/agents/toolkits";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { createToolCallingAgent } from "langchain/agents";
import { AgentExecutor } from "langchain/agents";
import * as fs from "fs";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import ScrapeWebsiteTool from "./scrape";
import GoogleSearchTool from "./searchEngine";
import {
  AIMessage,
  HumanMessage,
  BaseMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { MemorySaver, Annotation, StateGraph } from "@langchain/langgraph";

export class BrowseService {
  private SearchAgentInstruction = `
  Today is ${new Date().toLocaleDateString()}.
  You are a world-class researcher capable of conducting detailed research on any topic and producing fact-based results. You do not make up information; instead, you gather facts and data to support your research. All responses should be in English.
  Follow these guidelines to complete your objective:
  1. Conduct thorough research to gather as much information as possible about the given objective.
  2. Consider if the information is related to the objective and have enough information then stop the research otherwise continue.
  2. If URLs to relevant articles or links are available, scrape them to gather more information.
  3. After each round of scraping and searching, ask yourself: "Is there anything new I should search or scrape based on the collected data to improve the research quality?" If yes, continue searching, but do not exceed 2 iterations.
  4. Avoid making up information. Only present facts and data gathered from research.
  5. In your final output, include all reference data and links to back up your findings.
  `;

  private ScrapeAgentInstruction = `
Today is ${new Date().toLocaleDateString()}.
You are a world-class researcher capable of conducting detailed research on any topic and producing fact-based results base on the links provided. You do not make up information; instead, you gather facts and data to support your research. All responses should be in English.
Follow these guidelines to complete your objective:
1. Scrape the links to gather information.
2. Avoid making up information. Only present facts and data gathered from scraping.

  `;
  constructor() {}

  private async browseWithQuery(q: string) {
    try {
      // defind tool
      const scrapeTool = new ScrapeWebsiteTool();
      const searchTool = new GoogleSearchTool();

      const tools = [searchTool, scrapeTool];

      return this.processAgentGraph(q, this.SearchAgentInstruction, tools);
    } catch (error) {
      console.log(error);
      return `Error: ${error}`;
    }
  }

  private async browseWithLinks(q: string, links: string[]) {
    try {
      const scrapeTool = new ScrapeWebsiteTool();

      const tools = [scrapeTool];

      return this.processAgentGraph(
        q,
        this.ScrapeAgentInstruction,
        tools,
        links
      );
    } catch (error) {
      console.log(error);
      return `Error: ${error}`;
    }
  }

  private async processAgentGraph(
    q: string,
    instruction: string,
    tools: any[],
    links?: string[]
  ) {
    const StateAnnotation = Annotation.Root({
      messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
      }),
    });

    const toolNode = new ToolNode(tools);

    const model = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      modelName: "gpt-4o-mini",
      temperature: 0,
    }).bindTools(tools);

    let maxIterations = 0;
    const shouldContinue = (state: typeof StateAnnotation.State) => {
      const messages = state.messages;
      const lastMessage = messages[messages.length - 1] as AIMessage;
      maxIterations++;

      this.debug(maxIterations);

      if (maxIterations > 2) {
        return "__end__";
      }
      // If the LLM makes a tool call, then we route to the "tools" node
      if (lastMessage.tool_calls?.length) {
        return "tools";
      }
      // Otherwise, we stop (reply to the user)
      return "__end__";
    };

    // Define the function that calls the model
    async function callModel(state: typeof StateAnnotation.State) {
      const messages = state.messages;
      const response = await model.invoke(messages);

      // We return a list, because this will get added to the existing list
      return { messages: [response] };
    }

    // Define a new graph
    const workflow = new StateGraph(StateAnnotation)
      .addNode("agent", callModel)
      .addNode("tools", toolNode)
      .addEdge("__start__", "agent")
      .addConditionalEdges("agent", shouldContinue)
      .addEdge("tools", "agent");

    // Initialize memory to persist state between graph runs
    const checkpointer = new MemorySaver();

    const app = workflow.compile({ checkpointer });

    const linksString = links ? `\n\nLinks: ${links?.join("\n")}` : "";
    // Use the Runnable
    const finalState = await app.invoke(
      {
        messages: [
          new SystemMessage(instruction),
          new HumanMessage(q + linksString),
        ],
      },
      { configurable: { thread_id: "42" } }
    );

    return finalState.messages[finalState.messages.length - 1].content;
  }

  private async debug(num: number) {
    // Define the text you want to write
    const textToInsert = `num: ${num}`;

    // Path of the file
    const filePath = "yourFile.txt";

    // Write the text to the file (if file exists, it will append)
    fs.appendFile(filePath, textToInsert + "\n", (err) => {
      if (err) {
        console.error("Error writing to file", err);
      } else {
        console.log("Text inserted successfully");
      }
    });
  }

  public async browse(q: string, links?: string[]) {
    let content: string;
    if (links) {
      content = await this.browseWithLinks(q, links);
    } else {
      content = await this.browseWithQuery(q);
    }

    return {
      comment: content,
      // data: relate data search from vector store
      data: [],
    };
  }
}
