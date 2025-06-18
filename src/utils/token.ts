import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// Ensure JWT_SECRET and REFRESH_SECRET are defined in environment variables
const JWT_SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.REFRESH_SECRET || JWT_SECRET;

// Function to generate an access token
export const generateAccessToken = (user: Partial<{ id: string, email: string, is_admin: boolean }>) => jwt.sign(user, JWT_SECRET, { expiresIn: "15m" });

// Function to verify an access token
export const generateRefreshToken = (user: Partial<{ id: string }>) => jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: "7d" });

// Function to verify a refresh token
export const verifyRefreshToken = (token: string) => jwt.verify(token, REFRESH_SECRET);