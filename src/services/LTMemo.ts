import * as fs from 'fs';
import * as path from 'path';
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from '@langchain/openai';
import { JSONLoader } from "langchain/document_loaders/fs/json";
import { ChromaClient, OpenAIEmbeddingFunction } from 'chromadb';
import { assert, deleteFilesInDirectory, deleteFolderRecursive, generateId } from '~/utils';
import { NotImplementedException } from '~/common/error';
import chalk from 'chalk';
import { DataMemo } from './llm/llm.interface';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

const embeddingFunction = new OpenAIEmbeddingFunction({
    openai_api_key: OPENAI_API_KEY as string,
    openai_model: "text-embedding-3-small"
})

type Memo = [string, string, string];

const chromaClient = new ChromaClient({
    path: "http://localhost:8000"
  });



export class MemoStore {
    public uidTextDict: { [key: string]: Memo };
    private path_to_user_db_object: string;
    private path_to_bot_db_object: string;
    private recall_threshold: number;
    private memo_path:string
    private debug: number;
    constructor(
        debug:number,
        reset=false,
        memo_path: string = path.join('src', 'assets', 'tmp', 'memos'),
        recall_threshold=.5,
    ) {
        this.debug = debug
        this.uidTextDict = {};
        this.memo_path = memo_path;
        this.path_to_user_db_object = path.join(memo_path, 'user_memo.json')
        this.path_to_bot_db_object = path.join(memo_path, 'bot_memo.json')
        this.ensureDirectoryExistence(this.path_to_user_db_object);
        this.ensureDirectoryExistence(this.path_to_bot_db_object);

        this.recall_threshold = recall_threshold

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
    private async loadData(path: string): Promise<{ [key: string]: Memo } | null> {
        try {
            await fs.promises.access(path); // Check if the file exists
        } catch {
            console.log('No data file found.');
            return null;
        }

        try {
            const rawData = await fs.promises.readFile(path, 'utf-8'); // Read the file contents asynchronously
            return JSON.parse(rawData) as { [key: string]: Memo };
        } catch (error) {
            console.error('Error reading or parsing data file:', error);
            return null;
        }
    }

    // Add a new input-output pair
    public async addInputOutputPair(inputText: string, outputText: string): Promise<void> {
        try {

            const id = generateId();
            // console.log("id", id)

            const collection = await chromaClient.getOrCreateCollection({name: "memos"}) 
            await collection.add({
                ids: [id],
                metadatas: {
                    createdAt: new Date().toISOString()
                },
                documents: [inputText]
            })
    
            // const storage = await collection.query({
            //     nResults: 10,
            //     queryTexts: [inputText]
            // })
            // console.log("storage", storage)
            this.uidTextDict[id] = [inputText, outputText, new Date().toISOString()];
            // this.saveData(botRelate);

        } catch (error) {
            console.log(error)
            throw error
        }
       
    }

    public async rememberMemo(inputText: string, outputText: string, relateMemo:DataMemo[]): Promise<void> {
        try {
            
            return this.addInputOutputPair(inputText, outputText)


        } catch (error) {
            console.log(error)
            throw error
        }
       
    }

    public async repairInputOutputPair(ids: string[], inputTexts: string[], outputTexts: string[]): Promise<void> {
        try {
            // const collection = await chromaClient.getOrCreateCollection({name: "memos"})

            // Search for the most similar document    
            // await collection.upsert({
            //     ids: ids,
            //     documents: inputTexts,
            //   });
            // await vectorStore.similaritySearchWithScore(inputText, 10);

            for(let i = 0; i < ids.length; i ++ ) {
                // this.uidTextDict[ids[i]] = [inputTexts[i], outputTexts[i]];
            }
            // this.saveData(botRelate);

        } catch (error) {
            console.log(error)
            throw error
        }
       
    }

    // Retrieve data based on input
    public async get_related_memos(inputText: string, n_results = 10, botRelate=false):Promise<DataMemo[]> {
        try {
            const memo_path = botRelate ? this.path_to_bot_db_object : this.path_to_user_db_object
            // load memory
            if (fs.existsSync(memo_path)) {
                console.log(chalk.green(`\nLOADING MEMORY FROM ${botRelate? "BOT": "USER"} DISK`));
                this.uidTextDict = await this.loadData(memo_path) || {};
            }

            const uidTextDictLength = Object.keys(this.uidTextDict).length;
            if (n_results > uidTextDictLength) {
                n_results = uidTextDictLength;
            }
            // // Load the docs into the vector store
            const collection = await chromaClient.getOrCreateCollection({name: "memos"})

            // Search for the most similar document    
            const results = await collection.query({
                queryTexts: [inputText],
                nResults: n_results,
            })


            const memos = []
            const numResult = results.ids[0].length
            console.log("results", results)
            for(let i = 0; i < numResult; i++) {
                const uid = results.ids[0][i]
                const input_text = results.documents[0][i] || ""
                const distance = results.distances && results.distances.length > 0 ? results.distances[0][i] : 6;


                if(distance < this.recall_threshold && this.uidTextDict[uid]?.length > 0) {
                    const input_text2 = this.uidTextDict[uid][0]
                    const output_text = this.uidTextDict[uid][1]
                    const createdAt = this.uidTextDict[uid][2]
                    assert(input_text == input_text2) 
    
                    memos.push({ id: uid,input_text, output_text, distance, createdAt })
                }

            }
            // const collections = await chromaClient.getCollection({
            //     name: "memos"
            // });
            // console.log("collections", collections)
            // console.log("memos", memos)
            return memos

        } catch (error) {
            throw error
        }
    }

    public async resetDb(id?:string) {
        try {
            await chromaClient.deleteCollection({name: "memos"});
            await chromaClient.createCollection({name: "memos"});
            this.uidTextDict = {}
            if(id) {
                this.saveData(true, id) //save empty data for bot memo
                this.saveData(false, id)//save empty data for user memo
            }
            else {
                deleteFolderRecursive(this.memo_path)
            }

        } catch (error) {
            console.log(error)
            throw new NotImplementedException('>>MemoStore>>resetDb' + error)
        }
    }

    // Save data to JSON file
    public saveData(botRelate:boolean, id?:string): void {
        let path = botRelate ? this.path_to_bot_db_object : this.path_to_user_db_object
        if(id) {
            const pathParts = path.split('/');
            const fileName = pathParts.pop();
            path = `${pathParts.join('/')}/${id}/${fileName}`;
        }
        
        this.debug && console.log("Long-term Memo:", this.uidTextDict)
        fs.writeFileSync(path, JSON.stringify(this.uidTextDict, null, 2), 'utf-8');
        console.log('Data saved successfully.');
    }
}