import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "testing", "production"]).default("development"),
    PORT: z.coerce.number().positive(),
    DB_URI: z.string().refine(uri => uri.startsWith("mongodb://") || uri.startsWith("mongodb+srv://"), {
      message: "Invalid MongoDB connection string"
  })
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  parsed.error.issues.forEach((err) => {
    const path = err.path.join(".");
    console.error(`${path}: ${err.message}`);
  });

  process.exit(1);
}

export const env = parsed.data;
