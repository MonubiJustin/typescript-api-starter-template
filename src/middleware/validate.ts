import { z } from "zod";
import { Request, Response, NextFunction } from "express";

type ValidationSchemas = {
    body?: z.ZodType;
    cookies?: z.ZodType;
    params?: z.ZodType;
    query?: z.ZodType;
}

export const validate = (schemas: ValidationSchemas) => (req: Request, res: Response, next: NextFunction) => {
    if (schemas.body) {
        const result = schemas.body.safeParse(req.body);

        if (!result.success) {
            const errors = result.error.issues.map(issue => ({
                path: issue.path.join("."),
                message: issue.message
            }));

            return res.status(400).json({
                success: false,
                message: "Validation Failed",
                errors
            });
        }
    }

    if (schemas.cookies) {
         const result = schemas.cookies.safeParse(req.cookies);

        if (!result.success) {
            const errors = result.error.issues.map(issue => ({
                path: issue.path.join("."),
                message: issue.message
            }));

            return res.status(400).json({
                success: false,
                message: "Validation Failed",
                errors
            });
        }
    }

    next();
}