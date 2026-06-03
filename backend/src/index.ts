import app from "@/app";
import { logger } from "@/utils/logger";

async function bootstrap(): Promise<void> {
  app.listen(process.env.PORT, () => {
    logger.info(
      "Server",
      `🚀 Server running at http://${process.env.HOST}:${process.env.PORT}`,
    );
  });
}

// eslint-disable-next-line no-void
void bootstrap();
