-- Apply once after schema.sql. Additive: historical orders/credentials are not deleted.
BEGIN;
CREATE TABLE IF NOT EXISTS staff (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), username text NOT NULL UNIQUE,
 name text NOT NULL, password_hash text NOT NULL, role text NOT NULL CHECK(role IN ('admin','branch')),
 branch_id uuid REFERENCES branches(id), is_active boolean NOT NULL DEFAULT true,
 CHECK(role='admin' OR branch_id IS NOT NULL)
);
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS receipt_footer text;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES staff(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES staff(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS staff_name text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_shift_id uuid REFERENCES shifts(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_staff_id uuid REFERENCES staff(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_staff_name text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cash_amount numeric(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES staff(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS receipt_branch jsonb;
CREATE TABLE IF NOT EXISTS pos_login_attempts(username text PRIMARY KEY, attempts int NOT NULL, window_start timestamptz NOT NULL);
ALTER TABLE pos_login_attempts ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION pos_login_attempt(p_username text) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE n int;
BEGIN
 INSERT INTO pos_login_attempts VALUES(p_username,1,now()) ON CONFLICT(username) DO UPDATE SET
 attempts=CASE WHEN pos_login_attempts.window_start < now()-interval '15 minutes' THEN 1 ELSE pos_login_attempts.attempts+1 END,
 window_start=CASE WHEN pos_login_attempts.window_start < now()-interval '15 minutes' THEN now() ELSE pos_login_attempts.window_start END
 RETURNING attempts INTO n;RETURN n<=10;
END $$;
-- Browser clients must use authenticated application routes, never anonymous writes.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['branches','categories','menu_items','restaurant_tables','shifts','orders','order_items','settings','staff','pos_login_attempts'] LOOP
  EXECUTE format('REVOKE ALL ON TABLE %I FROM anon, authenticated',t);
  EXECUTE format('GRANT ALL ON TABLE %I TO service_role',t);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION pos_open_shift(p_staff uuid,p_branch uuid,p_cash numeric) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE s shifts; person staff;
BEGIN
 SELECT * INTO person FROM staff WHERE id=p_staff AND is_active;
 IF person.id IS NULL OR (person.role='branch' AND person.branch_id<>p_branch) OR p_cash IS NULL OR p_cash<0 THEN RAISE EXCEPTION 'Invalid staff, branch or cash'; END IF;
 IF NOT EXISTS(SELECT 1 FROM branches WHERE id=p_branch AND is_active) THEN RAISE EXCEPTION 'Invalid branch'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_staff::text,0));
 SELECT * INTO s FROM shifts WHERE staff_id=p_staff AND status='OPEN' LIMIT 1;
 IF s.id IS NOT NULL THEN
  IF s.branch_id<>p_branch THEN RAISE EXCEPTION 'Close your other branch shift first';END IF;
  RETURN to_jsonb(s);
 END IF;
 INSERT INTO shifts(branch_id,staff_id,shift_number,operator_name,opening_cash,status) VALUES(p_branch,p_staff,'SHF-'||substr(gen_random_uuid()::text,1,12),person.name,p_cash,'OPEN') RETURNING * INTO s;
 RETURN to_jsonb(s);
END $$;
CREATE OR REPLACE FUNCTION pos_create_order(p_order jsonb,p_items jsonb,p_staff uuid) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE s shifts; person staff; old orders; oid uuid; item jsonb; tid uuid;
BEGIN
 SELECT * INTO person FROM staff WHERE id=p_staff AND is_active;
 IF person.id IS NULL THEN RAISE EXCEPTION 'Inactive staff';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_order->>'offline_order_id',0));
 SELECT * INTO old FROM orders WHERE offline_order_id=p_order->>'offline_order_id' LIMIT 1;
 IF old.id IS NOT NULL THEN
  IF old.staff_id IS DISTINCT FROM p_staff OR old.branch_id<>(p_order->>'branch_id')::uuid THEN RAISE EXCEPTION 'Order ownership mismatch';END IF;
  RETURN old.id;
 END IF;
 SELECT * INTO s FROM shifts WHERE id=(p_order->>'shift_id')::uuid FOR UPDATE;
 IF s.id IS NULL OR s.staff_id IS DISTINCT FROM p_staff OR s.branch_id<>(p_order->>'branch_id')::uuid OR s.status<>'OPEN' THEN RAISE EXCEPTION 'Valid open shift required';END IF;
 IF person.role='branch' AND person.branch_id<>s.branch_id THEN RAISE EXCEPTION 'Branch access denied';END IF;
 IF jsonb_array_length(p_items)=0 THEN RAISE EXCEPTION 'Items required';END IF;
 tid=(p_order->>'table_id')::uuid;
 IF tid IS NOT NULL THEN
  PERFORM 1 FROM restaurant_tables WHERE id=tid AND branch_id=s.branch_id AND status='AVAILABLE' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Table is unavailable';END IF;
 END IF;
 INSERT INTO orders(order_number,branch_id,staff_id,staff_name,order_type,table_id,table_number,customer_name,customer_phone,delivery_address,
 subtotal,discount,discount_type,tax,total_amount,payment_method,payment_status,order_status,cash_amount,offline_order_id,shift_id,sale_source,created_at,completed_at,receipt_branch)
 VALUES(p_order->>'order_number',s.branch_id,p_staff,person.name,p_order->>'order_type',tid,(p_order->>'table_number')::int,p_order->>'customer_name',p_order->>'customer_phone',p_order->>'delivery_address',
 (p_order->>'subtotal')::numeric,(p_order->>'discount')::numeric,p_order->>'discount_type',(p_order->>'tax')::numeric,(p_order->>'total_amount')::numeric,p_order->>'payment_method',p_order->>'payment_status',p_order->>'order_status',(p_order->>'cash_amount')::numeric,p_order->>'offline_order_id',s.id,p_order->>'sale_source',(p_order->>'created_at')::timestamptz,
 CASE WHEN p_order->>'order_status'='COMPLETED' THEN now() END,p_order->'receipt_branch') RETURNING id INTO oid;
 FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
 INSERT INTO order_items(order_id,menu_item_id,item_name,item_name_ur,quantity,unit_price,total_price,notes,status)
 VALUES(oid,(item->>'menu_item_id')::uuid,item->>'item_name',item->>'item_name_ur',(item->>'quantity')::int,(item->>'unit_price')::numeric,(item->>'total_price')::numeric,item->>'notes','SERVED');
 END LOOP;
 IF tid IS NOT NULL AND p_order->>'order_status'<>'COMPLETED' THEN UPDATE restaurant_tables SET status='OCCUPIED',current_order_id=oid WHERE id=tid;END IF;
 RETURN oid;
END $$;
CREATE OR REPLACE FUNCTION pos_cancel_order(p_id uuid,p_staff uuid,p_reason text) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE o orders;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM staff WHERE id=p_staff AND role='admin' AND is_active) OR p_reason IS NULL OR length(trim(p_reason))<3 THEN RAISE EXCEPTION 'Admin and reason required';END IF;
 SELECT * INTO o FROM orders WHERE id=p_id FOR UPDATE;
 IF o.id IS NULL OR o.payment_status<>'UNPAID' OR o.order_status IN ('COMPLETED','CANCELLED') THEN RAISE EXCEPTION 'Only unpaid open orders can be cancelled; paid bills require a refund';END IF;
 UPDATE orders SET order_status='CANCELLED',cancellation_reason=p_reason,cancelled_by=p_staff,cancelled_at=now(),updated_at=now() WHERE id=p_id;
 UPDATE restaurant_tables SET status='AVAILABLE',current_order_id=NULL WHERE current_order_id=p_id;
END $$;
CREATE OR REPLACE FUNCTION pos_close_shift(p_id uuid,p_staff uuid,p_cash numeric) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE s shifts; cash numeric; revenue numeric; qty int;
BEGIN
 SELECT * INTO s FROM shifts WHERE id=p_id AND staff_id=p_staff FOR UPDATE;
 IF s.id IS NULL OR s.status<>'OPEN' OR p_cash<0 THEN RAISE EXCEPTION 'Invalid open shift';END IF;
 IF EXISTS(SELECT 1 FROM orders WHERE coalesce(payment_shift_id,shift_id)=p_id AND payment_method='SPLIT' AND cash_amount IS NULL AND payment_status='PAID') THEN RAISE EXCEPTION 'Historical split cash must be reconciled before closing';END IF;
 SELECT coalesce(sum(coalesce(cash_amount,CASE WHEN payment_method='CASH' THEN total_amount ELSE 0 END)),0),coalesce(sum(total_amount),0),count(*) INTO cash,revenue,qty FROM orders WHERE coalesce(payment_shift_id,shift_id)=p_id AND payment_status='PAID' AND order_status<>'CANCELLED';
 UPDATE shifts SET status='CLOSED',closing_cash=p_cash,expected_cash=opening_cash+cash,cash_difference=p_cash-opening_cash-cash,total_sales=revenue,total_orders=qty,cash_sales=cash,digital_sales=revenue-cash,closed_at=now() WHERE id=p_id RETURNING * INTO s;
 RETURN to_jsonb(s);
END $$;
-- Repair only stale active links; retain every bill and payment in history.
UPDATE restaurant_tables t SET current_order_id=NULL,status=CASE WHEN t.status='OCCUPIED' THEN 'AVAILABLE' ELSE t.status END
WHERE t.current_order_id IS NOT NULL AND EXISTS(SELECT 1 FROM orders o WHERE o.id=t.current_order_id AND o.order_status IN ('COMPLETED','CANCELLED'));
REVOKE ALL ON FUNCTION pos_login_attempt(text),pos_open_shift(uuid,uuid,numeric),pos_create_order(jsonb,jsonb,uuid),pos_cancel_order(uuid,uuid,text),pos_close_shift(uuid,uuid,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION pos_login_attempt(text),pos_open_shift(uuid,uuid,numeric),pos_create_order(jsonb,jsonb,uuid),pos_cancel_order(uuid,uuid,text),pos_close_shift(uuid,uuid,numeric) TO service_role;
CREATE OR REPLACE FUNCTION pos_settle_order(p_id uuid,p_shift uuid,p_staff uuid,p_method text,p_cash numeric) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE o orders; s shifts; person staff;
BEGIN
 SELECT * INTO person FROM staff WHERE id=p_staff AND is_active;
 SELECT * INTO s FROM shifts WHERE id=p_shift AND staff_id=p_staff AND status='OPEN' FOR UPDATE;
 SELECT * INTO o FROM orders WHERE id=p_id FOR UPDATE;
 IF person.id IS NULL OR s.id IS NULL OR o.id IS NULL OR o.branch_id<>s.branch_id OR (person.role='branch' AND person.branch_id<>o.branch_id) THEN RAISE EXCEPTION 'A valid branch shift is required';END IF;
 IF o.payment_status<>'UNPAID' OR o.order_status='CANCELLED' THEN RAISE EXCEPTION 'Order is not unpaid';END IF;
 IF p_method NOT IN ('CASH','JAZZCASH','EASYPAISA','SPLIT') OR p_cash<0 OR p_cash>o.total_amount THEN RAISE EXCEPTION 'Invalid payment';END IF;
 UPDATE orders SET payment_status='PAID',order_status='COMPLETED',payment_method=p_method,cash_amount=CASE WHEN p_method='CASH' THEN total_amount WHEN p_method='SPLIT' THEN p_cash ELSE 0 END,payment_shift_id=p_shift,payment_staff_id=p_staff,payment_staff_name=person.name,completed_at=now(),updated_at=now() WHERE id=p_id;
 UPDATE restaurant_tables SET status='AVAILABLE',current_order_id=NULL WHERE current_order_id=p_id;
END $$;
REVOKE ALL ON FUNCTION pos_settle_order(uuid,uuid,uuid,text,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION pos_settle_order(uuid,uuid,uuid,text,numeric) TO service_role;
COMMIT;
