
-- Helper: any admin role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;

-- Catalogue / operational tables: admins manage, no anon access
CREATE POLICY "Admins manage branches" ON public.branches FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage items" ON public.items FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage suppliers" ON public.suppliers FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage cycles" ON public.cycles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage cycle items" ON public.cycle_items FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage customers" ON public.customers FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage orders" ON public.orders FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage order items" ON public.order_items FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Audit log: admins read only; writes stay server-side (service role)
CREATE POLICY "Admins read audit log" ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Admin PIN: owner-scoped only
CREATE POLICY "Admins read own pin" ON public.admin_pins FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Admins insert own pin" ON public.admin_pins FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins update own pin" ON public.admin_pins FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Role assignments: only super admins may write
CREATE POLICY "Super admins insert roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins update roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins delete roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins read roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Grants (Data API access for authenticated admins; service role keeps full access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches, public.categories, public.items,
  public.suppliers, public.cycles, public.cycle_items, public.customers, public.orders,
  public.order_items TO authenticated;
GRANT SELECT ON public.audit_log TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.admin_pins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.branches, public.categories, public.items, public.suppliers,
  public.cycles, public.cycle_items, public.customers, public.orders, public.order_items,
  public.audit_log, public.admin_pins, public.user_roles TO service_role;
