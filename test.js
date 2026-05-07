require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from("simulations").select("id, customer_id, status, project_name, simulation_type, currency, valid_from, valid_to, created_at, updated_at, simulation_number").order("created_at", { ascending: false });
  console.log("Error:", error);
  console.log("Data length:", data?.length);
  if (data?.length > 0) console.log("Sample:", data[0]);
}
run();
