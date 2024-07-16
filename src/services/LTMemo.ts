import * as fs from 'fs';
import * as path from 'path';
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from '@langchain/openai';
import { JSONLoader } from "langchain/document_loaders/fs/json";
import { ChromaClient } from 'chromadb';
import { assert, deleteFilesInDirectory, deleteFolderRecursive } from '~/utils';
import { NotImplementedException } from '~/common/error';
import chalk from 'chalk';

type Memo = [string, string];

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
            // this.saveData(botRelate);

        } catch (error) {
            console.log(error)
            throw error
        }
       
    }

    // Retrieve data based on input
    public async get_related_memos(inputText: string, n_results = 10, botRelate=false):Promise<{ input_text:string, output_text:string }[]> {
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

                if(distance < this.recall_threshold && this.uidTextDict[uid]?.length > 0) {
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