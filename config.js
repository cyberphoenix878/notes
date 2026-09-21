// const SUPABASE_URL = "https://hrsgaxpptakyyjdganlr.supabase.co";
// const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhyc2dheHBwdGFreXlqZGdhbmxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNzA3ODksImV4cCI6MjEwMzk0Njc4OX0.iR9w4sQC02x2h-HHfzj96hiMg18xljKR9G1rqX3uNuo";




const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export { SUPABASE_URL, SUPABASE_ANON_KEY };