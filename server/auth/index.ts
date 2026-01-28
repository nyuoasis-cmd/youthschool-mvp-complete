import { Express } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import { authRouter, passport } from "./routes";

// Re-export middleware
export * from "./middleware";

// Database pool for sessions
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const PgSession = connectPgSimple(session);

/**
 * Setup authentication middleware and routes
 */
export async function setupAuth(app: Express): Promise<void> {
  // Session configuration
  const sessionSecret = process.env.SESSION_SECRET || "youthschool-secret-key-change-in-production";
  const sessionMaxAge = Number(process.env.SESSION_TIMEOUT) || 2 * 60 * 60 * 1000;

  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: "sessions",
        createTableIfMissing: true,
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: sessionMaxAge, // 2 hours default
        sameSite: "lax",
      },
    })
  );

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Register auth routes
  app.use("/api/auth", authRouter);

  console.log("Auth system initialized");
}
