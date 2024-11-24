import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import puppeteer from "puppeteer";
import { summaryLongText } from "../../common/summary";

const scrapeWebsiteSchema = z.object({
  url: z.string(),
  objective: z.string(),
});

class ScrapeWebsiteTool extends DynamicStructuredTool {
  constructor() {
    super({
      name: "scrape_website",
      description: `Useful when you need to scrape text from a website URL. The input for this tool contains 2 arguments (url, objective) 
      - The "objective" is the targeted questions you want to know 
      - DO NOT make up any "url"; the "url" should only be the link to the website from the search tool results.`,
      func: async ({ url, objective }) => {
        console.log("url:", url);
        console.log("objective:", objective);
        return this.scrapeLink({ url, objective });
      },
      schema: scrapeWebsiteSchema,
    });
  }

  public async scrapeLink({ url, objective }: { url: string; objective: string }): Promise<string> {
    const headlessBrowser = await puppeteer.launch({
      headless: "new",
      executablePath: "/opt/homebrew/bin/chromium",
      args: ["--no-sandbox"],
    });

    try {
      const newTab = await headlessBrowser.newPage();

      await newTab.goto(url);
      console.log("scraping url: ", url);
      await newTab.waitForSelector("body");

      let text = await newTab.evaluate(() => document.body.innerText);

      if (text !== undefined) {
        if (text.length > 8000) {
          text = await summaryLongText(text, objective);
        }
      } else {
        text = "No content found";
      }

      return text;
    } catch (error) {
      console.log(error);

      return `Error: ${error}`;
    } finally {
      headlessBrowser.close();
    }
  }
}

export default ScrapeWebsiteTool;
