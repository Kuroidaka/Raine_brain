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
    private uidTextDict: { [key: string]: Memo };
    private path_to_db_object: string;
    private recall_threshold: number;
    constructor(
        reset=false,
        memo_path: string = path.join('src', 'assets', 'tmp', 'memos'),
        recall_threshold=.5
    ) {

        this.uidTextDict = {};
        this.path_to_db_object = path.join(memo_path, 'data.json')
        this.ensureDirectoryExistence(this.path_to_db_object);
        this.recall_threshold = recall_threshold

        if (!reset && fs.existsSync(this.path_to_db_object)) {
            console.log('\nLOADING MEMORY FROM DISK', 'light_green');
            this.uidTextDict = this.loadData() || {};
            // if (this.verbosity >= 3) {
            //     this.listMemos();
            // }
        }

        // Clear the DB if requested.
        if (reset) {
            this.resetDb();
        }
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

    // Load data from JSON file
    private loadData(): { [key: string]: Memo } | null {
        if (!fs.existsSync(this.path_to_db_object)) {
            console.log('No data file found.');
            return null;
        }
        const rawData = fs.readFileSync(this.path_to_db_object, 'utf-8');
        return JSON.parse(rawData) as { [key: string]: Memo };
    }

    // Add a new input-output pair
    public async addInputOutputPair(inputText: string, outputText: string): Promise<void> {
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
    
            await vectorStore.similaritySearchWithScore(inputText, 10);
            
            this.uidTextDict[id] = [inputText, outputText];

            console.log("after save this.uidTextDict", this.uidTextDict)
            // this.saveData();

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
    public async get_related_memos(inputText: string, n_results = 10):Promise<{ input_text:string, output_text:string }[]> {
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

                if(distance < this.recall_threshold) {
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

    // Save data to JSON file
    public saveData(): void {

        console.log("prepare to save this.uidTextDict", this.uidTextDict)
        fs.writeFileSync(this.path_to_db_object, JSON.stringify(this.uidTextDict, null, 2), 'utf-8');
        console.log('Data saved successfully.');
    }
}