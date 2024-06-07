import { groqClient } from '~/config/groq';
import { NextFunction, Request, Response } from 'express';
import { traceable } from 'langsmith/traceable';


export class TestController {
  static async handleTest(req: Request, res: Response, next:NextFunction) {
    try {
      const user_input = req.body.user_input;

      const pipeline = traceable(async (user_input) => {
        const result = await groqClient.chat.completions.create({
          messages: [{ role: "user", content: user_input }],
          model: "llama3-8b-8192",
        });
        return result.choices[0].message.content;
      });

      const output = await pipeline(user_input);

      return res.status(200).json({ data: output });
    } catch (error) {
      console.log(error);
      // Rethrow the error to be caught by the errorHandler middleware
      next(error);
    }
  }
}
