-- ==========================================
-- StayManager PostgreSQL Supabase Schema DDL
-- ==========================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables to clear any outdated definitions, constraints, or schemas (safe as remote tables are empty)
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS bed_bookings CASCADE;
DROP TABLE IF EXISTS beds CASCADE;
DROP TABLE IF EXISTS dormitories CASCADE;
DROP TABLE IF EXISTS hall_bookings CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;

-- 1. ROOMS TABLE
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_number TEXT NOT NULL UNIQUE,
    has_attached_bathroom BOOLEAN DEFAULT true,
    current_status TEXT NOT NULL DEFAULT 'available' CHECK (current_status IN ('available', 'booked', 'checked_in', 'checked_out', 'cleaning')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. BOOKINGS TABLE
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    phone_number TEXT,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    check_in_date TIMESTAMP WITH TIME ZONE NOT NULL,
    check_out_date TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'checked_in', 'checked_out', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. HALL BOOKINGS TABLE
CREATE TABLE hall_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    phone_number TEXT,
    event_date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    purpose TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. DORMITORIES TABLE
CREATE TABLE dormitories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. BEDS TABLE
CREATE TABLE beds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dormitory_id UUID NOT NULL REFERENCES dormitories(id) ON DELETE CASCADE,
    bed_number TEXT NOT NULL,
    current_status TEXT NOT NULL DEFAULT 'available' CHECK (current_status IN ('available', 'booked', 'checked_in', 'checked_out', 'cleaning')),
    row_index INTEGER NOT NULL,
    col_index INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(dormitory_id, bed_number)
);

-- 6. BED BOOKINGS TABLE
CREATE TABLE bed_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    phone_number TEXT,
    bed_id UUID NOT NULL REFERENCES beds(id) ON DELETE CASCADE,
    check_in_date TIMESTAMP WITH TIME ZONE NOT NULL,
    check_out_date TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'checked_in', 'checked_out', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. STAFF TABLE
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    phone_number TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. ATTENDANCE TABLE
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(staff_id, date)
);

-- Enable Row-Level Security (RLS) on all tables and configure public CRUD policies
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hall_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE dormitories ENABLE ROW LEVEL SECURITY;
ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE bed_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- 1. ROOMS POLICIES
DROP POLICY IF EXISTS "Enable read access for all users" ON rooms;
DROP POLICY IF EXISTS "Enable insert access for all users" ON rooms;
DROP POLICY IF EXISTS "Enable update access for all users" ON rooms;
DROP POLICY IF EXISTS "Enable delete access for all users" ON rooms;

CREATE POLICY "Enable read access for all users" ON rooms FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON rooms FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete access for all users" ON rooms FOR DELETE USING (true);

-- 2. BOOKINGS POLICIES
DROP POLICY IF EXISTS "Enable read access for all users" ON bookings;
DROP POLICY IF EXISTS "Enable insert access for all users" ON bookings;
DROP POLICY IF EXISTS "Enable update access for all users" ON bookings;
DROP POLICY IF EXISTS "Enable delete access for all users" ON bookings;

CREATE POLICY "Enable read access for all users" ON bookings FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON bookings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete access for all users" ON bookings FOR DELETE USING (true);

-- 3. HALL BOOKINGS POLICIES
DROP POLICY IF EXISTS "Enable read access for all users" ON hall_bookings;
DROP POLICY IF EXISTS "Enable insert access for all users" ON hall_bookings;
DROP POLICY IF EXISTS "Enable update access for all users" ON hall_bookings;
DROP POLICY IF EXISTS "Enable delete access for all users" ON hall_bookings;

CREATE POLICY "Enable read access for all users" ON hall_bookings FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON hall_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON hall_bookings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete access for all users" ON hall_bookings FOR DELETE USING (true);

-- 4. DORMITORIES POLICIES
DROP POLICY IF EXISTS "Enable read access for all users" ON dormitories;
DROP POLICY IF EXISTS "Enable insert access for all users" ON dormitories;
DROP POLICY IF EXISTS "Enable update access for all users" ON dormitories;
DROP POLICY IF EXISTS "Enable delete access for all users" ON dormitories;

CREATE POLICY "Enable read access for all users" ON dormitories FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON dormitories FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON dormitories FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete access for all users" ON dormitories FOR DELETE USING (true);

-- 5. BEDS POLICIES
DROP POLICY IF EXISTS "Enable read access for all users" ON beds;
DROP POLICY IF EXISTS "Enable insert access for all users" ON beds;
DROP POLICY IF EXISTS "Enable update access for all users" ON beds;
DROP POLICY IF EXISTS "Enable delete access for all users" ON beds;

CREATE POLICY "Enable read access for all users" ON beds FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON beds FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON beds FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete access for all users" ON beds FOR DELETE USING (true);

-- 6. BED BOOKINGS POLICIES
DROP POLICY IF EXISTS "Enable read access for all users" ON bed_bookings;
DROP POLICY IF EXISTS "Enable insert access for all users" ON bed_bookings;
DROP POLICY IF EXISTS "Enable update access for all users" ON bed_bookings;
DROP POLICY IF EXISTS "Enable delete access for all users" ON bed_bookings;

CREATE POLICY "Enable read access for all users" ON bed_bookings FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON bed_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON bed_bookings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete access for all users" ON bed_bookings FOR DELETE USING (true);

-- 7. STAFF POLICIES
DROP POLICY IF EXISTS "Enable read access for all users" ON staff;
DROP POLICY IF EXISTS "Enable insert access for all users" ON staff;
DROP POLICY IF EXISTS "Enable update access for all users" ON staff;
DROP POLICY IF EXISTS "Enable delete access for all users" ON staff;

CREATE POLICY "Enable read access for all users" ON staff FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON staff FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON staff FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete access for all users" ON staff FOR DELETE USING (true);

-- 8. ATTENDANCE POLICIES
DROP POLICY IF EXISTS "Enable read access for all users" ON attendance;
DROP POLICY IF EXISTS "Enable insert access for all users" ON attendance;
DROP POLICY IF EXISTS "Enable update access for all users" ON attendance;
DROP POLICY IF EXISTS "Enable delete access for all users" ON attendance;

CREATE POLICY "Enable read access for all users" ON attendance FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON attendance FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON attendance FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete access for all users" ON attendance FOR DELETE USING (true);


-- Enable Postgres replication for realtime updates on all tables in Supabase Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE hall_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE dormitories;
ALTER PUBLICATION supabase_realtime ADD TABLE beds;
ALTER PUBLICATION supabase_realtime ADD TABLE bed_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE staff;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;

-- ==========================================
-- Sample Seed Data
-- ==========================================

-- Seed Rooms
INSERT INTO rooms (id, room_number, has_attached_bathroom, current_status, is_active)
VALUES 
('00000000-0000-0000-0000-000000000101', '101', true, 'available', true),
('00000000-0000-0000-0000-000000000102', '102', false, 'booked', true),
('00000000-0000-0000-0000-000000000103', '103', true, 'checked_in', true),
('00000000-0000-0000-0000-000000000104', '104', false, 'checked_out', true),
('00000000-0000-0000-0000-000000000105', '105', true, 'cleaning', true),
('00000000-0000-0000-0000-000000000201', '201', true, 'available', true),
('00000000-0000-0000-0000-000000000202', '202', false, 'available', true),
('00000000-0000-0000-0000-000000000203', '203', false, 'available', true),
('00000000-0000-0000-0000-000000000204', '204', true, 'available', true),
('00000000-0000-0000-0000-000000000205', '205', false, 'available', true)
ON CONFLICT (room_number) DO UPDATE SET
    has_attached_bathroom = EXCLUDED.has_attached_bathroom,
    current_status = EXCLUDED.current_status,
    is_active = EXCLUDED.is_active;

-- Seed Room Bookings
INSERT INTO bookings (id, customer_name, phone_number, room_id, check_in_date, check_out_date, status)
VALUES
('11111111-1111-1111-1111-111111111111', 'Alice Johnson', '+91 9876543210', '00000000-0000-0000-0000-000000000102', NOW() + INTERVAL '1 day', NOW() + INTERVAL '3 days', 'booked'),
('11111111-1111-1111-1111-111111111112', 'Bob Smith', '+91 9123456789', '00000000-0000-0000-0000-000000000103', NOW(), NOW() + INTERVAL '2 days', 'checked_in'),
('11111111-1111-1111-1111-111111111113', 'Charlie Brown', '+91 9998887776', '00000000-0000-0000-0000-000000000104', NOW() - INTERVAL '2 days', NOW(), 'checked_out')
ON CONFLICT (id) DO NOTHING;

-- Seed Hall Bookings
INSERT INTO hall_bookings (id, customer_name, phone_number, event_date, start_time, end_time, purpose, status)
VALUES
('22222222-2222-2222-2222-222222222221', 'KSEB Annual Union Meeting', '+91 9898989898', CURRENT_DATE, '09:00', '13:00', 'Annual general assembly and staff discussion', 'confirmed'),
('22222222-2222-2222-2222-222222222222', 'Retirement Celebration - Anil Kumar', '+91 9797979797', CURRENT_DATE + 1, '14:00', '18:00', 'Farewell ceremony and dinner', 'confirmed')
ON CONFLICT (id) DO NOTHING;

-- Seed Dormitories
INSERT INTO dormitories (id, name, is_active)
VALUES
('33333333-3333-3333-3333-333333333331', 'Gents Executive Dormitory', true),
('33333333-3333-3333-3333-333333333332', 'Ladies Executive Dormitory', true)
ON CONFLICT (name) DO UPDATE SET is_active = EXCLUDED.is_active;

-- Seed Beds
INSERT INTO beds (id, dormitory_id, bed_number, current_status, row_index, col_index, is_active)
VALUES
('bbbbbbbb-bbbb-4bbb-b000-000000000000', '33333333-3333-3333-3333-333333333331', 'G-A1', 'available', 0, 0, true),
('bbbbbbbb-bbbb-4bbb-b000-000000000001', '33333333-3333-3333-3333-333333333331', 'G-A2', 'booked', 0, 1, true),
('bbbbbbbb-bbbb-4bbb-b000-000000000002', '33333333-3333-3333-3333-333333333331', 'G-A3', 'available', 0, 2, true),
('bbbbbbbb-bbbb-4bbb-b000-000000000003', '33333333-3333-3333-3333-333333333331', 'G-A4', 'available', 0, 3, true),
('bbbbbbbb-bbbb-4bbb-b000-000000000012', '33333333-3333-3333-3333-333333333331', 'G-B3', 'checked_in', 1, 2, true),
('bbbbbbbb-bbbb-4bbb-b000-000000000020', '33333333-3333-3333-3333-333333333331', 'G-C1', 'cleaning', 2, 0, true),
('bbbbbbbb-bbbb-4bbb-b100-000000000000', '33333333-3333-3333-3333-333333333332', 'L-A1', 'checked_in', 0, 0, true)
ON CONFLICT (dormitory_id, bed_number) DO UPDATE SET
    current_status = EXCLUDED.current_status,
    row_index = EXCLUDED.row_index,
    col_index = EXCLUDED.col_index,
    is_active = EXCLUDED.is_active;

-- Seed Bed Bookings
INSERT INTO bed_bookings (id, customer_name, phone_number, bed_id, check_in_date, check_out_date, status)
VALUES
('44444444-4444-4444-4444-444444444441', 'Rahul Verma', '+91 8887776665', 'bbbbbbbb-bbbb-4bbb-b000-000000000001', NOW() + INTERVAL '1 day', NOW() + INTERVAL '3 days', 'booked'),
('44444444-4444-4444-4444-444444444442', 'Suresh Menon', '+91 7776665554', 'bbbbbbbb-bbbb-4bbb-b000-000000000012', NOW(), NOW() + INTERVAL '2 days', 'checked_in'),
('44444444-4444-4444-4444-444444444443', 'Meera Nair', '+91 9665554443', 'bbbbbbbb-bbbb-4bbb-b100-000000000000', NOW(), NOW() + INTERVAL '1 day', 'checked_in')
ON CONFLICT (id) DO NOTHING;

-- Seed Staff members
INSERT INTO staff (id, name, role, phone_number, is_active)
VALUES
('55555555-5555-5555-5555-555555555551', 'Ramesh Kumar', 'General Manager', '+91 9000100010', true),
('55555555-5555-5555-5555-555555555552', 'Suresh Nair', 'Receptionist', '+91 9000200020', true),
('55555555-5555-5555-5555-555555555553', 'Sita Devi', 'Housekeeping Supervisor', '+91 9000300030', true),
('55555555-5555-5555-5555-555555555554', 'Anil Pillai', 'Security Head', '+91 9000400040', true),
('55555555-5555-5555-5555-555555555555', 'Vikram Singh', 'Maintenance Tech', '+91 9000500050', true)
ON CONFLICT (id) DO NOTHING;

-- Seed Attendance records
INSERT INTO attendance (id, staff_id, date, status)
VALUES
('66666666-6666-6666-6666-666666666661', '55555555-5555-5555-5555-555555555551', CURRENT_DATE, 'present'),
('66666666-6666-6666-6666-666666666662', '55555555-5555-5555-5555-555555555552', CURRENT_DATE, 'present'),
('66666666-6666-6666-6666-666666666663', '55555555-5555-5555-5555-555555555553', CURRENT_DATE, 'present'),
('66666666-6666-6666-6666-666666666664', '55555555-5555-5555-5555-555555555554', CURRENT_DATE, 'absent'),
('66666666-6666-6666-6666-666666666665', '55555555-5555-5555-5555-555555555555', CURRENT_DATE, 'present')
ON CONFLICT (staff_id, date) DO NOTHING;
