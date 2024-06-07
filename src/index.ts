import express, { Request, Response } from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import chalk from 'chalk'
import { ForbiddenException } from './common/error'
import { errorHandler, routeNotFoundHandler } from './middleware'

const app = express()
const PORT = 3000
const API_PREFIX = '/api/v1' // Adjust as necessary

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
    
    app.get('/sync-error', (req: Request, res: Response) => {
        // Throw an error directly
        if (1 === 1) throw new ForbiddenException('bad reqdawuest')
        
        return res.status(200).json({data: "123"})
    })

    app.use(errorHandler)
    app.use(routeNotFoundHandler)

    app.listen(PORT, () => {
        console.log('Server:', chalk.blue(PORT), chalk.green('connected'))
    })
}

start()
