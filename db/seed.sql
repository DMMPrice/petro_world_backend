-- Clear existing data in dependency order
DELETE FROM support_messages;
DELETE FROM support_tickets;
DELETE FROM notifications;
DELETE FROM recently_viewed;
DELETE FROM search_history;
DELETE FROM reviews;
DELETE FROM wishlists;
DELETE FROM carts;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM users WHERE role = 'customer';
DELETE FROM products;
DELETE FROM sub_categories;
DELETE FROM categories;
DELETE FROM banners;
DELETE FROM coupons;
DELETE FROM settings;
DELETE FROM faqs;
DELETE FROM delivery_estimates;

-- Categories
INSERT INTO categories (id, title, icon) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Staff Uniforms', '👕'),
  ('11111111-0000-0000-0000-000000000002', 'Safety Signboards', '⚠️'),
  ('11111111-0000-0000-0000-000000000003', 'Engine Oils & Lubricants', '🛢️'),
  ('11111111-0000-0000-0000-000000000004', 'Oil Cans & Dispensing', '🪣'),
  ('11111111-0000-0000-0000-000000000005', 'Flooring & Mats', '🟦'),
  ('11111111-0000-0000-0000-000000000006', 'Safety & PPE', '🦺'),
  ('11111111-0000-0000-0000-000000000007', 'Fuel Additives', '⛽'),
  ('11111111-0000-0000-0000-000000000008', 'Station Accessories', '🧢');

-- Sub Categories
INSERT INTO sub_categories (id, category_id, title) VALUES
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Attendant Shirts'),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'Full Uniform Sets'),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'Caps & Headwear'),
  ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000002', 'Bilingual Boards'),
  ('22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000002', 'Danger & Warning'),
  ('22222222-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000003', 'Synthetic Oils'),
  ('22222222-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000003', 'Mineral Oils'),
  ('22222222-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000004', 'Hand Cans'),
  ('22222222-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000004', 'Drum Dispensers'),
  ('22222222-0000-0000-0000-000000000010', '11111111-0000-0000-0000-000000000005', 'Rubber Mats');

-- Products: Staff Uniforms
INSERT INTO products (id, title, brand_name, price, price_after_discount, description, images, stock_quantity, category_id, sub_category_id, rating, num_reviews) VALUES
  ('33333333-0000-0000-0000-000000000001',
   'BPCL Attendant Crew Shirt — Blue & Yellow (Full Sleeves)',
   'UniWear Pro',
   599.00, 499.00,
   'Official-style petrol pump attendant shirt in BPCL blue and yellow colour combination. Full sleeves, mandarin collar, brass buttons, chest logo patch holder. Sizes S to 3XL. Washable polyester-cotton blend.',
   ARRAY['https://images.unsplash.com/photo-1594938298603-c8148c4b984b?w=500&q=80'],
   200, '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 4.6, 143),

  ('33333333-0000-0000-0000-000000000002',
   'HP Attendant Uniform Shirt — Navy Blue (Half Sleeves)',
   'UniWear Pro',
   549.00, NULL,
   'Half-sleeve attendant uniform shirt in Hindustan Petroleum navy blue. Embroidered logo, reinforced cuffs, breathable fabric. Ideal for warm weather operations. Available in S to 3XL.',
   ARRAY['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500&q=80'],
   175, '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 4.4, 98),

  ('33333333-0000-0000-0000-000000000003',
   'Indian Oil Attendant Full Uniform Set (Shirt + Trouser)',
   'StationWear India',
   1299.00, 1099.00,
   'Complete IndianOil-style uniform set — shirt and matching trouser in red and white. Durable fabric, multiple pockets, reflective piping on trouser. Sizes 28 to 44 waist. Set of 2 pieces.',
   ARRAY['https://images.unsplash.com/photo-1594938298603-c8148c4b984b?w=500&q=80'],
   120, '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 4.7, 212),

  ('33333333-0000-0000-0000-000000000004',
   'Petrol Pump Attendant Cap — Navy Blue with HP Logo Patch',
   'CapMaster India',
   249.00, 199.00,
   'Navy blue cotton twill cap with red piping along brim. Includes removable HP-style woven logo patch. Adjustable velcro back strap. One size fits all. Suitable for all petroleum company staff.',
   ARRAY['https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500&q=80'],
   500, '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000003', 4.5, 327),

  ('33333333-0000-0000-0000-000000000005',
   'Bulk Uniform Pack — 10 Attendant Shirts (Mixed Sizes)',
   'UniWear Pro',
   4999.00, 4499.00,
   'Economy bulk pack of 10 petrol pump attendant shirts. Blue and yellow colour, mandarin collar, logo patch area. Sizes as per order: mention S/M/L/XL/XXL split in order notes. Ideal for new stations.',
   ARRAY['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500&q=80'],
   50, '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 4.8, 61),

-- Products: Safety Signboards
  ('33333333-0000-0000-0000-000000000006',
   'Complete Petrol Station Signboard Set — 9 Boards (Hindi + English)',
   'SafeSign India',
   1999.00, 1699.00,
   'Full set of 9 bilingual (Hindi-English) safety signboards for petrol pumps: No Smoking, Mobile Off, Danger, Drinking Water, Office, Electrical Room, Free Air, Toilet Gents, Toilet Ladies. ACP board, UV printed. Size 12×9 inches each.',
   ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80'],
   300, '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000004', 4.8, 287),

  ('33333333-0000-0000-0000-000000000007',
   'No Smoking — Bilingual Safety Board (Hindi + English)',
   'SafeSign India',
   299.00, 249.00,
   'धूम्रपान निषेध / No Smoking bilingual ACP signboard. Blue and orange colour scheme, UV printed with no-smoking icon. Weather-resistant, suitable for indoor and outdoor use. Size: 12×9 inches.',
   ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80'],
   600, '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000004', 4.7, 183),

  ('33333333-0000-0000-0000-000000000008',
   'Danger / खतरा Warning Board — Red & White',
   'SafeSign India',
   349.00, 299.00,
   'खतरा / DANGER bilingual warning board with skull-and-crossbones icon. Bright red background, high-visibility white text. ACP board, UV-resistant coating. Size: 12×9 inches. Mandatory for fuel storage areas.',
   ARRAY['https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?w=500&q=80'],
   450, '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000005', 4.9, 241),

  ('33333333-0000-0000-0000-000000000009',
   'Mobile Off / मोबाईल निषेध Safety Board',
   'SafeSign India',
   249.00, NULL,
   'मोबाईल निषेध / Mobile Off bilingual signboard. Essential safety board for all petrol pump forecourts. Blue and orange, with mobile phone crossed-out icon. ACP board, UV printed, 12×9 inches.',
   ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80'],
   550, '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000004', 4.6, 165),

  ('33333333-0000-0000-0000-000000000010',
   'Free Air / मुफ्त हवा — Station Board',
   'SafeSign India',
   249.00, 199.00,
   'मुफ्त हवा / Free Air bilingual board. Blue and orange with tyre/air wave icon. Informs customers of free air facility at your station. ACP board, 12×9 inches, UV-resistant print.',
   ARRAY['https://images.unsplash.com/photo-1615906655593-ad0386982a0f?w=500&q=80'],
   400, '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000004', 4.5, 129),

-- Products: Engine Oils & Lubricants
  ('33333333-0000-0000-0000-000000000011',
   'Castrol GTX 10W-30 Engine Oil 5L',
   'Castrol',
   1299.00, 1099.00,
   'Castrol GTX conventional motor oil with Fluid Titanium Technology. Protects against sludge and deposits. Recommended for petrol and diesel engines. 5 litre pack.',
   ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80'],
   150, '11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000007', 4.5, 128),

  ('33333333-0000-0000-0000-000000000012',
   'Mobil 1 0W-40 Full Synthetic Engine Oil 4L',
   'Mobil',
   2499.00, 2199.00,
   'Mobil 1 full synthetic motor oil for maximum engine protection. Outstanding performance under extreme conditions. 4 litre pack, suitable for all modern petrol and diesel engines.',
   ARRAY['https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?w=500&q=80'],
   85, '11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000006', 4.8, 256),

  ('33333333-0000-0000-0000-000000000013',
   'Shell Helix Ultra 5W-40 Fully Synthetic 4L',
   'Shell',
   2299.00, NULL,
   'Shell Helix Ultra with PurePlus Technology — converted from natural gas for a purer base oil. Best-in-class engine protection. 4 litre pack.',
   ARRAY['https://images.unsplash.com/photo-1615906655593-ad0386982a0f?w=500&q=80'],
   120, '11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000006', 4.7, 189),

  ('33333333-0000-0000-0000-000000000014',
   'WD-40 Multi-Use Lubricant Spray 450ml',
   'WD-40',
   399.00, 349.00,
   'WD-40 Multi-Use Product: protects metal from rust, penetrates stuck parts, displaces moisture, and lubricates moving parts. Essential for every petrol station toolbox. 450ml spray can.',
   ARRAY['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&q=80'],
   400, '11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000007', 4.8, 423),

-- Products: Oil Cans & Dispensing
  ('33333333-0000-0000-0000-000000000015',
   'Steel Oil Dispensing Can — 2 Litre with Flexible Spout',
   'IndoCan Pro',
   449.00, 399.00,
   'Professional-grade 2-litre steel oil dispensing can with long flexible spout for precise pouring. Leak-proof lid, corrosion-resistant coating inside. Ideal for engine oil top-ups at petrol stations.',
   ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80'],
   250, '11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000008', 4.6, 94),

  ('33333333-0000-0000-0000-000000000016',
   'Plastic Oil Measuring Jug 1 Litre — Graduated',
   'IndoCan Pro',
   149.00, 129.00,
   'Transparent graduated plastic measuring jug, 1-litre capacity. Clear markings in 100ml increments. Fuel and oil resistant. Perfect for accurate dispensing at petrol station service bays.',
   ARRAY['https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?w=500&q=80'],
   600, '11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000008', 4.3, 67),

  ('33333333-0000-0000-0000-000000000017',
   'Drum Tap / Barrel Dispenser for 200L Oil Drum',
   'DrumTech India',
   799.00, 699.00,
   'Heavy-duty drum tap with lever handle for 200-litre oil and lubricant drums. Fits standard 2-inch bung openings. Brass nozzle, drip-free valve. Essential for bulk oil dispensing at petrol stations.',
   ARRAY['https://images.unsplash.com/photo-1615906655593-ad0386982a0f?w=500&q=80'],
   180, '11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000009', 4.7, 112),

  ('33333333-0000-0000-0000-000000000018',
   'Hand Pump Oil Dispenser for 20L / 50L Cans',
   'DrumTech India',
   1299.00, 1099.00,
   'Manual hand-pump dispenser for 20–50 litre oil cans and containers. Rotary handle, 1-litre per stroke output, 1-metre flexible hose with nozzle. Fits standard can openings. Reduces spills and wastage.',
   ARRAY['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&q=80'],
   130, '11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000009', 4.5, 78),

-- Products: Flooring & Mats
  ('33333333-0000-0000-0000-000000000019',
   'Blue PVC Coin-Pattern Rubber Mat Roll — 1m × 5m',
   'FloorGuard Pro',
   1499.00, 1299.00,
   'Heavy-duty blue PVC rubber mat with raised coin pattern for anti-slip safety. 1 metre wide × 5 metre roll. 3mm thickness, oil and fuel resistant. Ideal for petrol station forecourts, service bays, and offices.',
   ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80'],
   100, '11111111-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000010', 4.6, 87),

  ('33333333-0000-0000-0000-000000000020',
   'Heavy-Duty PVC Rubber Mat Roll — 2m × 10m (Commercial)',
   'FloorGuard Pro',
   5999.00, 5499.00,
   'Commercial-grade 2m × 10m blue PVC rubber mat roll. Coin-pattern anti-slip surface. 4mm thickness, resistant to oil, petrol, diesel and water. Suitable for large forecourts, workshops and canopies.',
   ARRAY['https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?w=500&q=80'],
   40, '11111111-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000010', 4.7, 45),

  ('33333333-0000-0000-0000-000000000021',
   'Anti-Fatigue Standing Mat — 60cm × 90cm (Cashier/Attendant)',
   'FloorGuard Pro',
   849.00, 749.00,
   'Ergonomic anti-fatigue mat for staff who stand for long periods. 60×90cm, 15mm cushioned foam with PVC top layer. Reduces leg and back fatigue. Ideal for cashier counters and service desks at petrol stations.',
   ARRAY['https://images.unsplash.com/photo-1615906655593-ad0386982a0f?w=500&q=80'],
   200, '11111111-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000010', 4.4, 63),

-- Products: Safety & PPE
  ('33333333-0000-0000-0000-000000000022',
   'Petrol Station Hi-Vis Safety Vest — Orange (Pack of 5)',
   'SafeGuard India',
   699.00, 599.00,
   'High-visibility orange safety vests with reflective silver strips. Class 2 reflective tape, mesh back for ventilation. Pack of 5 vests. Sizes M to XXL. Essential PPE for forecourt staff at petrol stations.',
   ARRAY['https://images.unsplash.com/photo-1594938298603-c8148c4b984b?w=500&q=80'],
   300, '11111111-0000-0000-0000-000000000006', NULL, 4.5, 134),

  ('33333333-0000-0000-0000-000000000023',
   'Nitrile Oil-Resistant Gloves — Pack of 12 Pairs',
   'SafeGuard India',
   349.00, 299.00,
   'Heavy-duty nitrile gloves resistant to oil, petrol, diesel, and grease. Textured grip palm, beaded cuff for drip resistance. Pack of 12 pairs (sizes M/L/XL). Essential for dispensing and maintenance work.',
   ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80'],
   500, '11111111-0000-0000-0000-000000000006', NULL, 4.6, 198),

  ('33333333-0000-0000-0000-000000000024',
   'Fire Extinguisher Stand — Wall Mount (Fits 5kg/6kg)',
   'SafeGuard India',
   499.00, 449.00,
   'Heavy-gauge steel fire extinguisher mounting bracket and stand. Fits 5kg and 6kg extinguisher cylinders. Powder-coated red finish. Wall-mount with two bolts. Mandatory equipment for petrol stations.',
   ARRAY['https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?w=500&q=80'],
   220, '11111111-0000-0000-0000-000000000006', NULL, 4.8, 156),

-- Products: Fuel Additives
  ('33333333-0000-0000-0000-000000000025',
   'Liqui Moly Super Diesel Additive 250ml',
   'Liqui Moly',
   999.00, 899.00,
   'Cleans and protects the entire diesel fuel system. Improves engine performance and throttle response. Increases lubricity of low-sulphur diesel. One bottle treats up to 70 litres of diesel.',
   ARRAY['https://images.unsplash.com/photo-1615906655593-ad0386982a0f?w=500&q=80'],
   140, '11111111-0000-0000-0000-000000000007', NULL, 4.7, 198),

  ('33333333-0000-0000-0000-000000000026',
   'STP Octane Booster for Petrol Engines 354ml',
   'STP',
   799.00, 699.00,
   'Increases octane levels and reduces engine knock in all petrol engines. Cleans fuel injectors and carburettors. One bottle per 40-litre tank. Regular use improves fuel efficiency and engine smoothness.',
   ARRAY['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&q=80'],
   175, '11111111-0000-0000-0000-000000000007', NULL, 4.3, 89),

-- Products: Station Accessories
  ('33333333-0000-0000-0000-000000000027',
   'Petrol Station ID Card Holder with Lanyard — Pack of 50',
   'UniWear Pro',
   599.00, 499.00,
   'Clear PVC ID card holders with vertical orientation. Includes 50 lanyards with safety breakaway clip. Suitable for all standard ID card sizes. Essential for staff identification at petrol stations.',
   ARRAY['https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500&q=80'],
   400, '11111111-0000-0000-0000-000000000008', NULL, 4.4, 73),

  ('33333333-0000-0000-0000-000000000028',
   'Digital Tyre Pressure Gauge — Forecourt Grade',
   'GaugePro India',
   849.00, 749.00,
   'Professional digital tyre pressure gauge for petrol station forecourts. Range 0–200 PSI / 0–14 bar. Large LCD display, auto-off, backlight. Includes carry case and batteries. Calibrated accuracy ±0.5%.',
   ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80'],
   150, '11111111-0000-0000-0000-000000000008', NULL, 4.7, 112),

  ('33333333-0000-0000-0000-000000000029',
   'Petrol Station Token/Bill Receipt Book — Pack of 10',
   'OfficeSupplies India',
   199.00, 169.00,
   'Pre-printed petrol station receipt/token book with duplicate carbon copy. 100 pages per book, pack of 10 books. Fields: date, vehicle number, fuel type, quantity, amount, attendant signature. Standard A6 size.',
   ARRAY['https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?w=500&q=80'],
   800, '11111111-0000-0000-0000-000000000008', NULL, 4.2, 54),

  ('33333333-0000-0000-0000-000000000030',
   'Windshield Wiper Bucket & Squeegee Set',
   'StationTools India',
   299.00, 249.00,
   'Customer service windshield cleaning set — 10-litre blue bucket + 45cm professional squeegee with microfibre strip. Durable plastic bucket with fill-line markings. Squeegee has rubber blade and hook for bucket hanging.',
   ARRAY['https://images.unsplash.com/photo-1615906655593-ad0386982a0f?w=500&q=80'],
   350, '11111111-0000-0000-0000-000000000008', NULL, 4.5, 88);

-- Dummy Customers
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, created_at) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'rahul.sharma@gmail.com', '$2b$10$dummy', 'Rahul', 'Sharma', '+91 98100 11111', 'customer', NOW() - INTERVAL '120 days'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'priya.mehta@gmail.com', '$2b$10$dummy', 'Priya', 'Mehta', '+91 98200 22222', 'customer', NOW() - INTERVAL '95 days'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'amit.verma@yahoo.com', '$2b$10$dummy', 'Amit', 'Verma', '+91 98300 33333', 'customer', NOW() - INTERVAL '78 days'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'sunita.patel@gmail.com', '$2b$10$dummy', 'Sunita', 'Patel', '+91 98400 44444', 'customer', NOW() - INTERVAL '60 days'),
  ('aaaaaaaa-0000-0000-0000-000000000005', 'kiran.rao@gmail.com', '$2b$10$dummy', 'Kiran', 'Rao', '+91 98500 55555', 'customer', NOW() - INTERVAL '45 days'),
  ('aaaaaaaa-0000-0000-0000-000000000006', 'deepak.singh@hotmail.com', '$2b$10$dummy', 'Deepak', 'Singh', '+91 98600 66666', 'customer', NOW() - INTERVAL '30 days'),
  ('aaaaaaaa-0000-0000-0000-000000000007', 'ananya.gupta@gmail.com', '$2b$10$dummy', 'Ananya', 'Gupta', '+91 98700 77777', 'customer', NOW() - INTERVAL '22 days'),
  ('aaaaaaaa-0000-0000-0000-000000000008', 'rohit.kumar@gmail.com', '$2b$10$dummy', 'Rohit', 'Kumar', '+91 98800 88888', 'customer', NOW() - INTERVAL '15 days'),
  ('aaaaaaaa-0000-0000-0000-000000000009', 'meera.iyer@gmail.com', '$2b$10$dummy', 'Meera', 'Iyer', '+91 98900 99999', 'customer', NOW() - INTERVAL '8 days'),
  ('aaaaaaaa-0000-0000-0000-000000000010', 'vikram.nair@gmail.com', '$2b$10$dummy', 'Vikram', 'Nair', '+91 99000 10101', 'customer', NOW() - INTERVAL '2 days');

-- Dummy Orders
INSERT INTO orders (id, user_id, status, total_amount, payment_method, order_number, created_at) VALUES
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'delivered', 3498.00, 'Cash on Delivery', 'PW-20240101', NOW() - INTERVAL '100 days'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'delivered', 1699.00, 'Cash on Delivery', 'PW-20240102', NOW() - INTERVAL '85 days'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000003', 'delivered', 1099.00, 'Cash on Delivery', 'PW-20240103', NOW() - INTERVAL '70 days'),
  ('bbbbbbbb-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000004', 'shipped', 848.00, 'Cash on Delivery', 'PW-20240104', NOW() - INTERVAL '10 days'),
  ('bbbbbbbb-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000005', 'shipped', 5999.00, 'Cash on Delivery', 'PW-20240105', NOW() - INTERVAL '7 days'),
  ('bbbbbbbb-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000006', 'ordered', 2198.00, 'Cash on Delivery', 'PW-20240106', NOW() - INTERVAL '3 days'),
  ('bbbbbbbb-0000-0000-0000-000000000007', 'aaaaaaaa-0000-0000-0000-000000000007', 'ordered', 499.00, 'Cash on Delivery', 'PW-20240107', NOW() - INTERVAL '1 day'),
  ('bbbbbbbb-0000-0000-0000-000000000008', 'aaaaaaaa-0000-0000-0000-000000000001', 'delivered', 2199.00, 'Cash on Delivery', 'PW-20240108', NOW() - INTERVAL '55 days'),
  ('bbbbbbbb-0000-0000-0000-000000000009', 'aaaaaaaa-0000-0000-0000-000000000003', 'cancelled', 799.00, 'Cash on Delivery', 'PW-20240109', NOW() - INTERVAL '40 days'),
  ('bbbbbbbb-0000-0000-0000-000000000010', 'aaaaaaaa-0000-0000-0000-000000000008', 'ordered', 6698.00, 'Cash on Delivery', 'PW-20240110', NOW() - INTERVAL '1 day');

-- Order Items
INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES
  ('bbbbbbbb-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000006', 1, 1699.00),
  ('bbbbbbbb-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 2, 499.00),
  ('bbbbbbbb-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000004', 3, 199.00),
  ('bbbbbbbb-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000006', 1, 1699.00),
  ('bbbbbbbb-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000012', 1, 1099.00),
  ('bbbbbbbb-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000007', 2, 249.00),
  ('bbbbbbbb-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000010', 1, 199.00),
  ('bbbbbbbb-0000-0000-0000-000000000005', '33333333-0000-0000-0000-000000000020', 1, 5499.00),
  ('bbbbbbbb-0000-0000-0000-000000000005', '33333333-0000-0000-0000-000000000025', 1, 899.00),
  ('bbbbbbbb-0000-0000-0000-000000000006', '33333333-0000-0000-0000-000000000012', 1, 2199.00),
  ('bbbbbbbb-0000-0000-0000-000000000006', '33333333-0000-0000-0000-000000000016', 1, 129.00),
  ('bbbbbbbb-0000-0000-0000-000000000007', '33333333-0000-0000-0000-000000000002', 1, 499.00),
  ('bbbbbbbb-0000-0000-0000-000000000008', '33333333-0000-0000-0000-000000000012', 1, 2199.00),
  ('bbbbbbbb-0000-0000-0000-000000000009', '33333333-0000-0000-0000-000000000026', 1, 699.00),
  ('bbbbbbbb-0000-0000-0000-000000000010', '33333333-0000-0000-0000-000000000019', 2, 1299.00),
  ('bbbbbbbb-0000-0000-0000-000000000010', '33333333-0000-0000-0000-000000000003', 1, 1099.00),
  ('bbbbbbbb-0000-0000-0000-000000000010', '33333333-0000-0000-0000-000000000006', 1, 1699.00),
  ('bbbbbbbb-0000-0000-0000-000000000010', '33333333-0000-0000-0000-000000000022', 1, 599.00);

-- Banners
INSERT INTO banners (title, subtitle, image_url, active) VALUES
  ('Petrol Station Uniforms', 'BPCL, HP & IOC style attendant uniforms — bulk discounts available', 'https://images.unsplash.com/photo-1594938298603-c8148c4b984b?w=1200&q=80', true),
  ('Safety Signboards Set', 'Complete 9-board bilingual set — Hindi & English', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80', true),
  ('PVC Rubber Mats', 'Anti-slip blue coin-pattern mats for forecourts & offices', 'https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?w=1200&q=80', true);

-- Coupons
INSERT INTO coupons (code, discount_type, discount_value, active, expiry, min_order_value) VALUES
  ('PETRO10', 'percentage', 10.00, true, NOW() + INTERVAL '1 year', 500.00),
  ('FLAT200', 'flat', 200.00, true, NOW() + INTERVAL '1 year', 1000.00),
  ('NEWUSER', 'percentage', 15.00, true, NOW() + INTERVAL '6 months', 0.00),
  ('BULK500', 'flat', 500.00, true, NOW() + INTERVAL '1 year', 5000.00);

-- FAQs
INSERT INTO faqs (question, answer, sort_order) VALUES
  ('What types of products do you sell?', 'We supply everything a petrol station needs: staff uniforms, safety signboards (bilingual Hindi-English), engine oils, oil dispensing cans, rubber flooring mats, safety PPE, fuel additives, and station accessories.', 1),
  ('Do you supply bulk orders for new petrol stations?', 'Yes! We specialise in bulk orders for new station setups. Contact us for custom pricing on uniform packs, signboard sets, and flooring rolls. Minimum order quantities apply.', 2),
  ('Are your safety signboards BIS/OISD compliant?', 'Our signboards follow OISD (Oil Industry Safety Directorate) guidelines and are UV printed on ACP (Aluminium Composite Panel) boards for durability in outdoor conditions.', 3),
  ('Do you offer free delivery?', 'Yes! Free delivery on all orders above ₹999. Orders below ₹999 attract a flat ₹50 delivery charge. Heavy items (mat rolls, drums) may have additional freight charges.', 4),
  ('What is your return policy?', 'We accept returns within 7 days of delivery for items in original unused condition. Custom-printed or personalised products cannot be returned.', 5),
  ('How long does delivery take?', 'Standard delivery 3–5 business days. Major cities (Delhi, Mumbai, Chennai, Kolkata, Bangalore, Hyderabad) receive delivery in 2–3 days.', 6),
  ('Can I get uniforms with our station logo printed?', 'Yes, we offer custom logo printing/embroidery on uniforms. Minimum order 10 pieces for custom branding. Contact support for artwork requirements and pricing.', 7),
  ('Do you accept Cash on Delivery?', 'Yes, COD available across India. We also accept UPI, cards, and net banking via Razorpay.', 8);

-- Settings
INSERT INTO settings (key, value) VALUES
  ('shipping_fee', '50'),
  ('shipping_threshold', '999'),
  ('app_name', 'PetroWorld'),
  ('support_email', 'support@petroworld.in'),
  ('support_phone', '+91 98765 43210'),
  ('razorpay_enabled', 'false'),
  ('currency', 'INR'),
  ('currency_symbol', '₹');

-- Delivery Estimates
INSERT INTO delivery_estimates (pincode_prefix, min_days, max_days, description) VALUES
  ('110', 1, 2, 'Delhi NCR — Express delivery'),
  ('400', 2, 3, 'Mumbai — Fast delivery'),
  ('600', 2, 3, 'Chennai — Fast delivery'),
  ('700', 2, 3, 'Kolkata — Fast delivery'),
  ('500', 3, 5, 'Hyderabad — Standard delivery'),
  ('560', 3, 5, 'Bangalore — Standard delivery'),
  ('380', 3, 5, 'Ahmedabad — Standard delivery'),
  ('411', 3, 5, 'Pune — Standard delivery');
