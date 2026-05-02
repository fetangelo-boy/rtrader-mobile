require('./scripts/load-env.js');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const projectRef = url ? url.match(/https:\/\/([^.]+)/)?.[1] : 'NONE';
console.log('Active Supabase project ref:', projectRef);
console.log('Supabase URL:', url || 'NOT SET');
console.log('Anon key set:', !!key);

if (!url || !key) {
  console.error('ERROR: Missing Supabase credentials');
  process.exit(1);
}

// Test Supabase auth endpoint
fetch(url + '/auth/v1/health', {
  headers: { 'apikey': key }
})
  .then(r => {
    console.log('Auth health status:', r.status);
    return r.json();
  })
  .then(d => console.log('Auth health:', JSON.stringify(d)))
  .catch(e => console.error('Auth health error:', e.message));
