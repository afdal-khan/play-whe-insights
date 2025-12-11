import { createClient } from '@supabase/supabase-js';

// --- DIRECT KEYS (Bypassing .env for now) ---
const supabaseUrl = "https://dpgvypulxtkthknkbxrr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwZ3Z5cHVseHRrdGhrbmtieHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyOTExMjUsImV4cCI6MjA4MDg2NzEyNX0.pzWCyThl5lxAztariSwO1xhSFHIlHQQLb6bcrwCB6uw";

export const supabase = createClient(supabaseUrl, supabaseKey);