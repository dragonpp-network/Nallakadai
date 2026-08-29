-- ============================================================================
-- Fresh Nalla Kadai — Consolidated Production Database Schema
-- Compatible with Supabase PostgreSQL 15+
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helper trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Role Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('branch_admin', 'super_admin');
  END IF;
END$$;

-- 1. Branches Table
CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  whatsapp_number text NOT NULL DEFAULT '',
  support_number text NOT NULL DEFAULT '',
  pickup_address text NOT NULL DEFAULT '',
  collection_timing text NOT NULL DEFAULT '',
  show_prices boolean NOT NULL DEFAULT true,
  next_opening_note text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ta text NOT NULL DEFAULT '',
  tint text NOT NULL DEFAULT '#EAF3DD',
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Master Items Table
CREATE TABLE IF NOT EXISTS public.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_ta text NOT NULL DEFAULT '',
  category_id uuid NOT NULL REFERENCES public.categories(id),
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  unit text NOT NULL CHECK (unit IN ('Kg','Gram','Nos','Litre','Ml')),
  presets numeric[] NOT NULL DEFAULT '{}',
  min_qty numeric NOT NULL DEFAULT 0.25,
  max_qty numeric NOT NULL DEFAULT 10,
  image_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Cycles Table
CREATE TABLE IF NOT EXISTS public.cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  cycle_no int NOT NULL,
  open_at timestamptz,
  close_at timestamptz,
  delivery_date date,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Open','Closed','Delivered')),
  manual_override text CHECK (manual_override IN ('force_open','force_closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, cycle_no)
);

-- 6. Cycle Availability Items Table
CREATE TABLE IF NOT EXISTS public.cycle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  price numeric NOT NULL DEFAULT 0,
  cap_qty numeric,
  min_qty numeric,
  max_qty numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, item_id)
);

-- 7. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mobile text NOT NULL UNIQUE,
  alt_mobile text,
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  delivery_mode text NOT NULL DEFAULT 'Door Delivery' CHECK (delivery_mode IN ('Door Delivery','Customer Pickup')),
  address text NOT NULL DEFAULT '',
  area text NOT NULL DEFAULT '',
  map_link text NOT NULL DEFAULT '',
  preferred_delivery_time text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Sequence for Human-readable Order Numbers
CREATE SEQUENCE IF NOT EXISTS public.order_no_seq START 1001;

-- 8. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text NOT NULL UNIQUE DEFAULT ('FNK-' || nextval('public.order_no_seq')),
  cycle_id uuid NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  delivery_mode text NOT NULL CHECK (delivery_mode IN ('Door Delivery','Customer Pickup')),
  delivery_address text NOT NULL DEFAULT '',
  preferred_delivery_time text NOT NULL DEFAULT '',
  note text,
  status text NOT NULL DEFAULT 'Placed' CHECK (status IN ('Placed','Cancelled')),
  cancel_reason text,
  admin_entered boolean NOT NULL DEFAULT false,
  non_collected boolean NOT NULL DEFAULT false,
  non_collection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, customer_id)
);

-- 9. Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  name_en text NOT NULL,
  name_ta text NOT NULL DEFAULT '',
  unit text NOT NULL,
  qty numeric NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, item_id)
);

-- 10. Admin & Store Operator Users Table
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'branch_admin',
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 11. Legacy / compatibility user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  branch_id uuid REFERENCES public.branches(id),
  email text,
  mobile text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 12. Audit Log Table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_label text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS t_branches_updated ON public.branches;
CREATE TRIGGER t_branches_updated BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS t_admin_users_updated ON public.admin_users;
CREATE TRIGGER t_admin_users_updated BEFORE UPDATE ON public.admin_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS t_items_updated ON public.items;
CREATE TRIGGER t_items_updated BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS t_cycles_updated ON public.cycles;
CREATE TRIGGER t_cycles_updated BEFORE UPDATE ON public.cycles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS t_customers_updated ON public.customers;
CREATE TRIGGER t_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS t_orders_updated ON public.orders;
CREATE TRIGGER t_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;
