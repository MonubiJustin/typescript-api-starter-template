import express, { type Request, type Response } from "express"; 

const app = express();


app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: "API running successfully"
    })
})


export { app };