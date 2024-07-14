import path from "path";
import { GroqService } from "./groq/groq"
import { analyzeOutputInter } from "./groq/groq.interface"
import { MemoStore } from "./LTMemo";


export class TeachableService {

  private reset_db: boolean;
  private recall_threshold: number;
  private max_num_retrievals: number;
  private memo_store: MemoStore;
  private path_to_db_dir=path.join('src', 'assets', 'tmp', 'memos');
  private debug: boolean;
  constructor(
    reset_db=false,
    recall_threshold=.5,
    max_num_retrievals=10,
    debug=true
  ) {
    this.reset_db = reset_db
    this.recall_threshold = recall_threshold
    this.max_num_retrievals = max_num_retrievals
    this.memo_store = new MemoStore(this.reset_db, this.path_to_db_dir, this.recall_threshold)
    this.debug=debug
  } 
 
  public async preprocess(prompt: string) {
    try {
        let expandedText = prompt
        expandedText = await this.considerMemoRetrieval(prompt)

        await this.considerMemoStorage(prompt)

        return expandedText
    } catch (error) {
        console.error(">>TeachableService>>preprocess");
      throw error;
    }
  }

  public async considerMemoStorage(prompt:string) {
    try {
      let memoAdded = false
      // Check for a problem-solution pair.
      let analyze:analyzeOutputInter = await GroqService.analyzer(
        prompt, 
        "Does any part of the TEXT ask the agent to perform a task or solve a problem or try to remember something? Answer with just one word, yes or no."
      )
      if (analyze.content?.toLowerCase().includes("yes")) {
        const advice:analyzeOutputInter = await GroqService.analyzer(
          prompt, 
          "Briefly copy any advice from the TEXT that may be useful for a similar but different task in the future. But if no advice is present, just respond with 'none'."
        )
        if (advice.content && !advice.content.toLowerCase().includes("none")) {
          const { content: task }: analyzeOutputInter = await GroqService.analyzer(
              prompt,
              "Briefly copy just the task from the TEXT, then stop. Don't solve it, and don't include any advice."
          );
          if (task) {
            const { content: generalTask }: analyzeOutputInter = await GroqService.analyzer(
                task,
                "Summarize very briefly, in general terms, the type of task described in the TEXT. Leave out details that might not appear in a similar problem."
            );
    
            if (generalTask) {
              this.debug && console.log("general task", generalTask)
              await this.memo_store.addInputOutputPair(generalTask, advice.content);
              memoAdded = true;
            }
          }
        }
      }
    
      // Check for information to be learned.
      analyze = await GroqService.analyzer(
        prompt, 
        "Does the TEXT contain information that could be committed to memory? Answer with just one word, yes or no."
      )
      if (analyze.content?.toLowerCase().includes("yes")) {
        const question = await GroqService.analyzer(
          prompt, 
          "Imagine that the user forgot this information in the TEXT. How would they ask you for this information? Include no other text in your response."
        )
        const answer = await GroqService.analyzer(
          prompt, 
          "Copy the information from the TEXT that should be committed to memory. Add no explanation."
        )
        if(question.content && answer.content){
          await this.memo_store.addInputOutputPair(question.content, answer.content);
          memoAdded = true
        }
      }
      console.log("memoAdded", memoAdded)
      if(memoAdded) this.memo_store.saveData()

    } catch (error) {
        console.error(">>TeachableService>>considerMemoStorage");
        throw error;
    }
  }

  public async considerMemoRetrieval(prompt:string):Promise<string> {
    try {
      // retrieve relate memo
      let memoList = await this.retrieveRelevantMemos(prompt)
      //  Next, if the prompt involves a task, then extract and generalize the task before using it as the lookup key.

      const analyze:analyzeOutputInter = await GroqService.analyzer(
        prompt, 
        "Does any part of the TEXT ask you to perform a task or solve a problem or try to remember something? Answer with just one word, yes or no."
      )

      if (analyze.content?.toLowerCase().includes("yes")) {
        const { content: task }: analyzeOutputInter = await GroqService.analyzer(
          prompt,
          "Copy just the task from the TEXT, then stop. Don't solve it, and don't include any advice."
        );
      
        if (task) {
          const { content: general_task }: analyzeOutputInter = await GroqService.analyzer(
            task,
            "Summarize very briefly, in general terms, the type of task described in the TEXT. Leave out details that might not appear in a similar problem."
          );
          general_task && memoList.push(...await this.retrieveRelevantMemos(general_task))

        }
      }

      memoList = [...new Set(memoList)];

      console.log("memoList", memoList)
      return prompt + this.concatenateMemoTexts(memoList)
    } catch (error) {
        console.error(">>TeachableService>>considerMemoRetrieval");
        throw error;
    }
  }

  private async retrieveRelevantMemos(prompt:string):Promise<string[]> {
    try {
      let memoList = await this.memo_store.get_related_memos(prompt, this.max_num_retrievals)
      
      const memoOutputList: string[] = memoList.map(memo => memo.output_text);
      return memoOutputList;
    } catch (error) {
        console.error(">>TeachableService>>retrieveRelevantMemos");
        throw error;
    }
  }

  private concatenateMemoTexts(memoList:string[]): string {
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
