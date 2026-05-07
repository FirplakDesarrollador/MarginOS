const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucGhobW93a2xxaW9tb3dudXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTIwMzQwMjUsImV4cCI6MjAwNzYxMDAyNX0.FHCOWrVp-K-7qrM3CtYmYaqiOqwzsX_Au7pLm-MN3eQ";
fetch("https://lnphhmowklqiomownurw.supabase.co/rest/v1/simulations?select=simulation_number&limit=1", {
  headers: { "apikey": key, "Authorization": "Bearer " + key }
}).then(r => r.text()).then(console.log);
