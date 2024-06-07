import 'reflect-metadata';
import express, { NextFunction, Request, Response } from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import chalk from 'chalk'

import { errorHandler, routeNotFoundHandler, validateDto } from '~/api/middlewares'
import apiRoutes from '~/api/routes';


const app = express()
const PORT = 3000
const API_PREFIX = '/api/v2' // Adjust as necessary

export const start = async (): Promise<void> => {
    // Middlewares
    app.use(express.json())
    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({ extended: true }))
    app.use(cors())
    app.use(cookieParser())
    app.use(morgan('dev'))

    // Initialize Discord bot (if applicable)
    // const runList = []
    // runList.push(initDCBot(dependencies))

    // Run tools (if applicable)
    // runList.push(tools(dependencies))

    // Routes
    // app.use(API_PREFIX, routes(dependencies))
    app.use(API_PREFIX, apiRoutes);
    // app.get('/test', validateDto(TestDto), async (req: Request, res: Response, next: NextFunction) => {
    //     // Throw an error directly
    //     try {
    //         const user_input = req.body.user_input
    
    //         const pipeline = traceable(async (user_input) => {
    //             const result = await groqClient.chat.completions.create({
    //                 messages: [{ role: "user", content: user_input }],
    //                 model: "gpt-3.5-turbo",
    //             });
    //             return result.choices[0].message.content;
    //             });
                
    //         await pipeline(user_input);
    
    //         return res.status(200).json({data: "123"})
    //     } catch (error) {
    //         console.log(error)
    //         next(error)
    //     }
    // })

    app.use(errorHandler)
    app.use(routeNotFoundHandler)

    app.listen(PORT, () => {
        console.log('Server:', chalk.blue(PORT), chalk.green('connected'))
    })
}

start()
