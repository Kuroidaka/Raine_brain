import { createClient, RedisClientType } from 'redis';
import chalk from 'chalk';

// Define a configuration interface
interface RedisConfig {
    url?: string;
    port?: number;
}

const redisConfig: RedisConfig = {};

if (process.env.NODE_ENV === "production") {
    redisConfig.url = 'redis://redis:6379'; // Docker
} else {
    redisConfig.port = parseInt(process.env.REDIS_PORT || '6379'); // Local
}

export const redisClient: RedisClientType = createClient(redisConfig);

export const connectRedis = async () => {
    try {
        await redisClient.connect();
        console.log(chalk.red("Redis"), chalk.green("connected"));
    } catch (error) {
        console.error("Redis Error:", error);
    }
};

redisClient.on("error", (error: Error) => {
    console.error("Redis Error:", error);
});


