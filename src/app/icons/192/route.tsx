import { ImageResponse } from "next/og";
import { iconMark } from "@/lib/icon-mark";

export async function GET() {
  return new ImageResponse(iconMark(192), { width: 192, height: 192 });
}
