import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://chjyfpyqfuioufizdkys.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable__FZU6KLC_eszeie_S4XoSw_p2f_JpDq";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
