require('./scripts/load-env.js');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('Testing Supabase direct login...');
console.log('Project:', url);

// Test direct Supabase Auth login (bypassing Express server)
fetch(url + '/auth/v1/token?grant_type=password', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': key
  },
  body: JSON.stringify({
    email: 'tg716116024@rtrader.app',
    password: 'DBWGx8KUVg'
  })
})
  .then(r => {
    console.log('Status:', r.status);
    return r.json();
  })
  .then(d => {
    if (d.access_token) {
      console.log('LOGIN SUCCESS');
      console.log('User ID:', d.user?.id);
      console.log('Email:', d.user?.email);
      console.log('Token (first 30):', d.access_token.slice(0, 30) + '...');
    } else {
      console.log('LOGIN FAILED:', JSON.stringify(d));
    }
  })
  .catch(e => console.error('Error:', e.message));
