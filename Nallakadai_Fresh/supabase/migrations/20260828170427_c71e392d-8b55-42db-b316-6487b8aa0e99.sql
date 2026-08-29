CREATE TABLE public.suppliers (
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

GRANT ALL ON public.suppliers TO service_role;

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER t_suppliers_updated BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.items ADD COLUMN supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;

ALTER TABLE public.customers
  ADD COLUMN map_link text NOT NULL DEFAULT '',
  ADD COLUMN preferred_delivery_time text NOT NULL DEFAULT '';

ALTER TABLE public.orders
  ADD COLUMN preferred_delivery_time text NOT NULL DEFAULT '';