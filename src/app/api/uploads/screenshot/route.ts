// POST /api/uploads/screenshot — 이미지 1장 → Supabase Storage `screenshots` 버킷.
// 버킷은 최초 1회 Dashboard에서 private으로 생성 (SQL: insert into storage.buckets...).
// 5MB 제한, 이미지 확장자만 허용.
export async function POST(req: Request) {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const sb = await createClient();
    const { data: user } = await sb.auth.getUser();
    if (!user.user) return Response.json({ error: "unauthorized" }, { status: 401 });

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "file required" }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return Response.json({ error: "5MB 이하만 업로드할 수 있습니다." }, { status: 413 });
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["png", "jpg", "jpeg", "webp"].includes(ext)) {
      return Response.json({ error: "png/jpg/webp만 업로드할 수 있습니다." }, { status: 415 });
    }
    const path = `${user.user.id}/${Date.now()}.${ext}`;
    const { error } = await sb.storage.from("screenshots").upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
    if (error) throw error;
    return Response.json({ path }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "upload failed" }, { status: 500 });
  }
}
