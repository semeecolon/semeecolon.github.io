/**
 * Yahoo Finance 중계용 Cloudflare Worker
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 필요한가
 *   Yahoo 는 브라우저의 교차 출처 요청에 Access-Control-Allow-Origin 을 주지 않는다.
 *   CORS 는 브라우저가 강제하는 것이라 페이지 쪽 코드로는 우회할 수 없다.
 *   서버끼리의 통신에는 CORS 가 적용되지 않으므로, 중간에 서버를 하나 두고
 *   그 서버가 응답에 CORS 헤더를 붙여주면 문제가 끝난다. 이 파일이 그 서버다.
 *
 *   공개 프록시(corsproxy.io 등)도 같은 원리지만 남의 무료 서비스라
 *   수시로 느려지거나 죽는다. 이건 본인 것이라 그런 일이 없다.
 *
 * 배포 방법 (5분, 무료 · 카드 등록 불필요)
 *   1. https://dash.cloudflare.com 가입 후 로그인
 *   2. 왼쪽 메뉴 [Workers & Pages] → [Create] → [Start with Hello World!] → [Deploy]
 *   3. 만들어진 Worker 에서 [Edit code] 를 눌러 편집기를 연다
 *   4. 편집기 내용을 전부 지우고 아래 코드를 그대로 붙여넣은 뒤 [Deploy]
 *   5. 화면에 보이는 주소(https://이름.계정.workers.dev)를 복사
 *   6. stock-analyzer.html 상단의 MY_PROXY 에 그 주소를 넣고 저장
 *
 *   무료 한도는 하루 10만 요청이다. 조회 한 번에 종목당 1회씩 쓰므로
 *   개인 사용으로는 사실상 무제한이다.
 *
 * 확인 방법
 *   배포 후 브라우저에서 아래 주소를 열어 JSON 이 나오면 성공이다.
 *   https://내주소.workers.dev/?url=https://query1.finance.yahoo.com/v8/finance/chart/QQQ?range=5d%26interval=1d
 */

export default {
  async fetch(request) {
    const CORS = {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,OPTIONS",
      "access-control-max-age": "86400",
    };

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (request.method !== "GET") return new Response("GET만 허용", { status: 405, headers: CORS });

    const target = new URL(request.url).searchParams.get("url");
    if (!target) return new Response("url 파라미터가 필요합니다", { status: 400, headers: CORS });

    let t;
    try { t = new URL(target); }
    catch (e) { return new Response("잘못된 url", { status: 400, headers: CORS }); }

    // ★ 아무 주소나 중계하면 남들이 이 Worker 를 공짜 프록시로 악용한다.
    //    Yahoo 차트 API 로만 제한해 그 여지를 없앤다.
    const allowedHost = /^query[12]\.finance\.yahoo\.com$/.test(t.hostname);
    const allowedPath = t.pathname.startsWith("/v8/finance/chart/");
    if (t.protocol !== "https:" || !allowedHost || !allowedPath) {
      return new Response("허용되지 않은 주소입니다", { status: 403, headers: CORS });
    }

    let upstream;
    try {
      upstream = await fetch(t.toString(), {
        headers: { accept: "application/json", "user-agent": "Mozilla/5.0" },
        cf: { cacheTtl: 60, cacheEverything: true },   // 같은 요청은 60초간 엣지 캐시
      });
    } catch (e) {
      console.error("upstream fetch failed", e);
      return new Response("upstream 실패", { status: 502, headers: CORS });
    }

    const headers = new Headers(CORS);
    headers.set("content-type", upstream.headers.get("content-type") || "application/json");
    headers.set("cache-control", "public, max-age=60");
    return new Response(upstream.body, { status: upstream.status, headers });
  },
};
