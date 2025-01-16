import {Injectable, NestMiddleware} from "@nestjs/common";
import {Request, Response, NextFunction} from "express";


@Injectable()
export class CorsMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction): void {
        res.header('Access-Control-Allow-Origin', process.env.CORS_ALLOWED_ORIGINS);
        res.header(
            'Access-Control-Allow-Methods',
            'GET,HEAD,PUT,PATCH,POST,DELETE');
        res.header(
            'Access-Control-Allow-Headers',
            'Content-Type, Accept, Authorization',
        );
        res.header('Access-Control-Allow-Credentials', 'true');

        if (req.method === 'OPTIONS') {
            res.sendStatus(204);
        } else {
            next();
        }
    }
}