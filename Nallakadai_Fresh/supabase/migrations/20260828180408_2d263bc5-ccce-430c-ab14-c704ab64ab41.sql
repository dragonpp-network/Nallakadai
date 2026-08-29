ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_cycle_id_customer_id_key;

-- One ACTIVE order per customer per cycle; cancelled orders keep history without blocking revisions.
CREATE UNIQUE INDEX IF NOT EXISTS orders_cycle_customer_active_key
  ON public.orders (cycle_id, customer_id)
  WHERE status = 'Placed';