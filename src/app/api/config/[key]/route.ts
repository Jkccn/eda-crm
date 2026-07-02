import { NextResponse } from "next/server";
import { CONFIG_KEYS } from "@/lib/constants";
import { getConfigOptions, setConfigOptions } from "@/lib/config-options";
import { requireApiAdmin } from "@/lib/api-auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ key: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { key } = await params;
    if (!CONFIG_KEYS.includes(key as (typeof CONFIG_KEYS)[number])) {
      return NextResponse.json({ error: "无效配置项" }, { status: 400 });
    }
    const values = await getConfigOptions(key as (typeof CONFIG_KEYS)[number]);
    return NextResponse.json({ key, values });
  } catch (err) {
    console.error("GET /api/config/[key]", err);
    return NextResponse.json({ error: "读取配置失败" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { error } = await requireApiAdmin();
    if (error) return error;
    const { key } = await params;
    if (!CONFIG_KEYS.includes(key as (typeof CONFIG_KEYS)[number])) {
      return NextResponse.json({ error: "无效配置项" }, { status: 400 });
    }
    const body = await request.json();
    if (!Array.isArray(body.values)) {
      return NextResponse.json({ error: "values 必须为数组" }, { status: 400 });
    }
    const values = await setConfigOptions(
      key as (typeof CONFIG_KEYS)[number],
      body.values.map(String),
    );
    return NextResponse.json({ key, values });
  } catch (err) {
    console.error("PUT /api/config/[key]", err);
    return NextResponse.json({ error: "保存配置失败" }, { status: 500 });
  }
}
