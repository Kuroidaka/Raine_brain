import "reflect-metadata";
import express, { NextFunction, Request, Response } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import chalk from "chalk";
import https from "https";
import http from "http";
import fs from "fs";
import { Server } from "socket.io";
import * as dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import winston from "winston";

dotenv.config();

import {
  errorHandler,
  routeNotFoundHandler,
  validateDto,
} from "~/api/middlewares";
import apiRoutes from "~/api/routes";
import jwt, { JwtPayload } from "jsonwebtoken";
import { connectRedis, redisClient } from "./config/redis";
import { setUserIDWithSocket, removeUserBySocketId } from "./utils";

const app = express();
const PORT = process.env.SERVER_PORT || 8001;
const API_PREFIX = "/api/v2"; // Adjust as necessary

// Load SSL certificates
// const options = {
//     key: fs.readFileSync('localhost+1-key.pem'),
//     cert: fs.readFileSync('localhost+1.pem')
// };

const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "https://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

// Tạo stream.write cho morgan để ghi log vào Winston
logger.stream = {
  write: function (message: string) {
    logger.info(message.trim());
  },
};

export const start = async (): Promise<void> => {
    try {
      await connectRedis();
      console.log("Connected to Redis");
    } catch (err) {
      console.error("Error connecting to Redis:", err);
      process.exit(1); // Kết thúc chương trình nếu không thể kết nối Redis
    }
  
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        const user = (await jwt.verify(
          token,
          process.env.JWT_SECRET || ""
        )) as JwtPayload;
        socket.user = user;
        next();
      } catch (err) {
        console.error("JWT verification failed:", err);
        return next(new Error("Authentication error"));
      }
    });
  
    io.on("connection", (socket) => {
      console.log("a user connected");
      if (socket.user) {
        setUserIDWithSocket(socket.user.id, socket.id);
      }
  
      socket.on("disconnect", async () => {
        console.log(`User disconnected: ${socket.id}`);
        removeUserBySocketId(socket.id);
      });
    });
  
    const apiLimiter = rateLimit({
      windowMs: 60 * 1000, // 1 phút
      max: 1000, // Tối đa 1000 request mỗi IP trong mỗi phút
      message: "Too many requests from this IP, please try again after a minute",
    });
  
    app.use(apiLimiter);
    app.use(express.json());
    app.use(bodyParser.json({
      limit: "10mb",
      type: "application/json",
    }));
    app.use(bodyParser.urlencoded({
      parameterLimit: 1000,
      limit: "10mb",
      extended: true,
    }));
    app.use(cors());
    app.use(cookieParser());
    
    // Sử dụng logger stream cho morgan
    app.use(morgan("combined", { stream: logger.stream }));
  
    app.use(API_PREFIX, apiRoutes);
  
    app.use(errorHandler);
    app.use(routeNotFoundHandler);
  
    server.listen(PORT, () => {
      console.log("Server:", chalk.blue(PORT), chalk.green("connected"));
    });
  };
  
  start();