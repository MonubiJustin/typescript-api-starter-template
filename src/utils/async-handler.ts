import type { Request, Response, NextFunction, RequestHandler } from "express";

export const asyncHandler = (handler: RequestHandler) => {
return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await handler(req, res, next);
        } catch (error) {
            next(error);
        }
    };
}

    
