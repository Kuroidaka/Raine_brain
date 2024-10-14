import { JwtPayload } from "~/api/middlewares/validate_token";


declare module 'express-serve-static-core' {
    interface Request {
        user: JwtPayload;
    }
}

declare module 'socket.io' {
    interface Socket {
        user: JwtPayload;
    }
}
