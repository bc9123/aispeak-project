import { Request, Response } from "express";
import bcrypt from "bcrypt";
import supabase from "../utils/supabaseClient";
import cookie from "cookie";
import { User } from "../types/User";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/token";

// Ensures JWT_SECRET is defined in environment variables
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined in environment variables");

// Ensures REFRESH_SECRET is defined in environment variables, fallback to JWT_SECRET if not set
const REFRESH_SECRET = process.env.REFRESH_SECRET || JWT_SECRET;
if (!REFRESH_SECRET) throw new Error("REFRESH_SECRET is not defined in environment variables");

/**
 * Registers a new user.
 * This function handles user registration by checking if the user already exists,
 * hashing the password, and inserting the new user into the database.
 * Is accessible to anyone.
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, is_admin } = req.body;
    console.log("Raw req.body:", req.body);
    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    const { data: existingUser } = await supabase.from("users").select("*").eq("email", email).single();

    if (existingUser) {
      res.status(409).json({ message: "User already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser: Partial<User> = { email, password: hashedPassword, is_admin: typeof is_admin === "boolean" ? is_admin : false,};

    console.log("New user to insert:", newUser);
    const { data, error } = await supabase.from("users").insert(newUser).select().single();

    if (error) {
      res.status(500).json({ message: "Error creating user", error: error.message });
      return;
    }

    const accessToken = generateAccessToken(data);
    const refreshToken = generateRefreshToken({ id: data.id });

    res.setHeader(
      "Set-Cookie",
      cookie.serialize("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      })
    );

    res.status(201).json({
      message: "User created successfully",
      accessToken,
    });
  } catch (err: any) {
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

/**
 * Logs in a user.
 * This function handles user login by verifying the email and password,
 * generating access and refresh tokens, and setting the refresh token in a cookie.
 * Is accessible to anyone.
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    const { data: user, error } = await supabase.from("users").select("*").eq("email", email).single();

    if (error || !user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const accessToken = generateAccessToken({ id: user.id, email: user.email, is_admin: user.is_admin });
    const refreshToken = generateRefreshToken({ id: user.id });

    res.setHeader(
      "Set-Cookie",
      cookie.serialize("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      })
    );

    res.status(200).json({
      message: "Login successful",
      accessToken,
      user: { id: user.id, email: user.email, is_admin: user.is_admin },
    });
  } catch (err: any) {
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

/**
 * Deletes a user by ID.
 * This function handles the deletion of a user from the database.
 * Is accessible to admins only.
 */
export const deleteUser = async (req: Request & { user?: Partial<User> }, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;

    const { data, error } = await supabase.from("users").delete().eq("id", userId).select().single();

    if (error) {
      res.status(500).json({ message: "Error deleting user", error: error.message });
      return;
    }

    res.status(200).json({ message: "User deleted successfully", user: data });
  } catch (err: any) {
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

/**
 * Logs out a user by clearing the refresh token cookie.
 * This function handles user logout by setting the refresh token cookie to an empty value.
 * Is accessible to authorized user.
 */
export const logout = (req: Request, res: Response): void => {
  res.setHeader(
    "Set-Cookie",
    cookie.serialize("refreshToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: new Date(0),
      path: "/",
    })
  );
  res.status(200).json({ message: "Logged out successfully" });
};

/**
 * Refreshes the access token using the refresh token.
 * This function verifies the refresh token and generates a new access token.
 * Is accessible to anyone with a valid refresh token.
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const cookies = cookie.parse(req.headers.cookie || "");
    const token = cookies.refreshToken;
    if (!token) {
      res.status(401).json({ message: "No refresh token provided" });
      return;
    }

    const payload = verifyRefreshToken(token) as { id: string };

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", payload.id)
      .single();

    if (error || !user) {
      res.status(401).json({ message: "Invalid refresh token" });
      return;
    }

    const accessToken = generateAccessToken(user);
    res.status(200).json({ accessToken });
  } catch (err: any) {
    res.status(403).json({ message: "Invalid refresh token", error: err.message });
  }
};

/**
 * Retrieves a list of all users.
 * This function fetches all users from the database and returns their details.
 * Is accessible to admins only.
 */
export const getUsers = async (req: Request & { user?: Partial<User> }, res: Response): Promise<void> => {
  try {
    const { data: users, error } = await supabase.from("users").select("id, email, is_admin, created_at");

    if (error) {
      res.status(500).json({ message: "Error fetching users", error: error.message });
      return;
    }

    res.status(200).json(users);
  } catch (err: any) {
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

/**
 * Retrieves a user by ID.
 * This function fetches a user from the database based on the provided user ID.
 * Is accessible to authorized users and admins.
 */
export const getUser = async (req: Request & { user?: Partial<User> }, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;

    const { data, error } = await supabase.from("users").select("id, email, is_admin, created_at").eq("id", userId).single();

    if (error || !data) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json(data);
  } catch (err: any) {
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

/**
 * Deletes the current user.
 * This function handles the deletion of the currently authenticated user.
 * Is accessible to the user themselves.
 */
export const deleteCurrentUser = async (req: Request & { user?: Partial<User> }, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { data, error } = await supabase.from("users").delete().eq("id", req?.user.id).select().single();

    if (error) {
      res.status(500).json({ message: "Error deleting user", error: error.message });
      return;
    }

    res.status(200).json({ message: "User deleted successfully", user: data });
  } catch (err: any) {
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};
