import { NextRequest } from "next/server";
import { handle } from "@/lib/handler";
export const dynamic = "force-dynamic";
export const GET = (req: NextRequest) => handle(req, true);
