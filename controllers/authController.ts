// auth.ts
import { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
import session from "express-session";
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

// Load environment variables only once at the top
dotenv.config();

const { CLIENT_ID, CLIENT_SECRET, CALLBACK_URL, NODE_ENV, SESSION_SECRET } = process.env;

// Check required environment variables
if (!CLIENT_ID || !CLIENT_SECRET || !CALLBACK_URL) {
  throw new Error(
    "Missing required environment variables: CLIENT_ID, CLIENT_SECRET, CALLBACK_URL"
  );
}

// Configure session middleware
export const sessionMiddleware = session({
  secret: SESSION_SECRET || "your-secret-key",
  resave: true, // Changed to true to ensure session is saved
  saveUninitialized: true, // Changed to true to allow saving new sessions
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
});

/**
 * Fetch user profile from Twitter API
 */
async function getUserProfile(accessToken: string) {
  try {
    const response = await axios.get('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

/**
 * Step 1: Start the login flow
 * Redirect user to Twitter's OAuth2 authorization URL
 */
export const startLoginFlow = async (req: Request, res: Response) => {
  try {
    const state = generateRandomString(16);
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Store OAuth state in session
    req.session.oauthState = {
      state,
      codeVerifier,
      createdAt: Date.now()
    };

    // Save session before redirecting
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const authParams = new URLSearchParams({
      response_type: "code",
      client_id: CLIENT_ID,
      redirect_uri: CALLBACK_URL,
      scope: "users.read offline.access tweet.read bookmark.read bookmark.write",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    const authUrl = `https://twitter.com/i/oauth2/authorize?${authParams.toString()}`;
    res.redirect(authUrl);
  } catch (error) {
    console.error("Error initiating login flow:", error);
    res.status(500).send("Failed to initiate login flow");
  }
};

export const handleCallback = async (
  req: Request,
  res: Response
): Promise<void> => {
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

  // Clear the OAuth state from session
  delete req.session.oauthState;

  try {
    const tokenResponse = await axios.post(
      "https://api.twitter.com/2/oauth2/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: CALLBACK_URL,
        client_id: CLIENT_ID,
        code_verifier: oauthState.codeVerifier,
      }).toString(),
      {
        auth: { username: CLIENT_ID, password: CLIENT_SECRET },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    
    // Get user profile
    const userProfile = await getUserProfile(access_token);
    
    // Store or update user in database
    const user = await User.findOneAndUpdate(
      { userId: userProfile.id },
      { 
        userId: userProfile.id,
        username: userProfile.username,
        refreshToken: refresh_token
      },
      { upsert: true, new: true }
    );
    
    // Store access token and user info in session
    req.session.tokens = {
      access_token,
      expires_at: Date.now() + expires_in * 1000
    };
    
    req.session.user = {
      userId: user.userId,
      username: user.username
    };
    
    await req.session.save();
    res.redirect("/dashboard");
  } catch (error: any) {
    console.error(
      "OAuth callback error:",
      error.response?.data || error.message
    );
    if (error.response?.status === 403) {
      res
        .status(403)
        .send("Forbidden: Check callback URL or Twitter app settings");
    } else if (error.response?.status === 400) {
      res.status(400).send("Bad request: Invalid authorization code");
    } else {
      res.status(500).send("Server error during authentication");
    }
  }
};
