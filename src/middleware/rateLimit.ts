import rateLimit from "express-rate-limit";

// Rate limiting middleware for authentication endpoints
// This middleware limits the number of requests from a single IP address
export const authRateLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 5,
  message: {
    message: "Too many attempts from this IP, please try again after 10 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting middleware for progress-related endpoints
// This middleware limits the number of requests from a single IP address
export const progressRateLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 10,
  message: {
    message: "Too many requests from this IP, please try again after 2 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});