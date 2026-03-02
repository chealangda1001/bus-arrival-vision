-- Repair the broken profile for sokha@kimseng.com
-- The account was created before the 'driver' enum value was added,
-- so the profile update failed and left incorrect data.
UPDATE profiles 
SET 
  role = 'driver',
  operator_id = '861b12fc-426d-4172-a245-b436b7cdd45f',
  branch_id = '769e4f81-c1d0-494e-aa95-38763299176c',
  username = 'Sokha'
WHERE id = '12230fa7-59db-48a5-b386-a83eefaa6032';