import { PrismaClient } from "@prisma/client";

export const prismaSingleton = new PrismaClient();
