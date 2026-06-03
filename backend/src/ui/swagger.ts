import swaggerUi from "swagger-ui-express";
import { Express } from "express";
import fs from "fs";
import yaml from "yaml";
import path from "path";

export function setupSwagger(app: Express): void {
  const file = fs.readFileSync(
    path.join(__dirname, "../../docs/openapi.yaml"),
    "utf8",
  );
  const spec = yaml.parse(file);
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));
}
