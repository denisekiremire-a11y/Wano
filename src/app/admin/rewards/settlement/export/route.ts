import { NextResponse } from "next/server";
import { requireAdminPage } from "@/lib/auth";
import { getWeekRange, getWeeklySettlement, settlementToCsv } from "@/lib/data/settlement";

export async function GET(request: Request) {
  await requireAdminPage("/admin/rewards/settlement");

  const week = new URL(request.url).searchParams.get("week");
  const { start, end } = getWeekRange(week ? new Date(week) : new Date());
  const rows = await getWeeklySettlement(start, end);
  const csv = settlementToCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wano-settlement-${start.toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
