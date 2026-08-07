-- Allow invoice builders to append ad hoc products and services that are not
-- tied to a worker's approved hours or placement fee.

alter table public.invoice_line_items
drop constraint if exists invoice_line_items_line_type_check;

alter table public.invoice_line_items
add constraint invoice_line_items_line_type_check
check (line_type in ('hours', 'placement_fee', 'manual'));

notify pgrst, 'reload schema';
