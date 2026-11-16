export const dynamic = "force-dynamic";

// /trainer → public/trainer/index.html
// public 디렉터리의 index.html은 Next에서 깔끔한 URL(/trainer)로 바로 서빙되지 않아 리다이렉트한다.
export async function GET(req: Request) {
  return Response.redirect(new URL("/trainer/index.html", req.url), 307);
}
