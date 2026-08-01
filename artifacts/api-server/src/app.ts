import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

/**
 * Registra a causa real das falhas.
 *
 * Sem isto, o pino-http só anota "failed with status code 500" e o motivo
 * verdadeiro — erro de conexão com o banco, credencial inválida, TLS — some.
 * Diagnosticar produção sem essa informação vira adivinhação.
 */
app.use(
  (
    err: Error & { code?: string; detail?: string },
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    logger.error(
      {
        err: {
          message: err.message,
          name: err.name,
          code: err.code,
          detail: err.detail,
          stack: err.stack,
        },
        method: req.method,
        url: req.originalUrl,
      },
      "Erro não tratado na requisição",
    );

    if (res.headersSent) {
      return;
    }
    res.status(500).json({ error: "Internal Server Error" });
  },
);

export default app;
