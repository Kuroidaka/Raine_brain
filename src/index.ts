import 'reflect-metadata';
import express, { NextFunction, Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import chalk from 'chalk';
import https from 'https';
import http from 'http';
import fs from 'fs';
import { Server } from 'socket.io';
import * as dotenv from "dotenv";

dotenv.config();

import { errorHandler, routeNotFoundHandler, validateDto } from '~/api/middlewares';
import apiRoutes from '~/api/routes';

const app = express();
const PORT = process.env.SERVER_PORT || 8001;
const API_PREFIX = '/api/v2'; // Adjust as necessary

// Load SSL certificates
const options = {
    key: fs.readFileSync('localhost+1-key.pem'),
    cert: fs.readFileSync('localhost+1.pem')
};

const server = http.createServer(app);
export const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'https://localhost:5173',
        methods: ['GET', 'POST']
    }
});

export const start = async (): Promise<void> => {
    io.on('connection', (socket) => {
        console.log('a user connected');
        socket.on('disconnect', () => {
            console.log('user disconnected');
        });
    });

    // Middlewares
    app.use(express.json());
    app.use(bodyParser.json({
        limit: '50mb',
        type: 'application/json'
    }));
    app.use(bodyParser.urlencoded({
        parameterLimit: 100000,
        limit: '50mb',
        extended: true
    }));
    app.use(cors());
    app.use(cookieParser());
    app.use(morgan('dev'));

    // Routes
    app.use(API_PREFIX, apiRoutes);

    app.use(errorHandler);
    app.use(routeNotFoundHandler);

    server.listen(PORT, () => {
        console.log('Server:', chalk.blue(PORT), chalk.green('connected'));
    });
}

start();
