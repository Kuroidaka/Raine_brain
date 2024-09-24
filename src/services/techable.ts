import path from "path";
import { GroqService } from "./llm/groq";
import {
  analyzeLTMemoCriteriaInter,
  analyzeOutputInter,
  CriteriaMemo,
  DataMemo,
} from "./llm/llm.interface";
import { MemoStore } from "./LTMemo";
import chalk from "chalk";
import { io } from "~/index";
import { OpenaiService } from "./llm/openai";

export class TeachableService {
  private max_num_retrievals: number;
  public memo_store: MemoStore;
  private debug: number;
  private analyzer: OpenaiService;
  private decontextualizePrompt: string = "";

  constructor(
    debug: number,
    path_to_db_dir = path.join("src", "assets", "tmp", "memos"),
    reset_db = false,
    recall_threshold = 1.7,
    max_num_retrievals = 10
  ) {
    this.max_num_retrievals = max_num_retrievals;
    this.debug = debug;
    this.memo_store = new MemoStore(
      this.debug,
      reset_db,
      path_to_db_dir,
      recall_threshold
    );
    this.analyzer = new OpenaiService({});
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

  public async considerMemoStorage(
    prompt: string,
    relateMemo: DataMemo[],
  ): Promise<DataMemo[]> {
    try {
      prompt = this.decontextualizePrompt !== "" ? this.decontextualizePrompt : prompt

      let memoAdded = false;
      let memoStorage: DataMemo[] = [];

      // Check for a problem-solution pair.
      // let analyze:analyzeOutputInter = await GroqService.analyzer(
      //   prompt,
      //   "Does any part of the TEXT ask the agent to perform a task or solve a problem or try to remember something? Answer with just one word, yes or no.",
      //   this.debug
      // )
      // if (analyze.content?.toLowerCase().includes("yes")) {
      //   console.log("yes1")
      //   const advice:analyzeOutputInter = await GroqService.analyzer(
      //     prompt,
      //     `Briefly copy any advice from the TEXT that may be useful for a similar but different task in the future. But if no advice is present, just respond with 'none'.`,
      //     this.debug
      //   )
      //   if (advice.content && !advice.content.toLowerCase().includes("none")) {
      //     console.log("yes1.1")
      //     const { content : task }:analyzeOutputInter = await GroqService.analyzer(
      //       prompt,
      //       `Briefly copy just the task from the TEXT, then stop. Don't solve it, and don't include any advice,`, this.debug
      //     );

      //     if (task) {
      //       const { content: generalTask }: analyzeOutputInter = await GroqService.analyzer(
      //           task,
      //           `Summarize very briefly, in general terms, the type of task described in the TEXT. Leave out details that might not appear in a similar problem. The person mentioned in your response refers to the user.`,
      //           this.debug
      //       );

      //       if (generalTask) {
      //         this.debug && console.log("general task", generalTask)
      //         await this.memo_store.rememberMemo(generalTask, advice.content, relateMemo);
      //         memoAdded = true;
      //         io.emit("chatResMemoStorage", { content: advice.content });
      //         memoStorage.push({
      //           content: advice.content,
      //           type: "problem-solution"
      //         })
      //         if(this.debug === 0) console.log(chalk.green("Long_term saved"), advice.content)
      //       }
      //     }
      //   }
      // }

      // Check for information to be learned use promise all

      let shouldSolveProblem = false
      let shouldMemoStorage = false
      let usefulForFuture = false

      const [analyzeSolveProblem, analyzeMemoStorage, analyzeUsefulForFuture] = await Promise.all([
        this.analyzer.analyze(
          prompt,
          "Does any part of the TEXT ask to perform a task or solve a problem? Answer with just one word, yes or no.",
          this.debug
        ),
        this.analyzer.analyze(
          prompt,
          "Does the TEXT contain information that could be committed to memory? Answer with just one word, yes or no.",
          this.debug  
        ),
        this.analyzer.analyze(
          prompt,
          "Does the TEXT contain information that could be useful for a similar but different task in the future? Answer with just one word, yes or no.",
          this.debug
        )
      ])
      if(analyzeMemoStorage.content?.toLowerCase().includes("yes")) shouldMemoStorage = true
      if(analyzeSolveProblem.content?.toLowerCase().includes("yes")) shouldSolveProblem = true
      if(analyzeUsefulForFuture.content?.toLowerCase().includes("yes")) usefulForFuture = true
      

      if ((shouldMemoStorage) || (shouldSolveProblem && usefulForFuture)) {
        const result = await this.rememberMemoV2(prompt, relateMemo);
        if (result && result.length > 0) {
          memoAdded = true;
          memoStorage = [...result];
        }
      }
      if (this.debug === 0) {
        console.log(chalk.green("memoStorage"), memoStorage);
        console.log(chalk.green("memoAdded"), memoAdded);
      }

      // if(memoAdded) {
      //   this.memo_store.saveData()
      // }

      return memoStorage;
    } catch (error) {
      console.error(">>TeachableService>>considerMemoStorage");
      throw error;
    }
  }

  // private async rememberMemoV1(prompt:string, relateMemo: DataMemo[]): Promise<DataMemo[]> {
  //   try {
  //     let memoStorage = []
  //     let isActiveCheckRelatedMemo = false
  //     if (relateMemo.length > 0) {
  //       isActiveCheckRelatedMemo = true
  //     }
      // const isRelateWithOldMemo = isActiveCheckRelatedMemo ? await this.analyzer.analyze(
      //   `${prompt}\nOld Memos: ${JSON.stringify(relateMemo)}`,
      //   `Does the TEXT contain information that is related to any of the following memos? Answer with just one word, yes or no.`,
  //       this.debug
  //     ) : { content: "no" }
  //     if(isRelateWithOldMemo.content?.toLowerCase().includes("yes")) {
  //       // using promise all
  //       const newMemoPromises = relateMemo.map(async memo => {
  //         const newMemo = await this.analyzer.modifyMemo(
  //           prompt,
  //           memo.input_text
  //         )
  //         await this.memo_store.saveVecDB(newMemo, memo.id);

  //         return {
  //           id: memo.id,
  //           input_text: newMemo
  //         }
  //       })
  //       const newMemo = await Promise.all(newMemoPromises)
  //       console.log("newMemo", newMemo)
  //     } else {
  //       const question = await this.analyzer.analyze(prompt, `Imagine that the user forgot this information in the TEXT. How would they ask you for this information? Add no explanation.`, this.debug)

  //       if(question.content){
  //         await this.memo_store.saveVecDB(question.content);
  //         io.emit("chatResMemoStorage", { content: question.content });
  //         memoStorage.push({
  //           content: question.content,
  //           type: "information-to-be-learned"
  //         })

  //         if(this.debug === 0) console.log(chalk.green("Long_term saved"), question.content)
  //       }
  //     }

  //     return memoStorage

  //   } catch (error) {
  //     console.error(">>TeachableService>>rememberMemo");
  //     throw error;
  //   }
  // }

  public async rememberMemoV2(
    prompt: string,
    relateMemo: DataMemo[]
  ): Promise<DataMemo[] | null> {
    try {
      const openaiService = new OpenaiService({});
      const result = await openaiService.analyzeLTMemoCriteria(prompt);
  
      if (result.criteria["ai-actionable"]) {
        return null;
      }

      if(result.answer.toLowerCase().includes("none")) {
        return null
      }
      io.emit("chatResMemoStorage", { active: true })

      const memoFinal: DataMemo[] = [];
      let isMemoUpdated = false;
  
      if (relateMemo.length > 0) { // update memo
        await Promise.all(
          relateMemo.map(async (memo) => {
            const isSameCriteria = !Object.keys(memo.criteria).some((criteria) =>
              this.isCriteriaDifferent(memo, result, criteria)
            );
            if (isSameCriteria) {
              const isRelateWithOldMemo = await this.analyzer.isRelateMemo(prompt, memo.guide);
              if (isRelateWithOldMemo) {
                isMemoUpdated = true;
                const updatedMemo = await this.memo_store.saveVecDB({
                  guideText: result.guide,
                  answerText: result.answer,
                  criteria: result.criteria,
                  id: memo.id,
                });
                memoFinal.push(updatedMemo);
              }
            }
          })
        );
  
        if (!isMemoUpdated) {
          const newMemo = await this.memo_store.saveVecDB({
            guideText: result.guide,
            answerText: result.answer,
            criteria: result.criteria,
          });
          memoFinal.push(newMemo);
        }
      } else { // create new memo
        const newMemo = await this.memo_store.saveVecDB({
          guideText: result.guide,
          answerText: result.answer,
          criteria: result.criteria,
        });
        memoFinal.push(newMemo);
      }
  
      io.emit("chatResMemoStorage", { active: true, memoryDetail: memoFinal });
      return memoFinal;
    } catch (error) {
      console.error(">>TeachableService>>rememberMemoV2", error);
      throw error;
    }
  }
  
  private isCriteriaDifferent(memo: DataMemo, result: analyzeLTMemoCriteriaInter, criteria: string) {
    return memo.criteria[criteria as keyof CriteriaMemo] !== result.criteria[criteria as keyof CriteriaMemo]
  }

  public async considerMemoRepair(prompt: string) {
    try {
    } catch (error) {
      console.error(">>TeachableService>>considerMemoStorage");
      throw error;
    }
  }

  public async considerMemoRetrieval(
    prompt: string,
    summaryChat?: string
  ): Promise<{ relateMemory: string[]; memoryDetail: DataMemo[] }> {
    try {
      io.emit("chatResMemo", { active: true });

      if(summaryChat) {
        prompt = await this.analyzer.decontextualize(prompt, summaryChat)
        this.decontextualizePrompt = prompt
      }
      //  analyze task and relevance relationship
      const analyzeResult = await GroqService.analyzer(
        prompt,
        "Does any part of the TEXT ask you to perform a task or solve a problem or try to remember something? Answer with just one word, yes or no.",
        this.debug
      );
      let analyze = (analyzeResult as analyzeOutputInter).content;

      // retrieve relate memo
      let memoList = await this.retrieveRelevantMemos(prompt);

      if (analyze?.toLowerCase().includes("yes")) {
        const { content: task }: analyzeOutputInter =
          await GroqService.analyzer(
            prompt,
            "Copy just the task from the TEXT, consider this task, then stop. Don't solve it, and don't include any more advice.",
            this.debug
          );

        if (task) {
          const { content: general_task }: analyzeOutputInter =
            await GroqService.analyzer(
              task,
              "Summarize very briefly, in general terms, the type of task described in the TEXT. Leave out details that might not appear in a similar problem.",
              this.debug
            );
          general_task &&
            memoList.push(...(await this.retrieveRelevantMemos(general_task)));
        }
      }
      memoList = this.removeDuplicates(memoList);
      memoList = this.sortByDistance(memoList);
      let memoOutputList: string[] = memoList.map(
        (memo) => `${memo.createdAt}: Q: ${memo.guide} A: ${memo.answer}`
      );

      this.debug === 0 && console.log("Related memory list", memoOutputList);

      io.emit("chatResMemo", { active: true, memoryDetail: memoList });
      return {
        relateMemory: memoOutputList,
        memoryDetail: memoList,
      };
    } catch (error) {
      console.error(">>TeachableService>>considerMemoRetrieval");
      throw error;
    }
  }

  private sortByCreatedAt(arr: DataMemo[]): DataMemo[] {
    return arr.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  private sortByDistance(arr: DataMemo[]): DataMemo[] {
    if (arr.length === 0) return arr;

    return arr.sort((a, b) => (a?.distance ?? 0) - (b?.distance ?? 0));
  }

  private removeDuplicates(list: DataMemo[]): DataMemo[] {
    const uniqueIds = new Set<string>();
    return list.filter((memo) => {
      if (uniqueIds.has(memo.id)) {
        return false;
      } else {
        uniqueIds.add(memo.id);
        return true;
      }
    });
  }

  private async retrieveRelevantMemos(prompt: string): Promise<DataMemo[]> {
    try {
      let memoList = await this.memo_store.get_related_memos(
        prompt,
        this.max_num_retrievals
      );

      return memoList;
    } catch (error) {
      console.error(">>TeachableService>>retrieveRelevantMemos");
      throw error;
    }
  }

  public concatenateMemoTexts(memoList: string[]): string {
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
