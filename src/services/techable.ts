import path from "path";
import { GroqService } from "./llm/groq"
import { analyzeOutputInter, DataMemo } from "./llm/llm.interface"
import { MemoStore } from "./LTMemo";
import chalk from "chalk";
import { io } from "~/index";


export class TeachableService {

  private max_num_retrievals: number;
  public  memo_store: MemoStore;
  private debug: number;
  constructor(
    debug:number,
    path_to_db_dir=path.join('src', 'assets', 'tmp', 'memos'),
    reset_db=false,
    recall_threshold=1.5,
    max_num_retrievals=10,
  ) {
    this.max_num_retrievals = max_num_retrievals
    this.debug = debug
    this.memo_store = new MemoStore(this.debug, reset_db, path_to_db_dir, recall_threshold)
  } 
 
  // public async preprocess(prompt: string) {
  //   try {
  //       let expandedText = prompt
  //       expandedText = await this.considerMemoRetrieval(prompt)

  //       await this.considerMemoStorage(prompt)
        
  //       return expandedText
  //   } catch (error) {
  //       console.error(">>TeachableService>>preprocess");
  //     throw error;
  //   }
  // }

  public async considerMemoStorage(prompt:string, relateMemo: DataMemo[], additionalPrompt?:string) {
    try {
      
      let customPrompt = prompt
      let explainAddRule = ""
      if(additionalPrompt) {
        customPrompt+= `\n\n #ADDITIONAL INFORMATION: ${additionalPrompt}`
        explainAddRule = "Just use the information that relate to the TEXT that exist in ADDITIONAL INFORMATION."
      }

      let memoAdded = false
      let botRelate = (await GroqService.analyzer(prompt, "Consider whether this task is related to you or not. Answer with just one word, yes or no.", this.debug) as analyzeOutputInter).content?.toLowerCase().includes("yes") || false

      // Check for a problem-solution pair.
      let analyze:analyzeOutputInter = await GroqService.analyzer(
        prompt, 
        "Does any part of the TEXT ask the agent to perform a task or solve a problem or try to remember something? Answer with just one word, yes or no.",
        this.debug
      )
      if (analyze.content?.toLowerCase().includes("yes")) {
        console.log("yes1")
        const advice:analyzeOutputInter = await GroqService.analyzer(
          prompt, 
          `Briefly copy any advice from the TEXT that may be useful for a similar but different task in the future. ${explainAddRule} But if no advice is present, just respond with 'none'.`,
          this.debug
        )
        if (advice.content && !advice.content.toLowerCase().includes("none")) {
          console.log("yes1.1")
          const { content : task }:analyzeOutputInter = await GroqService.analyzer(
            prompt, 
            `Briefly copy just the task from the TEXT, then stop. Don't solve it, and don't include any advice, ${explainAddRule}`, this.debug
          );
    
          if (task) {
            const { content: generalTask }: analyzeOutputInter = await GroqService.analyzer(
                task,
                `Summarize very briefly, in general terms, the type of task described in the TEXT. Leave out details that might not appear in a similar problem. The person mentioned in your response refers to ${!botRelate ? "the user" : "you"}.`,
                this.debug
            );
    
            if (generalTask) {
              this.debug && console.log("general task", generalTask)
              await this.memo_store.rememberMemo(generalTask, advice.content, relateMemo);
              memoAdded = true;
              if(this.debug === 0) console.log(chalk.green("Long_term saved"), advice.content)
            }
          }
        }
      }
    
      // Check for information to be learned.
      analyze = await GroqService.analyzer(
        prompt, 
        `Does the TEXT contain information that could be committed to memory? ${explainAddRule} Answer with just one word, yes or no.`,
        this.debug
      )
      if (analyze.content?.toLowerCase().includes("yes")) {
        console.log("yes2")
        const [question, answer] = await Promise.all([
          GroqService.analyzer(prompt, `Imagine that the user forgot this information in the TEXT. How would they ask you for this information? ${explainAddRule}. Use the third person to refer to the person in your response, as it refers to ${!botRelate ? "the user (don't mention gender)" : "you"}. Include no other text in your response.`, this.debug),
          GroqService.analyzer(prompt, `Copy the information from the TEXT that should be committed to memory. ${explainAddRule}. Add no explanation. The person mentioned in your response refers to ${!botRelate ? "the user (don't mention gender)" : "you"}.`, this.debug)
        ]);
        
        if(question.content && answer.content){
          await this.memo_store.rememberMemo(question.content, answer.content, relateMemo);
          memoAdded = true

          if(this.debug === 0) console.log(chalk.green("Long_term saved"), answer.content)
        }
      }
      if(this.debug === 0) {
        console.log(chalk.green("memoAdded"), memoAdded)
      } 
      
      memoAdded && this.memo_store.saveData(botRelate)

    } catch (error) {
        console.error(">>TeachableService>>considerMemoStorage");
        throw error;
    }
  }

  public async considerMemoRepair(prompt:string) {
    try {
   
    } catch (error) {
        console.error(">>TeachableService>>considerMemoStorage");
        throw error;
    }
  }

  public async considerMemoRetrieval(prompt:string):Promise<{ relateMemory:string[], memoryDetail: DataMemo[] }> {
    try {

      io.emit("chatResMemo", { active: true });
      //  analyze task and relevance relationship
      const [analyzeResult, isRelateResult] = await Promise.all([
        GroqService.analyzer(prompt, "Does any part of the TEXT ask you to perform a task or solve a problem or try to remember something? Answer with just one word, yes or no.", this.debug),
        GroqService.analyzer(prompt, "Consider whether this task is related to you or not. Answer with just one word, yes or no.", this.debug)
      ]);
      let analyze = (analyzeResult as analyzeOutputInter).content;
      const botRelate = (isRelateResult as analyzeOutputInter).content?.toLowerCase().includes("yes") || false;
      
      // retrieve relate memo
      let memoList = await this.retrieveRelevantMemos(prompt, botRelate)

      if (analyze?.toLowerCase().includes("yes")) {
        const { content: task }:analyzeOutputInter = await GroqService.analyzer(prompt, "Copy just the task from the TEXT, consider this task, then stop. Don't solve it, and don't include any more advice.", this.debug);
  
        if (task) {
          const { content: general_task }: analyzeOutputInter = await GroqService.analyzer(
            task,
            "Summarize very briefly, in general terms, the type of task described in the TEXT. Leave out details that might not appear in a similar problem.",
            this.debug
          );
          general_task && memoList.push(...await this.retrieveRelevantMemos(general_task, botRelate))
        }
      }
      memoList = this.removeDuplicates(memoList);
      memoList = this.sortByCreatedAt(memoList);
      let memoOutputList: string[] = memoList.map(memo => `${memo.createdAt}: ${memo.output_text}`);
      
      this.debug === 0 && console.log("Related memory list", memoOutputList)

      io.emit("chatResMemo", { memoryDetail: memoList });
      return { 
        relateMemory: memoOutputList,
        memoryDetail: memoList
      }
    } catch (error) {
        console.error(">>TeachableService>>considerMemoRetrieval");
        throw error;
    }
  }

  private sortByCreatedAt (arr: DataMemo[]): DataMemo[] {
    return arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };
  

  private removeDuplicates(list: DataMemo[]): DataMemo[] {
    const uniqueIds = new Set<string>();
    return list.filter(memo => {
        if (uniqueIds.has(memo.id)) {
            return false;
        } else {
            uniqueIds.add(memo.id);
            return true;
        }
    });
}


  private async retrieveRelevantMemos(prompt:string, botRelate:boolean):Promise<DataMemo[]> {
    try {
      let memoList = await this.memo_store.get_related_memos(prompt, this.max_num_retrievals, botRelate)
      
      return memoList;
    } catch (error) {
        console.error(">>TeachableService>>retrieveRelevantMemos");
        throw error;
    }
  }

  public concatenateMemoTexts(memoList:string[]): string {
    /** Concatenates the memo texts into a single string for inclusion in the chat context. */
    let memoTexts = "";
    if (memoList.length > 0) {
        let info = "\n# Memories that might help\n";
        for (const memo of memoList) {
            info += `- ${memo}\n`;
        }
        memoTexts += `\n${info}`;
    }
    return memoTexts;
  }

}
