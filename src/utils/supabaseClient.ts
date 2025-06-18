import { createClient } from '@supabase/supabase-js';
import dotenv from "dotenv";

dotenv.config();

// Initialize Supabase client with environment variables
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

export default supabase;
