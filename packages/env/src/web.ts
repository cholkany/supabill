import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    INTERNAL_SERVER_URL: z.string().url().optional(),
  },
  client: {
    NEXT_PUBLIC_SERVER_URL: z.url().default("http://localhost:3000"),
  },
  runtimeEnv: {
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
    INTERNAL_SERVER_URL: process.env.INTERNAL_SERVER_URL,
  },
  emptyStringAsUndefined: true,
});
