import { Request, Response, NextFunction } from 'express';

export const validateSession = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user and tokens exist in session
    if (!req.session.user || !req.session.tokens) {
      return res.status(401).json({ error: 'Unauthorized: Please login' });
    }

    // Check if token is expired
    const now = Date.now();
    if (now >= (req.session.tokens.expires_at || 0)) {
      return res.status(401).json({ error: 'Session expired: Please login again' });
    }

    // Add user and token info to request for use in routes
    req.user = req.session.user;
    req.accessToken = req.session.tokens.access_token;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Type augmentation for Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
      };
      accessToken?: string;
    }
  }
}
