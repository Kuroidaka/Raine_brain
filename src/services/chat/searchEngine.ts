import { DynamicStructuredTool } from "@langchain/core/tools";
import axios from "axios";
import { z } from "zod";

const googleSearchSchema = z.object({
  q: z.string()
});

class GoogleSearchTool extends DynamicStructuredTool {
  constructor() {
    super({
      name: "search",
      description: `useful when you need to search the internet to answer the questions about current events, data
      The input for this tool contain 1 argument "q"
      "q" is the question that user want to know about the current events, data, news, ...`,
      func: async ({ q }) => {
        console.log("q:", q);
        return this.searchEngine({ q });
      },
      schema: googleSearchSchema,
    });
  }

  public async searchEngine({ q }: { q: string }) {
    try {
      const myHeaders = {
        "X-API-KEY": process.env.SERPER_API_KEY,
        "Content-Type": "application/json",
      };

      const raw = JSON.stringify({
        q: q,
        gl: "vn",
      });

      const requestOptions = {
        method: "post",
        url: "https://google.serper.dev/search",
        headers: myHeaders,
        data: raw,
        followRedirect: true,
      };

      const res = await axios(requestOptions);

      if ((res.statusText = "OK")) {
        const data = {
          answerBox: res.data?.answerBox || "",
          organic: res.data?.organic || "",
          knowledgeGraph: res.data?.knowledgeGraph || "",
        };

        return data;
      }
    } catch (error) {
      console.log(error);
      return error;
    }
  }
}

export default GoogleSearchTool;
