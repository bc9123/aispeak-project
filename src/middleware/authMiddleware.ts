import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Ensure JWT_SECRET is defined in environment variables
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");

/**
 * Middleware to authenticate user using JWT.
 * It checks for the token in the Authorization header,
 * verifies it, and attaches the user information to the request object.
 * If the token is invalid or missing, it returns a 401 or 403 status.
 */
export const authenticate = (req: Request & { user?: any }, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ message: "Invalid token" });
  }
};

/**
 * Middleware to check if the user is an admin.
 * It checks the user information attached to the request object and returns a 403 status if the user is not an admin.
 */
type UserPayload = {
  id: string;
  email: string;
  is_admin: boolean;
};

export const requireAdmin = (
  req: Request & { user?: UserPayload },
  res: Response,
  next: NextFunction
): void => {
  if (!req.user?.is_admin) {
    console.log("Decoded user:", req.user); 
    res.status(403).json({ message: "Admin privileges required" });
    return;
  }
  next();
};

/**
 * Middleware to check if the user is the owner of a resource or an admin.
 * It compares the user ID from the request parameters with the authenticated user's ID.
 * If they do not match and the user is not an admin, it returns a 403 status.
 */
export const requireOwnerOrAdmin = (paramName: string) => {
  return (req: Request & { user?: { id: string; is_admin?: boolean } }, res: Response, next: NextFunction): void => {
    const authUser = req.user;
    const targetId = req.params[paramName];

    if (!authUser) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (authUser.id !== targetId && !authUser.is_admin) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    next();
  };
};
