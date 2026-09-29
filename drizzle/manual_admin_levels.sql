-- Admin sub-roles: support | ops | super. Only meaningful when
-- users.role = 'admin'; null for travellers/vendors.
CREATE TYPE admin_level AS ENUM ('support', 'ops', 'super');
ALTER TABLE users ADD COLUMN admin_level admin_level;

-- Every existing admin account becomes 'super' so nobody loses access
-- when this ships — narrow their level down manually afterwards from
-- /admin/accounts if you want a tighter default.
UPDATE users SET admin_level = 'super' WHERE role = 'admin';
