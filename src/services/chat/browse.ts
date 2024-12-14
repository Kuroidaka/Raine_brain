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
You are a world-class researcher capable of conducting detailed research on any topic and producing fact-based results. You do not make up information; instead, you gather facts and data to support your research.

Follow these guidelines to complete your objective:

Conduct thorough research to determine as much relevant information as possible about the given objective.
Evaluate whether the information collected is sufficient to achieve the objective. If sufficient, halt further research; otherwise, continue.
If URLs to relevant articles or links are available, scrape them to gather more information.
After each round of scraping and searching, ask yourself: "Is there anything new I should search or scrape based on the collected data to improve the research quality?" If yes, continue searching, but do not exceed 2 iterations.
Avoid making up information. Only present facts and data gathered from research.
In your final output, include all reference data and links to back up your findings.
The addition of halt in step 2 clearly signals when the AI should prioritize efficiency and stop further processing.
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

      if (maxIterations > 3) {
        return "__end__";
      }
      if (lastMessage.tool_calls?.length) {
        return "tools";
      }
      return "__end__";
    };

    async function callModel(state: typeof StateAnnotation.State) {
      const messages = state.messages;
      try {
        const response = await model.invoke(messages);
        return { messages: [response] };
      } catch (error) {
        console.error("Error invoking the model:", error);
        return {
          messages: [
            new AIMessage(
              "I'm sorry, there was an error processing your request."
            ),
          ],
        };
      }
    }

    const workflow = new StateGraph(StateAnnotation)
      .addNode("agent", callModel)
      .addNode("tools", toolNode)
      .addEdge("__start__", "agent")
      .addConditionalEdges("agent", shouldContinue)
      .addEdge("tools", "agent");

    const checkpointer = new MemorySaver();

    const app = workflow.compile({ checkpointer });

    const linksString = links ? `\n\nLinks: ${links?.join("\n")}` : "";

    try {
      const finalState = await app.invoke(
        {
          messages: [
            new SystemMessage(instruction),
            new HumanMessage(q + linksString),
          ],
        },
        { configurable: { thread_id: "42" } }
      );

      const msg = finalState.messages[finalState.messages.length - 1]?.content;
      if (!msg || msg.trim() === "") {
        return "Sorry, I couldn't retrieve any information or process the request.";
      }
      return msg;
    } catch (error) {
      console.error("Error running the workflow:", error);
      return "Sorry, there was an issue running the workflow. Please try again later.";
    }
  }

  // private async debug(num: number) {
  //   // Define the text you want to write
  //   const textToInsert = `num: ${num}`;

  //   // Path of the file
  //   const filePath = "yourFile.txt";

  //   // Write the text to the file (if file exists, it will append)
  //   fs.appendFile(filePath, textToInsert + "\n", (err) => {
  //     if (err) {
  //       console.error("Error writing to file", err);
  //     } else {
  //       console.log("Text inserted successfully");
  //     }
  //   });
  // }

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
