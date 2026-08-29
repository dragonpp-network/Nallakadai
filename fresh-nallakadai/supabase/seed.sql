-- ============================================================================
-- Fresh Nalla Kadai — Full Production & Demo Seed Data
-- ============================================================================

-- 1. Branches
INSERT INTO public.branches (id, name, address, whatsapp_number, support_number, pickup_address, collection_timing, show_prices, next_opening_note)
VALUES
  (
    '11111111-1111-4111-8111-111111111111',
    'Erode',
    'Nalla Kadai Organic, Perundurai Road, Erode',
    '919489581122',
    '919489581122',
    'Nalla Kadai Organic, Perundurai Road, Erode (Opp. Reliance Mall)',
    'Tuesday 8:00 AM – 12:00 PM',
    true,
    'Our Fresh store opens every Friday evening for Tuesday delivery.'
  ),
  (
    '11111111-2222-4111-8111-111111111111',
    'Coimbatore',
    'Nalla Kadai, RS Puram, Coimbatore',
    '919489581133',
    '919489581133',
    'Nalla Kadai, DB Road, RS Puram, Coimbatore',
    'Wednesday 8:00 AM – 1:00 PM',
    true,
    'Coimbatore cycle opens Saturday 10:00 AM.'
  ),
  (
    '11111111-3333-4111-8111-111111111111',
    'Tiruppur',
    'Nalla Kadai, Avinashi Road, Tiruppur',
    '919489581144',
    '919489581144',
    'Nalla Kadai, Kumaran Road, Tiruppur',
    'Friday 8:00 AM – 12:00 PM',
    true,
    'Tiruppur cycle opens Tuesday 9:00 AM.'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  whatsapp_number = EXCLUDED.whatsapp_number,
  support_number = EXCLUDED.support_number;

-- 2. Admin & Store Operator Users (Super Admins & Operators)
INSERT INTO public.admin_users (id, email, password_hash, full_name, role, branch_id, active)
VALUES
  (
    'a0000000-0000-4000-8000-000000000001',
    'pingnagan@gmail.com',
    'Nallakadai@2026',
    'Nagan (Super Admin)',
    'super_admin',
    NULL,
    true
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    'goodshoperode@gmail.com',
    'Nallakadai@2026',
    'Good Shop Admin',
    'super_admin',
    NULL,
    true
  ),
  (
    'a0000000-0000-4000-8000-000000000003',
    'erode.operator@nallakadai.in',
    'Nallakadai@2026',
    'Erode Store Operator',
    'branch_admin',
    '11111111-1111-4111-8111-111111111111',
    true
  )
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name;

-- 3. Standard Categories
INSERT INTO public.categories (id, name, name_ta, tint, sort_order) VALUES
  ('22222222-0001-4111-8111-111111111111', 'Vegetables', 'காய்கறிகள்', '#EAF3DD', 1),
  ('22222222-0002-4111-8111-111111111111', 'Greens', 'கீரைகள்', '#DCEBD3', 2),
  ('22222222-0003-4111-8111-111111111111', 'Fruits', 'பழங்கள்', '#FBE9D8', 3),
  ('22222222-0004-4111-8111-111111111111', 'Dairy', 'பால் பொருட்கள்', '#EFF3FA', 4),
  ('22222222-0005-4111-8111-111111111111', 'Vegan', 'வீகன்', '#F1EEDD', 5)
ON CONFLICT (id) DO NOTHING;

-- 4. Master Items Catalogue
INSERT INTO public.items (id, name_en, name_ta, category_id, unit, presets, min_qty, max_qty) VALUES
  ('33333333-0001-4111-8111-111111111111', 'Country Tomato', 'நாட்டுத் தக்காளி', '22222222-0001-4111-8111-111111111111', 'Kg', '{0.5,1,2}', 0.25, 10),
  ('33333333-0002-4111-8111-111111111111', 'Ladies Finger (Okra)', 'வெண்டைக்காய்', '22222222-0001-4111-8111-111111111111', 'Kg', '{0.25,0.5,1}', 0.25, 5),
  ('33333333-0003-4111-8111-111111111111', 'Country Drumstick', 'நாட்டு முருங்கைக்காய்', '22222222-0001-4111-8111-111111111111', 'Nos', '{2,5,10}', 1, 25),
  ('33333333-0004-4111-8111-111111111111', 'Korai Kizhangu', 'கோரைக்கிழங்கு', '22222222-0001-4111-8111-111111111111', 'Kg', '{0.25,0.5,1}', 0.25, 3),
  ('33333333-0005-4111-8111-111111111111', 'Small Onion (Shallots)', 'சின்ன வெங்காயம்', '22222222-0001-4111-8111-111111111111', 'Kg', '{0.5,1,2}', 0.25, 5),
  ('33333333-0006-4111-8111-111111111111', 'Green Chilli', 'பச்சை மிளகாய்', '22222222-0001-4111-8111-111111111111', 'Kg', '{0.1,0.25,0.5}', 0.1, 2),
  ('33333333-0007-4111-8111-111111111111', 'Brinjal (Eggplant)', 'கத்திரிக்காய்', '22222222-0001-4111-8111-111111111111', 'Kg', '{0.5,1,2}', 0.25, 5),
  ('33333333-0008-4111-8111-111111111111', 'Spinach (Pasalai)', 'பசலைக்கீரை', '22222222-0002-4111-8111-111111111111', 'Nos', '{1,2,3}', 1, 10),
  ('33333333-0009-4111-8111-111111111111', 'Moringa Leaves', 'முருங்கைக்கீரை', '22222222-0002-4111-8111-111111111111', 'Nos', '{1,2}', 1, 10),
  ('33333333-0010-4111-8111-111111111111', 'Sirukeerai', 'சிறுகீரை', '22222222-0002-4111-8111-111111111111', 'Nos', '{1,2,3}', 1, 10),
  ('33333333-0011-4111-8111-111111111111', 'Arai Keerai', 'அரைக்கீரை', '22222222-0002-4111-8111-111111111111', 'Nos', '{1,2}', 1, 10),
  ('33333333-0012-4111-8111-111111111111', 'Banana (Poovan)', 'பூவன் பழம்', '22222222-0003-4111-8111-111111111111', 'Kg', '{0.5,1,2}', 0.5, 5),
  ('33333333-0013-4111-8111-111111111111', 'Country Guava', 'நாட்டு கொய்யா', '22222222-0003-4111-8111-111111111111', 'Kg', '{0.5,1}', 0.5, 5),
  ('33333333-0014-4111-8111-111111111111', 'Papaya', 'பப்பாளி', '22222222-0003-4111-8111-111111111111', 'Kg', '{1,2}', 0.5, 5),
  ('33333333-0015-4111-8111-111111111111', 'Fresh A2 Cow Milk', 'நாட்டுப் பசு பால்', '22222222-0004-4111-8111-111111111111', 'Litre', '{0.5,1,2}', 0.5, 5),
  ('33333333-0016-4111-8111-111111111111', 'Farm Fresh Curd', 'பண்ணைத் தயிர்', '22222222-0004-4111-8111-111111111111', 'Gram', '{250,500}', 200, 2000),
  ('33333333-0017-4111-8111-111111111111', 'Country Butter (Venna)', 'வெண்ணெய்', '22222222-0004-4111-8111-111111111111', 'Gram', '{250,500}', 100, 2000),
  ('33333333-0018-4111-8111-111111111111', 'Cold Pressed Groundnut Oil', 'மரச்செக்கு நிலக்கடலை எண்ணெய்', '22222222-0005-4111-8111-111111111111', 'Litre', '{0.5,1}', 0.5, 5),
  ('33333333-0019-4111-8111-111111111111', 'Cold Pressed Sesame Oil', 'மரச்செக்கு நல்லெண்ணெய்', '22222222-0005-4111-8111-111111111111', 'Litre', '{0.5,1}', 0.5, 5)
ON CONFLICT (id) DO NOTHING;

-- 5. Active Cycle for Erode
INSERT INTO public.cycles (id, branch_id, cycle_no, open_at, close_at, delivery_date, status)
VALUES (
  '44444444-0001-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111',
  1,
  now() - interval '1 day',
  now() + interval '5 days',
  (now() + interval '7 days')::date,
  'Open'
)
ON CONFLICT (id) DO NOTHING;

-- 6. Cycle Items Pricing for Erode Cycle 1
INSERT INTO public.cycle_items (cycle_id, item_id, price)
SELECT '44444444-0001-4111-8111-111111111111', id,
  CASE name_en
    WHEN 'Country Tomato' THEN 40
    WHEN 'Ladies Finger (Okra)' THEN 60
    WHEN 'Country Drumstick' THEN 12
    WHEN 'Korai Kizhangu' THEN 120
    WHEN 'Small Onion (Shallots)' THEN 85
    WHEN 'Green Chilli' THEN 60
    WHEN 'Brinjal (Eggplant)' THEN 45
    WHEN 'Spinach (Pasalai)' THEN 20
    WHEN 'Moringa Leaves' THEN 20
    WHEN 'Sirukeerai' THEN 20
    WHEN 'Arai Keerai' THEN 20
    WHEN 'Banana (Poovan)' THEN 70
    WHEN 'Country Guava' THEN 90
    WHEN 'Papaya' THEN 50
    WHEN 'Fresh A2 Cow Milk' THEN 65
    WHEN 'Farm Fresh Curd' THEN 0.09
    WHEN 'Country Butter (Venna)' THEN 0.70
    WHEN 'Cold Pressed Groundnut Oil' THEN 320
    WHEN 'Cold Pressed Sesame Oil' THEN 440
    ELSE 50
  END
FROM public.items
ON CONFLICT (cycle_id, item_id) DO NOTHING;

-- 7. Realistic Customers
INSERT INTO public.customers (id, name, mobile, alt_mobile, branch_id, delivery_mode, address, area) VALUES
  ('55555555-0001-4111-8111-111111111111', 'Sampath Kumar', '9489581122', '9842711000', '11111111-1111-4111-8111-111111111111', 'Door Delivery', '12, Kamarajar Street, Erode', 'Perundurai Road'),
  ('55555555-0002-4111-8111-111111111111', 'Lakshmi Devi', '9600012345', NULL, '11111111-1111-4111-8111-111111111111', 'Customer Pickup', '', 'Surampatti'),
  ('55555555-0003-4111-8111-111111111111', 'Ramasamy Natarajan', '9842711223', NULL, '11111111-1111-4111-8111-111111111111', 'Door Delivery', '45 Gandhi Nagar, Erode', 'Thindal'),
  ('55555555-0004-4111-8111-111111111111', 'Kavitha Senthil', '9443355667', '9443355668', '11111111-1111-4111-8111-111111111111', 'Door Delivery', '8A, VOC Nagar, Erode', 'Brough Road'),
  ('55555555-0005-4111-8111-111111111111', 'Dr. Anand Raman', '9894011234', NULL, '11111111-1111-4111-8111-111111111111', 'Door Delivery', '102 Doctors Colony, Erode', 'Collectorate'),
  ('55555555-0006-4111-8111-111111111111', 'Meena Murugan', '9789012345', NULL, '11111111-1111-4111-8111-111111111111', 'Customer Pickup', '', 'Solar')
ON CONFLICT (mobile) DO NOTHING;

-- 8. Sample Placed Orders with Items
INSERT INTO public.orders (id, order_no, cycle_id, customer_id, branch_id, delivery_mode, delivery_address, status)
VALUES
  (
    '66666666-0001-4111-8111-111111111111',
    'FNK-1001',
    '44444444-0001-4111-8111-111111111111',
    '55555555-0001-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    'Door Delivery',
    '12, Kamarajar Street, Erode',
    'Placed'
  ),
  (
    '66666666-0002-4111-8111-111111111111',
    'FNK-1002',
    '44444444-0001-4111-8111-111111111111',
    '55555555-0002-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    'Customer Pickup',
    '',
    'Placed'
  ),
  (
    '66666666-0003-4111-8111-111111111111',
    'FNK-1003',
    '44444444-0001-4111-8111-111111111111',
    '55555555-0003-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    'Door Delivery',
    '45 Gandhi Nagar, Erode',
    'Placed'
  )
ON CONFLICT (cycle_id, customer_id) DO NOTHING;

-- 9. Sample Order Items
INSERT INTO public.order_items (order_id, item_id, name_en, name_ta, unit, qty, price) VALUES
  ('66666666-0001-4111-8111-111111111111', '33333333-0001-4111-8111-111111111111', 'Country Tomato', 'நாட்டுத் தக்காளி', 'Kg', 2, 40),
  ('66666666-0001-4111-8111-111111111111', '33333333-0002-4111-8111-111111111111', 'Ladies Finger (Okra)', 'வெண்டைக்காய்', 'Kg', 1, 60),
  ('66666666-0001-4111-8111-111111111111', '33333333-0008-4111-8111-111111111111', 'Spinach (Pasalai)', 'பசலைக்கீரை', 'Nos', 2, 20),
  ('66666666-0001-4111-8111-111111111111', '33333333-0015-4111-8111-111111111111', 'Fresh A2 Cow Milk', 'நாட்டுப் பசு பால்', 'Litre', 2, 65),
  ('66666666-0002-4111-8111-111111111111', '33333333-0003-4111-8111-111111111111', 'Country Drumstick', 'நாட்டு முருங்கைக்காய்', 'Nos', 5, 12),
  ('66666666-0002-4111-8111-111111111111', '33333333-0012-4111-8111-111111111111', 'Banana (Poovan)', 'பூவன் பழம்', 'Kg', 1.5, 70),
  ('66666666-0003-4111-8111-111111111111', '33333333-0001-4111-8111-111111111111', 'Country Tomato', 'நாட்டுத் தக்காளி', 'Kg', 1, 40),
  ('66666666-0003-4111-8111-111111111111', '33333333-0018-4111-8111-111111111111', 'Cold Pressed Groundnut Oil', 'மரச்செக்கு நிலக்கடலை எண்ணெய்', 'Litre', 1, 320)
ON CONFLICT (order_id, item_id) DO NOTHING;
