-- helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

-- roles
CREATE TYPE public.app_role AS ENUM ('branch_admin','super_admin');

CREATE TABLE public.branches (
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

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ta text NOT NULL DEFAULT '',
  tint text NOT NULL DEFAULT '#EAF3DD',
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_ta text NOT NULL DEFAULT '',
  category_id uuid NOT NULL REFERENCES public.categories(id),
  unit text NOT NULL CHECK (unit IN ('Kg','Gram','Nos','Litre','Ml')),
  presets numeric[] NOT NULL DEFAULT '{}',
  min_qty numeric NOT NULL DEFAULT 0.25,
  max_qty numeric NOT NULL DEFAULT 10,
  image_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cycles (
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

CREATE TABLE public.cycle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id),
  price numeric NOT NULL DEFAULT 0,
  cap_qty numeric,
  min_qty numeric,
  max_qty numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, item_id)
);

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mobile text NOT NULL UNIQUE,
  alt_mobile text,
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  delivery_mode text NOT NULL DEFAULT 'Door Delivery' CHECK (delivery_mode IN ('Door Delivery','Customer Pickup')),
  address text NOT NULL DEFAULT '',
  area text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE public.order_no_seq START 1001;

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text NOT NULL UNIQUE DEFAULT ('FNK-' || nextval('public.order_no_seq')),
  cycle_id uuid NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  delivery_mode text NOT NULL CHECK (delivery_mode IN ('Door Delivery','Customer Pickup')),
  delivery_address text NOT NULL DEFAULT '',
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

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id),
  name_en text NOT NULL,
  name_ta text NOT NULL DEFAULT '',
  unit text NOT NULL,
  qty numeric NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, item_id)
);

CREATE TABLE public.user_roles (
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

CREATE TABLE public.admin_pins (
  user_id uuid PRIMARY KEY,
  mobile text NOT NULL UNIQUE,
  pin_hash text NOT NULL,
  failed_attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_log (
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

-- role helper
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- grants: all access is through server code using the service role
GRANT ALL ON public.branches, public.categories, public.items, public.cycles, public.cycle_items,
  public.customers, public.orders, public.order_items, public.user_roles, public.admin_pins, public.audit_log
  TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.order_no_seq TO service_role;
GRANT SELECT ON public.user_roles TO authenticated;

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER t_branches_updated BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_items_updated BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_cycles_updated BEFORE UPDATE ON public.cycles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_admin_pins_updated BEFORE UPDATE ON public.admin_pins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- seed
INSERT INTO public.branches (id, name, address, whatsapp_number, support_number, pickup_address, collection_timing)
VALUES ('11111111-1111-4111-8111-111111111111','Erode','Nalla Kadai Organic, Erode','918122370430','918122370430','Nalla Kadai Organic, Perundurai Road, Erode','Tuesday 8:00 AM – 12:00 PM');

INSERT INTO public.categories (id, name, name_ta, tint, sort_order) VALUES
 ('22222222-0001-4111-8111-111111111111','Vegetables','காய்கறிகள்','#EAF3DD',1),
 ('22222222-0002-4111-8111-111111111111','Greens','கீரைகள்','#DCEBD3',2),
 ('22222222-0003-4111-8111-111111111111','Fruits','பழங்கள்','#FBE9D8',3),
 ('22222222-0004-4111-8111-111111111111','Dairy','பால் பொருட்கள்','#EFF3FA',4),
 ('22222222-0005-4111-8111-111111111111','Vegan','வீகன்','#F1EEDD',5);

INSERT INTO public.items (id, name_en, name_ta, category_id, unit, presets, min_qty, max_qty) VALUES
 ('33333333-0001-4111-8111-111111111111','Tomato','தக்காளி','22222222-0001-4111-8111-111111111111','Kg','{0.5,1,2}',0.25,10),
 ('33333333-0002-4111-8111-111111111111','Ladies Finger','வெண்டைக்காய்','22222222-0001-4111-8111-111111111111','Kg','{0.25,0.5,1}',0.25,5),
 ('33333333-0003-4111-8111-111111111111','Drumstick','முருங்கைக்காய்','22222222-0001-4111-8111-111111111111','Nos','{2,5,10}',1,25),
 ('33333333-0004-4111-8111-111111111111','Korai Kizhangu','கோரைக்கிழங்கு','22222222-0001-4111-8111-111111111111','Kg','{0.25,0.5,1}',0.25,3),
 ('33333333-0005-4111-8111-111111111111','Brinjal','கத்திரிக்காய்','22222222-0001-4111-8111-111111111111','Kg','{0.5,1,2}',0.25,5),
 ('33333333-0006-4111-8111-111111111111','Spinach','பசலைக்கீரை','22222222-0002-4111-8111-111111111111','Nos','{1,2,3}',1,10),
 ('33333333-0007-4111-8111-111111111111','Moringa Leaves','முருங்கைக்கீரை','22222222-0002-4111-8111-111111111111','Nos','{1,2}',1,10),
 ('33333333-0008-4111-8111-111111111111','Banana Poovan','பூவன் பழம்','22222222-0003-4111-8111-111111111111','Kg','{0.5,1,2}',0.5,5),
 ('33333333-0009-4111-8111-111111111111','Guava','கொய்யா','22222222-0003-4111-8111-111111111111','Kg','{0.5,1}',0.5,5),
 ('33333333-0010-4111-8111-111111111111','Cow Milk','பசு பால்','22222222-0004-4111-8111-111111111111','Litre','{0.5,1,2}',0.5,5),
 ('33333333-0011-4111-8111-111111111111','Curd','தயிர்','22222222-0004-4111-8111-111111111111','Gram','{200,500}',200,2000),
 ('33333333-0012-4111-8111-111111111111','Groundnut Oil','நிலக்கடலை எண்ணெய்','22222222-0005-4111-8111-111111111111','Litre','{0.5,1}',0.5,5);

INSERT INTO public.cycles (id, branch_id, cycle_no, open_at, close_at, delivery_date, status)
VALUES ('44444444-0001-4111-8111-111111111111','11111111-1111-4111-8111-111111111111',1, now() - interval '1 day', now() + interval '5 days', (now() + interval '7 days')::date, 'Open');

INSERT INTO public.cycle_items (cycle_id, item_id, price)
SELECT '44444444-0001-4111-8111-111111111111', id,
  CASE name_en WHEN 'Tomato' THEN 40 WHEN 'Ladies Finger' THEN 60 WHEN 'Drumstick' THEN 12
    WHEN 'Korai Kizhangu' THEN 120 WHEN 'Brinjal' THEN 45 WHEN 'Spinach' THEN 20
    WHEN 'Moringa Leaves' THEN 20 WHEN 'Banana Poovan' THEN 70 WHEN 'Guava' THEN 90
    WHEN 'Cow Milk' THEN 65 WHEN 'Curd' THEN 0.09 WHEN 'Groundnut Oil' THEN 320 END
FROM public.items;

INSERT INTO public.customers (name, mobile, branch_id, delivery_mode, address, area) VALUES
 ('Sampath','9489581122','11111111-1111-4111-8111-111111111111','Door Delivery','12, Kamarajar Street, Erode','Perundurai Road'),
 ('Lakshmi','9600012345','11111111-1111-4111-8111-111111111111','Customer Pickup','','Surampatti');