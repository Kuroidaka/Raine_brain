import { GroqService } from "./groq/groq"
import { analyzeOutputInter } from "./groq/groq.interface"


export const TeachableService = {
  preprocess: async (prompt: string) => {
    try {
        let expandedText = prompt
        expandedText = await TeachableService.considerMemoRetrieval(prompt)

        await TeachableService.considerMemoStorage(prompt)

        return expandedText
    } catch (error) {
        console.error(">>TeachableService>>preprocess");
      throw error;
    }
  },
  considerMemoRetrieval: async(prompt:string):Promise<string> => {
    try {
      // retrieve relate memo
      const memoList = []
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

          memoList.push()
        }
      }

      return prompt + "\n# Memories that might help\n This person name is Canh"
    } catch (error) {
        console.error(">>TeachableService>>considerMemoRetrieval");
        throw error;
    }
  },
  considerMemoStorage: async(prompt:string) => {
    try {
      let memoAdded = false

      const analyze:analyzeOutputInter = await GroqService.analyzer(
        prompt, 
        "Does any part of the TEXT ask the agent to perform a task or solve a problem? Answer with just one word, yes or no."
      )

      if (analyze.content?.toLowerCase().includes("yes")) {
        const advice:analyzeOutputInter = await GroqService.analyzer(
          prompt, 
          "Briefly copy any advice from the TEXT that may be useful for a similar but different task in the future. But if no advice is present, just respond with 'none'."
        )

        if(!advice.content?.toLowerCase().includes("none")) {
          const { content:task }:analyzeOutputInter = await GroqService.analyzer(
            prompt, 
            "Briefly copy just the task from the TEXT, then stop. Don't solve it, and don't include any advice."
          )
          if(task) {
            const general_task:analyzeOutputInter = await GroqService.analyzer(
              task,
              "Summarize very briefly, in general terms, the type of task described in the TEXT. Leave out details that might not appear in a similar problem.",
            )
            // Add the task-advice (problem-solution) pair to the vector DB.

            
            memoAdded = true
          }
          
          
        }

      }

    } catch (error) {
        console.error(">>TeachableService>>considerMemoStorage");
        throw error;
    }
  },
  retrieveRelevantMemos: async(prompt:string) => {
    try {
        
    } catch (error) {
        console.error(">>TeachableService>>retrieveRelevantMemos");
        throw error;
    }
  },
}
