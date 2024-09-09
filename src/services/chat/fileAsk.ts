import {
  calculateCosineDistancesAndSignificantShifts,
  generateAndAttachEmbeddings,
  groupSentencesIntoChunks,
  loadTextFile,
  semanticChunk,
  splitToSentencesUsingNLP,
  structureSentences,
} from "~/common/semeticChunk";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "langchain/document";
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";
import { formatDocumentsAsString } from "langchain/util/document";
import { StringOutputParser } from "@langchain/core/output_parsers";

export class FileChatService {
  private collectionName: string = "agentic-chunks";
  private embeddings
  private storage_path:string
  constructor() {
    this.embeddings = new OpenAIEmbeddings({
        modelName: "text-embedding-ada-002",
    });
  }

    public async askFile(q: string) {
        // Initialize vector store using Chroma with OpenAI embeddings

        const vectorStore = new Chroma(this.embeddings, {
            collectionName: this.collectionName,
        });

        // const documents = chunks.map(
        // (chunk) =>
        //     new Document({
        //     pageContent: chunk,
        //     metadata: { source: "local" },
        //     })
        // );

        // const vectorStore = await Chroma.fromDocuments(
        // documents,
        // new OpenAIEmbeddings({
        //     modelName: "text-embedding-ada-002", // Change this to your specific model version
        // }),
        // { collectionName: this.collectionName }
        // );

        // Retrieve documents with a retriever
        const retriever = vectorStore.asRetriever();

        // Define the prompt template for generating the response
        const promptTemplate = `Answer the question based only on the following context:
        {context}
        Question: {question}`;

        const prompt = ChatPromptTemplate.fromTemplate(promptTemplate);

        // Define LLM (Local Language Model), here OpenAI is used as an example
        const llm = new ChatOpenAI({
            modelName: "gpt-4o-mini-2024-07-18",
            temperature: 0.7, // Adjust the temperature parameter to control randomness
        });

        const chain = RunnableSequence.from([
        {
            context: retriever.pipe(formatDocumentsAsString),
            question: new RunnablePassthrough(),
        },
        prompt,
        llm,
        new StringOutputParser(),
        ]);

        const result = await chain.invoke(q);

        console.log(result);
    }

  public async storageFile() {
    try {
      const semanticChunks = await semanticChunk("/");

      const documents = semanticChunks.map(
        (chunk) =>
          new Document({
            pageContent: chunk,
            metadata: { source: "local" },
          })
      );

      // const vectorStore = await Chroma.fromDocuments(
      //     documents,
      //     new OpenAIEmbeddings({
      //       modelName: "text-embedding-ada-002", // Change this to your specific model version
      //     }),
      //     { collectionName: this.collectionName }
      //   );

      const vectorStore = new Chroma(this.embeddings, {
        collectionName: this.collectionName,
      });

      const ids = await vectorStore.addDocuments(documents);

      return {
        ids
      }
    } catch (error) {
      console.log("runCreateRoutine", error);
      return {
        comment: "Error while retrieving data",
      };
    }
  }
}
