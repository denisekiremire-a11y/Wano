import { ImageResponse } from "next/og";
import { iconMark } from "@/lib/icon-mark";

export async function GET() {
  return new ImageResponse(iconMark(512, true), { width: 512, height: 512 });
}
