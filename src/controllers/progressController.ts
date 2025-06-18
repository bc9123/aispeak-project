import { Request, Response } from "express";
import supabase from "../utils/supabaseClient";

// Custom request interface to include user information
interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    is_admin?: boolean;
  };
}

/**
 * Retrieves the progress of a user by their ID.
 * This function fetches the progress data from the database based on the user ID provided in the request parameters.
 * Is accessible to authorized users and admins.
 */
export const getProgress = async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId } = req.params;

  try {
    const { data, error } = await supabase
      .from("progress")
      .select("user_id, current_level, level_xp, streak, xp, updated_at, progress_vector")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      res.status(404).json({ message: "Progress not found" });
      return;
    }
    res.status(200).json(data);
  } catch (err: any) {
    console.error("Error fetching progress:", err);
    res.status(500).json({ error: "Failed to fetch progress" });
  }
};

/**
 * Creates a new progress entry for a user.
 * This function inserts a new progress record into the database for the specified user ID.
 * Is accessible to authorized users and admins.
 */
export const createProgress = async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId } = req.params;

  try {
    const { data: existing, error: existErr } = await supabase
      .from("progress")
      .select("user_id")
      .eq("user_id", userId)
      .single();

    if (!existErr && existing) {
      res.status(409).json({ message: "Progress already exists. Use PUT to update." });
      return;
    }
  } catch (err: any) {
    res.status(500).json({ message: "Internal server error", error: err.message });
    return;
  }

  const { current_level = 0, level_xp = 0, streak = 0, xp = 0 } = req.body || {};

  if (
    typeof current_level !== "number" ||
    typeof level_xp !== "number" ||
    typeof streak !== "number" ||
    typeof xp !== "number"
  ) {
    res.status(400).json({
      message: "Invalid or missing fields. Provide numeric current_level, level_xp, streak, xp.",
    });
    return;
  }

  try {
    const vectorArr = [current_level, level_xp, streak, xp];
    const { data, error } = await supabase
      .from("progress")
      .insert({
        user_id: userId,
        current_level,
        level_xp,
        streak,
        xp,
        progress_vector: vectorArr,
      })
      .select("current_level, level_xp, streak, xp, progress_vector")
      .single();

    if (error || !data) {
      res.status(500).json({ message: "Error creating progress.", error: error?.message });
      return;
    }

    res.status(201).json({
      message: `Progress for user ${userId} created successfully.`,
      progress: data,
      vectorStored: true,
    });
  } catch (err: any) {
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

/**
 * Updates the progress of a user by their ID.
 * This function modifies the existing progress data for a user based on the provided fields in the request body.
 * Is accessible to admins only.
 */
export const updateProgress = async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId } = req.params;

  const updates: Record<string, any> = {};
  const allowed = ["current_level", "level_xp", "streak", "xp"];
  let has = false;
  for (const f of allowed) {
    if (f in req.body) {
      const v = req.body[f];
      if (typeof v !== "number") {
        res.status(400).json({ message: `Invalid type for ${f}; must be a number.` });
        return;
      }
      updates[f] = v;
      has = true;
    }
  }
  if (!has) {
    res.status(400).json({
      message:
        "No valid fields to update. Provide at least one of current_level, level_xp, streak, xp.",
    });
    return;
  }

  try {
    const { data, error } = await supabase
      .from("progress")
      .update(updates)
      .eq("user_id", userId)
      .select("current_level, level_xp, streak, xp")
      .single<{ current_level: number; level_xp: number; streak: number; xp: number }>();

    if (error || !data) {
      res
        .status(404)
        .json({ message: "Progress not found or update failed.", error: error?.message });
      return;
    }

    const vectorArr = [data.current_level, data.level_xp, data.streak, data.xp];
    const { error: vecErr } = await supabase
      .from("progress")
      .update({ progress_vector: vectorArr })
      .eq("user_id", userId);

    if (vecErr) {
      console.error("Error updating progress_vector column:", vecErr);
    }

    res.status(200).json({
      message: `Progress for user ${userId} updated successfully.`,
      progress: data,
      vectorStored: vecErr ? false : true,
    });
  } catch (err: any) {
    console.error("Internal server error in updateProgress:", err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

/**
 * Deletes the progress of a user by their ID.
 * This function removes the progress record from the database for the specified user ID.
 * Is accessible to admins only.
 */
export const deleteProgress = async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId } = req.params;

  try {
    const { data, error } = await supabase
      .from("progress")
      .delete()
      .eq("user_id", userId)
      .select();

    if (error || !data) {
      console.error("Error deleting progress:", error);
      res.status(404).json({ message: "Progress not found or deletion failed.", error: error?.message });
      return;
    }

    res.status(200).json({ message: `Progress for user ${userId} deleted successfully.` });
  } catch (err: any) {
    console.error("Internal server error in deleteProgress:", err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
}

/**
 * Retrieves the leaderboard of users based on their XP.
 * This function fetches the top users ordered by their XP and returns their IDs and emails.
 * Is accessible to anyone.
 */
export const getLeaderBoard = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { data: progressData, error: progressErr } = await supabase
      .from("progress")
      .select("user_id, xp")
      .order("xp", { ascending: false })
      .limit(10);

    if (progressErr || !progressData) {
      res
        .status(500)
        .json({ message: "Error fetching leaderboard data.", error: progressErr?.message });
      return;
    }
    const userIds = progressData.map((p: any) => p.user_id);
    const { data: userData, error: userErr } = await supabase
      .from("users")
      .select("id, email")
      .in("id", userIds);

    if (userErr || !userData) {
      res.status(500).json({ message: "Error fetching user data.", error: userErr?.message });
      return;
    }

    const leaderboard = progressData.map((p: any, idx: number) => {
      const user = userData.find((u: any) => u.id === p.user_id);
      return {
        rank: idx + 1,
        userId: p.user_id,
        email: user?.email || "unknown",
        xp: p.xp,
      };
    });

    res.status(200).json({ leaderboard });
  } catch (err: any) {
    console.error("Internal server error in getLeaderBoard:", err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

/**
 * Retrieves similar progress entries based on a user's progress vector.
 * This function uses a PostgreSQL function to find similar progress entries based on the provided user's progress vector.
 * It returns a list of similar users with their progress details.
 * Is accessible to authorized users.
 */
export const getSimilarProgress = async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId } = req.params;

  try {
    const { data: userProg, error: progErr } = await supabase
      .from("progress")
      .select("progress_vector")
      .eq("user_id", userId)
      .single();

    if (progErr || !userProg || !userProg.progress_vector) {
      res.status(404).json({ message: "Progress or progress_vector not found for this user" });
      return;
    }
    const queryVector = userProg.progress_vector as number[];

    const { data: similarData, error: simErr } = await supabase.rpc(
      "match_similar_progress",
      {
        query: queryVector,
        limit_count: 10,
      }
    );
    if (simErr || !similarData) {
      res.status(500).json({ message: "Error fetching similar progress", error: simErr?.message });
      return;
    }
    const similarUserIds = (similarData as any[]).map((row: any) => row.user_id);
    const { data: userData, error: userErr } = await supabase
      .from("users")
      .select("id, email")
      .in("id", similarUserIds);

    const result = (similarData as any[]).map((row: any) => {
      const user = Array.isArray(userData) ? userData.find((u: any) => u.id === row.user_id) : null;
      return {
        userId: row.user_id,
        email: user?.email || "unknown",
        current_level: row.current_level,
        level_xp: row.level_xp,
        streak: row.streak,
        xp: row.xp,
        distance: row.distance,
      };
    });

    res.status(200).json({ similar: result });
  } catch (err: any) {
    console.error("Internal server error in getSimilarProgress:", err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};
