import { createClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

// Create a single supabase client for interacting with the database
export const supabase = createClient(
  environment.supabaseUrl,
  environment.supabaseAnonKey
);
