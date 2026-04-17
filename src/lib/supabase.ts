import { createClient } from '@supabase/supabase-js';

// Usamos ! para TypeScript ya que estamos seguros de que estas variables estaran definidas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Crea una unica instancia del cliente de supabase para interactuar con la DB
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
