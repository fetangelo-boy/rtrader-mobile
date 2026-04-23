-- Fix profiles to have username field populated
-- This updates all profiles that have email but no username

-- Update demo@rtrader.com profile
UPDATE profiles 
SET username = 'Demo User' 
WHERE email = 'demo@rtrader.com' AND (username IS NULL OR username = '');

-- Update test@rtrader.com profile
UPDATE profiles 
SET username = 'Test User' 
WHERE email = 'test@rtrader.com' AND (username IS NULL OR username = '');

-- Update any other profiles with email-based username
UPDATE profiles 
SET username = COALESCE(full_name, SPLIT_PART(email, '@', 1)) 
WHERE (username IS NULL OR username = '') AND email IS NOT NULL;

-- Verify the updates
SELECT id, email, username, full_name FROM profiles LIMIT 10;
