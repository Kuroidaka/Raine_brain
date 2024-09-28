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

import { ChromaClient, OpenAIEmbeddingFunction } from 'chromadb';
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "langchain/document";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import {
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";
import { formatDocumentsAsString } from "langchain/util/document";
import { StringOutputParser } from "@langchain/core/output_parsers";
import * as fs from 'fs';
import { uploadFilePath } from "~/constant";

export class FileChatService {
  private collectionName: string = "agentic-chunks";
  private embeddings;
  private storage_path: string;
  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      modelName: "text-embedding-ada-002",
    });
  }

  public async askFile(q: string) {
    const vectorStore = await Chroma.fromExistingCollection(
      new OpenAIEmbeddings({
        modelName: "text-embedding-ada-002", // Change this to your specific model version
      }),
      {
        collectionName: this.collectionName
      }
    );
  
    const retriever = vectorStore.asRetriever(
      {
        searchType: "similarity",
        k: 10
      }
    );
    
    const context = await vectorStore.similaritySearchWithScore(q, 10);
  
    console.log(await retriever.invoke(q))

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

    return {
      comment: result,
      // data: relate data search from vector store
      data: context
    };
  }

  public async storageFile(path: string) {
    try {
      const semanticChunks = await semanticChunk(path);

      const vectorStore = new Chroma(this.embeddings, {
        collectionName: this.collectionName,
      });

      const documents = semanticChunks.map(
        (chunk) =>
          new Document({
            pageContent: chunk || " ",
            metadata: { source: "local" },
          })
      );

      const ids = await vectorStore.addDocuments(documents);

      return {
        ids,
      };
    } catch (error) {
      console.log("runCreateRoutine", error);
      throw error
    }
  }

  public async deleteDocs(ids: string[]) {
    try {
      // get vectordb by langchain
      const vectorStore = await Chroma.fromExistingCollection(
        new OpenAIEmbeddings({
          modelName: "text-embedding-ada-002", // Change this to your specific model version
        }),
        {
          collectionName: this.collectionName,
        }
      );
      await vectorStore.delete({ ids });

      console.log("document deleted");
    } catch (error) {
      console.log("deleteDocs", error);
      return {
        comment: "Error while retrieving data",
      };
    }
  }

  public async resetDocsMemo(path: string=uploadFilePath.vectorDBPath) {
    try {
      const vectorStore = new ChromaClient()
      await vectorStore.deleteCollection({
        name: this.collectionName
      })

      // remove all file in vectorDBPath
      await this.removeFile(path)
      console.log("collection deleted")
    } catch (error) {
      console.log("Error deleting file directory", error);
    }
  }
  // delete file dir
  public async removeFile(path: string) {
    try {
      await fs.promises.rm(path, { recursive: true });
      console.log("File directory deleted");
    } catch (error) {
      console.log("Error deleting file directory", error);
    }
  }
}
