// Export Supabase Auth users to JSON
const https = require('https');

const SUPABASE_URL = 'https://vfxezndvkaxlimthkeyx.supabase.co';
const SUPABASE_TOKEN = 'sbp_9082713f7f38759e5d95cf63771c4d576befac0e';

async function exportUsers() {
  const options = {
    hostname: 'vfxezndvkaxlimthkeyx.supabase.co',
    path: '/auth/v1/admin/users',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SUPABASE_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

exportUsers()
  .then(users => {
    console.log(`Exported ${users.users.length} users`);
    console.log(JSON.stringify(users.users.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      user_metadata: u.user_metadata
    })), null, 2));
  })
  .catch(err => console.error('Error:', err.message));
