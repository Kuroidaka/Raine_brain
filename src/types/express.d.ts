import { JwtPayload } from "~/api/middlewares/validate_token";


declare module 'express-serve-static-core' {
    interface Request {
        user: JwtPayload; // You can adjust the type based on your JWT payload structure
    }
}