import * as fs from 'fs';
import * as path from 'path';
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from '@langchain/openai';
import { JSONLoader } from "langchain/document_loaders/fs/json";

type Memo = [string, string];

export class MemoStore {
    private filePath: string;
    private uidTextDict: { [key: string]: Memo };

    constructor(filePath: string = path.join('src', 'assets', 'tmp', 'data.json')) {
        this.filePath = filePath;
        this.uidTextDict = this.loadData() || {};
        this.ensureDirectoryExistence(this.filePath);
    }

    // Ensure the directory exists
    private ensureDirectoryExistence(filePath: string): void {
        const dirname = path.dirname(filePath);
        if (fs.existsSync(dirname)) {
            return;
        }
        this.ensureDirectoryExistence(dirname);
        fs.mkdirSync(dirname);
    }

    // Save data to JSON file
    private saveData(): void {
        fs.writeFileSync(this.filePath, JSON.stringify(this.uidTextDict, null, 2), 'utf-8');
        console.log('Data saved successfully.');
    }

    // Load data from JSON file
    private loadData(): { [key: string]: Memo } | null {
        if (!fs.existsSync(this.filePath)) {
            console.log('No data file found.');
            return null;
        }
        const rawData = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(rawData) as { [key: string]: Memo };
    }

    // Add a new input-output pair
    public async addInputOutputPair(inputText: string, outputText: string): Promise<any> {
        const id = Math.random().toString();
        const vectorStore = await Chroma.fromTexts(
            [inputText],
            [{id: id}],
            new OpenAIEmbeddings(),
            {
                collectionName: "memos",
                url: "http://localhost:8000",
            }
        );

        // const resultOne = await vectorStore.similaritySearchWithScore(inputText, 10);
        
        this.uidTextDict[id] = [inputText, outputText];
        this.saveData();

        return "resultOne";
    }

    // Retrieve the stored pairs
    public getInputOutputPairs(): { [key: string]: Memo } {
        return this.uidTextDict;
    }

    // Retrieve data based on input
    public async get_related_memos(inputText: string, n_results = 5) {
        try {

            // if(n_results > )
            const loader = new JSONLoader("src/assets/tmp/data.json");
            const docs = await loader.load();

            // Load the docs into the vector store
            const vectorStore = await Chroma.fromDocuments(
                docs,
                new OpenAIEmbeddings(),
                {
                    collectionName: "memos",
                    url: "http://localhost:8000",
                }
            );
            // Search for the most similar document
            const results = await vectorStore.similaritySearchWithScore(inputText, n_results);

            const memos = []

            return results

        } catch (error) {
            throw error
        }
    }
}