import * as fs from 'fs';
import * as path from 'path';
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from '@langchain/openai';
import { JSONLoader } from "langchain/document_loaders/fs/json";
import { ChromaClient } from 'chromadb';
import { assert } from '~/utils';
import { NotImplementedException } from '~/common/error';

type Memo = [string, string];

const chromaClient = new ChromaClient({
    path: "http://localhost:8000"
  });

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
        try {
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
    
            const resultOne = await vectorStore.similaritySearchWithScore(inputText, 10);
            
            this.uidTextDict[id] = [inputText, outputText];
            this.saveData();


            return resultOne;
        } catch (error) {
            console.log(error)
            throw error
        }
       
    }

    // Retrieve the stored pairs
    public getInputOutputPairs(): { [key: string]: Memo } {
        return this.uidTextDict;
    }

    // Retrieve data based on input
    public async get_related_memos(inputText: string, n_results = 10) {
        try {

            const uidTextDictLength = Object.keys(this.uidTextDict).length;
            if (n_results > uidTextDictLength) {
                n_results = uidTextDictLength;
            }
            // // Load the docs into the vector store
            const vectorStore = await Chroma.fromExistingCollection(
                new OpenAIEmbeddings(),
                { collectionName: "memos" },
              );
            // Search for the most similar document
            const results = await vectorStore.similaritySearchWithScore(inputText, n_results);

            const memos = []
            const numResult = results.length

            for(let i = 0; i < numResult; i++) {
                const uid = results[i][0].metadata.id
                const input_text = results[i][0].pageContent
                const distance = results[i][1]

                if(distance < .3) {
                    const input_text2 = this.uidTextDict[uid][0]
                    const output_text = this.uidTextDict[uid][1]
                    assert(input_text == input_text2) 
    
                    memos.push({ input_text, output_text })
                }

            }
            // const collections = await chromaClient.getCollection({
            //     name: "memos"
            // });
            // console.log("collections", collections)

            return memos

        } catch (error) {
            throw error
        }
    }

    public async resetDb() {
        try {
            await chromaClient.deleteCollection({name: "memos"});
            await chromaClient.createCollection({name: "memos"});
            this.uidTextDict = {}
            this.saveData()
        } catch (error) {
            console.log(error)
            throw new NotImplementedException('>>MemoStore>>resetDb' + error)
        }
    }
}