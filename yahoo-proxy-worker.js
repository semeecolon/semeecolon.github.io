/**
 * Yahoo Finance 중계용 Cloudflare Worker
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 필요한가
 *   Yahoo 는 브라우저의 교차 출처 요청에 Access-Control-Allow-Origin 을 주지 않는다.
 *   CORS 는 브라우저가 강제하는 것이라 페이지 쪽 코드로는 우회할 수 없다.
 *   서버끼리의 통신에는 CORS 가 적용되지 않으므로, 중간에 서버를 하나 두고
 *   그 서버가 응답에 CORS 헤더를 붙여주면 문제가 끝난다. 이 파일이 그 서버다.
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
 *
 * 1. 차트 프록시
 * - url 파라미터
 * 2. 히트맵 프록시
 * - 동작 방식:
 *   1. finance.yahoo.com 홈페이지를 한 번 호출해서 세션 쿠키를 얻음
 *   2. 그 쿠키로 /v1/test/getcrumb 를 호출해서 crumb를 얻음
 *   3. 쿠키+crumb로 /v1/finance/screener 를 POST 호출 (필요하면 250개씩 페이지네이션)
 *   4. 클라이언트가 쓰기 쉬운 형태(ticker/name/sector/marketCap/change)로 변환해서 JSON으로 반환
 */

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-max-age": "86400",
};
 
const INDEX_MAP = {
  sp500: "^SPX",       // 주의: 페이지 표기(^GSPC)와 다른 내부 코드
  dow: "^DJI",
  nasdaq100: "^NDX",
};
 
const SCREENER_FIELDS = ["ticker", "companyshortname", "intradaymarketcap", "percentchange", "sector"];
const CRUMB_TTL_MS = 25 * 60 * 1000; // 25분 - 정확한 만료 주기는 비공식이라 보수적으로 잡음
 
// Worker 인스턴스가 warm 상태인 동안만 유지되는 메모리 캐시.
// 콜드 스타트되면 비워지고 자동으로 재발급됩니다.
let cachedAuth = null; // { crumb, cookie, fetchedAt }
 
function extractCookies(response) {
  const cookies = [];
  for (const [key, value] of response.headers) {
    if (key.toLowerCase() === "set-cookie") {
      cookies.push(value.split(";")[0]);
    }
  }
  return cookies.join("; ");
}
 
async function refreshAuth() {
  const homeRes = await fetch("https://finance.yahoo.com/", {
    headers: { "user-agent": "Mozilla/5.0" },
  });
  const cookie = extractCookies(homeRes);
 
  const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
    headers: { "user-agent": "Mozilla/5.0", cookie },
  });
  const crumb = (await crumbRes.text()).trim();
 
  cachedAuth = { crumb, cookie, fetchedAt: Date.now() };
  return cachedAuth;
}
 
async function getAuth() {
  if (cachedAuth && Date.now() - cachedAuth.fetchedAt < CRUMB_TTL_MS) {
    return cachedAuth;
  }
  return refreshAuth();
}
 
async function fetchScreenerPage(indexCode, offset, auth) {
  const url =
    "https://query1.finance.yahoo.com/v1/finance/screener" +
    `?formatted=true&useRecordsResponse=true&lang=en-US&region=US&crumb=${encodeURIComponent(auth.crumb)}`;
 
  const body = {
    sortField: "intradaymarketcap",
    sortType: "desc",
    topOperator: "AND",
    quoteType: "EQUITY",
    offset,
    size: 250, // 실측 결과 250 초과 요청 시 0건 반환됨 (서버가 클램핑이 아니라 거부)
    includeFields: SCREENER_FIELDS,
    query: { operator: "and", operands: [{ operator: "eq", operands: ["indices", indexCode] }] },
  };
 
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0",
      cookie: auth.cookie,
    },
    body: JSON.stringify(body),
  });
 
  return { status: res.status, json: res.status === 200 ? await res.json() : null };
}
 
function normalizeRecords(records) {
  return records.map((r) => ({
    ticker: r.ticker,
    name: r.companyName,
    sector: r.sector || "Other",
    marketCap: r.marketCap?.raw ?? null,
    change: r.fulldayChangePercent?.raw ?? r.regularMarketChangePercent?.raw ?? null,
  }));
}
 
async function fetchFullIndex(indexCode) {
  let auth = await getAuth();
  let first = await fetchScreenerPage(indexCode, 0, auth);
 
  if (first.status === 401) {
    // crumb 만료로 추정 - 한 번만 재발급 후 재시도
    auth = await refreshAuth();
    first = await fetchScreenerPage(indexCode, 0, auth);
  }
 
  if (first.status !== 200) {
    throw new Error(`screener 요청 실패 (status ${first.status})`);
  }
 
  const r0 = first.json?.finance?.result?.[0];
  const total = r0?.total ?? 0;
  let records = r0?.records ?? [];
 
  if (total > 250) {
    const second = await fetchScreenerPage(indexCode, 250, auth);
    records = records.concat(second.json?.finance?.result?.[0]?.records ?? []);
  }
 
  return normalizeRecords(records);
}
 
export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (request.method !== "GET") return new Response("GET만 허용", { status: 405, headers: CORS });
 
    const url = new URL(request.url);
 
    // ---- 기존 차트 프록시 (그대로 유지) ----
    const target = url.searchParams.get("url");
    if (target) {
      let t;
      try {
        t = new URL(target);
      } catch (e) {
        return new Response("잘못된 url", { status: 400, headers: CORS });
      }
 
      const allowedHost = /^query[12]\.finance\.yahoo\.com$/.test(t.hostname);
      const allowedPath = t.pathname.startsWith("/v8/finance/chart/");
      if (t.protocol !== "https:" || !allowedHost || !allowedPath) {
        return new Response("허용되지 않은 주소입니다", { status: 403, headers: CORS });
      }
 
      let upstream;
      try {
        upstream = await fetch(t.toString(), {
          headers: { accept: "application/json", "user-agent": "Mozilla/5.0" },
          cf: { cacheTtl: 60, cacheEverything: true },
        });
      } catch (e) {
        return new Response("upstream 실패", { status: 502, headers: CORS });
      }
 
      const headers = new Headers(CORS);
      headers.set("content-type", upstream.headers.get("content-type") || "application/json");
      headers.set("cache-control", "public, max-age=60");
      return new Response(upstream.body, { status: upstream.status, headers });
    }
 
    // ---- 신규: 히트맵 전용 엔드포인트 ----
    const heatmap = url.searchParams.get("heatmap"); // sp500 | dow | nasdaq100
    if (heatmap) {
      const indexCode = INDEX_MAP[heatmap];
      if (!indexCode) {
        return new Response("지원하지 않는 heatmap 값입니다 (sp500|dow|nasdaq100)", {
          status: 400,
          headers: CORS,
        });
      }
 
      const cache = caches.default;
      const cacheKey = new Request(url.toString(), request);
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
 
      try {
        const records = await fetchFullIndex(indexCode);
        const headers = new Headers(CORS);
        headers.set("content-type", "application/json");
        headers.set("cache-control", "public, max-age=60");
        const response = new Response(
          JSON.stringify({ index: heatmap, count: records.length, records }),
          { status: 200, headers }
        );
        await cache.put(cacheKey, response.clone());
        return response;
      } catch (e) {
        return new Response("upstream 실패: " + String(e), { status: 502, headers: CORS });
      }
    }
 
    return new Response("url 또는 heatmap 파라미터가 필요합니다", { status: 400, headers: CORS });
  },
};
