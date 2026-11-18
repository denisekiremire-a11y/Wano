import { getAdmin } from "@/lib/admin";
import { loadAdminCore, loadReservations } from "@/lib/admin-data";
import { toCsv } from "@/lib/csv";

export async function GET(_req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const ctx = await getAdmin();
  if ("notAdmin" in ctx) return new Response("Forbidden", { status: ctx.user ? 403 : 401 });
  const sb = ctx.supabase;
  const stamp = new Date().toISOString().slice(0, 10);
  let csv: string;

  if (kind === "reservations") {
    const rows = await loadReservations(sb);
    csv = toCsv(rows, [
      { header: "Reference", value: (r) => r.reference },
      { header: "Status", value: (r) => r.status },
      { header: "Gift", value: (r) => r.gift_name_snapshot },
      { header: "Price (UGX)", value: (r) => r.price_aed_snapshot },
      { header: "Guest name", value: (r) => r.guest_name },
      { header: "Guest email", value: (r) => r.guest_email },
      { header: "Guest phone", value: (r) => r.guest_phone },
      { header: "Message", value: (r) => r.message },
      { header: "Reserved at (UTC)", value: (r) => r.created_at },
      { header: "Purchased at (UTC)", value: (r) => r.purchased_at },
      { header: "Closed at (UTC)", value: (r) => r.closed_at },
      { header: "Admin note", value: (r) => r.admin_note },
    ]);
  } else if (kind === "gifts") {
    const { gifts, categories } = await loadAdminCore(sb);
    const cat = new Map(categories.map((c) => [c.id, c.name]));
    csv = toCsv(gifts, [
      { header: "Name", value: (g) => g.name },
      { header: "Category", value: (g) => cat.get(g.category_id) },
      { header: "Status", value: (g) => g.status },
      { header: "Description", value: (g) => g.description },
      { header: "Price (UGX)", value: (g) => g.price_aed },
      { header: "Sale price (UGX)", value: (g) => g.sale_price_aed },
      { header: "Range from (UGX)", value: (g) => g.price_min_aed },
      { header: "Range to (UGX)", value: (g) => g.price_max_aed },
      { header: "Reference price (UGX)", value: (g) => g.reference_price_aed },
      { header: "Unit", value: (g) => g.price_unit },
      { header: "Price type", value: (g) => g.price_basis },
      { header: "Original price text", value: (g) => g.price_label },
      { header: "Option type", value: (g) => g.tier },
      { header: "In budget selection", value: (g) => (g.in_doc_budget ? "yes" : "no") },
      { header: "In full selection", value: (g) => (g.in_doc_full ? "yes" : "no") },
      { header: "Alternative", value: (g) => (g.is_alternative ? "yes" : "no") },
      { header: "Featured", value: (g) => (g.is_featured ? "yes" : "no") },
      { header: "Notes", value: (g) => g.notes },
      { header: "Slug", value: (g) => g.slug },
    ]);
  } else {
    return new Response("Not found", { status: 404 });
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="registry-${kind}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
