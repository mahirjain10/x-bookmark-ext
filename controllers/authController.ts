import { Request, Response } from "express";
import axios, { AxiosError } from "axios";
import dotenv from "dotenv";
import session from "express-session";
import { createClient } from "redis";
import { RedisClientType } from "@redis/client";
import { MemoryStore } from "express-session";
import { RedisStore } from "connect-redis";
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateRandomString,
} from "../utils/authUtils";
import User from "../models/AuthSchema";

// Extend express-session types
declare module "express-session" {
  interface SessionData {
    oauthState?: {
      state: string;
      codeVerifier: string;
      createdAt: number;
    };
    tokens?: {
      access_token: string;
      expires_at: number;
    };
    user?: {
      userId: string;
      username: string;
    };
  }
}

// Load environment variables once
dotenv.config();

const {
  CLIENT_ID,
  CLIENT_SECRET,
  CALLBACK_URL,
  NODE_ENV,
  SESSION_SECRET,
  REDIS_URL,
} = process.env;

// Validate environment variables at startup
if (!CLIENT_ID || !CLIENT_SECRET || !CALLBACK_URL || !SESSION_SECRET) {
  throw new Error(
    "Missing required environment variables: CLIENT_ID, CLIENT_SECRET, CALLBACK_URL, or SESSION_SECRET"
  );
}

// Configure Redis client (only in production)
const redisClient: RedisClientType | null =
  NODE_ENV === "production" && REDIS_URL
    ? createClient({
        url: REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
        },
      })
    : null;

if (redisClient) {
  redisClient.on("error", (err) => console.error("Redis error:", err));
  redisClient.on("connect", () => console.log("Redis connected"));
  redisClient
    .connect()
    .catch((err) => {
      console.error("Failed to connect to Redis:", err);
      process.exit(1); // Exit if Redis fails in production
    })
    .then(async () => {
      // Set reasonable memory limits
      await Promise.all([
        redisClient.configSet("maxmemory", "256mb"),
        redisClient.configSet("maxmemory-policy", "allkeys-lru"),
      ]).catch((err) => console.error("Redis config error:", err));
    });
}

// Configure session middleware
const store = NODE_ENV === "production" && redisClient
  ? new RedisStore({
      client: redisClient,
      prefix: "x-bookmark:",
    })
  : new MemoryStore();

export const sessionMiddleware = session({
  store,
  secret: SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: NODE_ENV === "production",
    httpOnly: true,
    maxAge: 12 * 60 * 60 * 1000, // 12 hours
  },
});

/**
 * Fetch user profile from Twitter API
 */
async function getUserProfile(accessToken: string): Promise<any> {
  try {
    const response = await axios.get("https://api.twitter.com/2/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 5000,
    });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching user profile:", (error as AxiosError).message);
    throw error;
  }
}

/**
 * Step 1: Start the login flow
 * Redirect user to Twitter's OAuth2 authorization URL
 */
export const startLoginFlow = async (req: Request, res: Response): Promise<void> => {
  try {
    const state = generateRandomString(16);
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    req.session.oauthState = {
      state,
      codeVerifier,
      createdAt: Date.now(),
    };

    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });

    const authParams = new URLSearchParams({
      response_type: "code",
      client_id: CLIENT_ID!,
      redirect_uri: CALLBACK_URL!,
      scope: "users.read offline.access tweet.read bookmark.read bookmark.write",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    const authUrl = `https://twitter.com/i/oauth2/authorize?${authParams.toString()}`;
    res.redirect(authUrl);
  } catch (error) {
    console.error("Error initiating login flow:", (error as Error).message);
    res.status(500).send("Failed to initiate login flow");
  }
};

/**
 * Step 2: Handle OAuth callback
 */
export const handleCallback = async (req: Request, res: Response): Promise<void> => {
  const { code, state } = req.query;

  if (typeof code !== "string" || typeof state !== "string") {
    res.status(400).send("Invalid request: Missing code or state");
    return;
  }

  const oauthState = req.session.oauthState;
  if (!oauthState || oauthState.state !== state) {
    res.status(400).send("Invalid state: Possible CSRF attack");
    return;
  }

  delete req.session.oauthState;

  try {
    const tokenResponse = await axios.post(
      "https://api.twitter.com/2/oauth2/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: CALLBACK_URL!,
        client_id: CLIENT_ID!,
        code_verifier: oauthState.codeVerifier,
      }).toString(),
      {
        auth: { username: CLIENT_ID!, password: CLIENT_SECRET! },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 5000,
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    const userProfile = await getUserProfile(access_token);

    // Store or update user in database
    const user = await User.findOneAndUpdate(
      { userId: userProfile.id },
      {
        userId: userProfile.id,
        username: userProfile.username,
        refreshToken: refresh_token,
      },
      { upsert: true, new: true }
    );

    if (!user) {
      throw new Error("Failed to create/update user");
    }

    // Store tokens and user info in session
    req.session.tokens = {
      access_token,
      expires_at: Date.now() + expires_in * 1000,
    };
    
    req.session.user = {
      userId: user.userId,
      username: user.username
    };

    if (NODE_ENV === "production" && redisClient) {
      await redisClient.expire(`x-bookmark:${req.sessionID}`, 12 * 60 * 60);
    }

    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });

    res.redirect("/dashboard");
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error("OAuth callback error:", axiosError.response?.data || axiosError.message);
    if (axiosError.response?.status === 403) {
      res.status(403).send("Forbidden: Check callback URL or Twitter app settings");
    } else if (axiosError.response?.status === 400) {
      res.status(400).send("Bad request: Invalid authorization code");
    } else {
      res.status(500).send("Server error during authentication");
    }
  }
};

// Cleanup on process exit
process.on("SIGTERM", async () => {
  if (redisClient) {
    await redisClient.quit();
    console.log("Redis connection closed");
  }
  process.exit(0);
});