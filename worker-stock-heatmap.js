// 히트맵 전용 프록시 Worker. 기존 차트 프록시 Worker와는 완전히 분리된 별도 배포입니다.
//
// GET /?market=ALL|NYS|NSQ|AMX&pages=N
//
// 데이터 소스: 네이버 증권 해외증시 API
//   https://stock.naver.com/api/foreign/market/stock/global
//     ?nation=USA&tradeType={ALL|NYS|NSQ|AMX}&orderType=marketValue&startIdx={n}&pageSize=100
//
// crumb/쿠키 인증이 필요 없는 API라 Yahoo screener 때 겪은 401/429 문제가 없습니다.
// 응답에 전체 개수(total) 필드가 없어서, 받은 배열 길이가 pageSize보다 작으면
// 마지막 페이지로 간주합니다. 기본은 3페이지(최대 300종목)까지만 가져옵니다
// (?pages= 로 조절 가능, 과도한 subrequest 방지를 위해 최대 8페이지로 제한).
//
// ⚠️ Cloudflare Workers에 실제 배포해서 테스트해본 코드는 아닙니다.
//   네이버 쪽이 Referer/Origin 검사를 하는지는 실측이 안 됐어서, 막히면
//   아래 NAVER_HEADERS 쪽을 조정해야 할 수 있습니다.

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-max-age": "86400",
};
 
const PAGE_SIZE = 100;
const DEFAULT_PAGES = 3;
const MAX_PAGES = 8; // 남용 방지용 상한 (8 * 100 = 최대 800종목)
 
// 네이버 쪽이 Referer 검사를 할 가능성을 대비한 헤더. 막히면 조정하세요.
const NAVER_HEADERS = {
  accept: "application/json",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
  referer: "https://stock.naver.com/",
};
 
function toNumber(v) {
  if (v == null) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
 
// ---------------- 미국 (us*) ----------------
 
const usMarkets = new Set(["ALL", "NYS", "NSQ", "AMX"]);
 
async function usFetchPage(market, startIdx) {
  const url =
    "https://stock.naver.com/api/foreign/market/stock/global" +
    `?nation=USA&tradeType=${market}&orderType=marketValue&startIdx=${startIdx}&pageSize=${PAGE_SIZE}`;
  const res = await fetch(url, { headers: NAVER_HEADERS });
  if (res.status !== 200) {
    throw new Error(`us naver 요청 실패 (status ${res.status}, startIdx=${startIdx})`);
  }
  return res.json();
}
 
function usNormalize(items) {
  return items.map((r) => ({
    ticker: r.symbolCode,
    name: r.englishCodeName,
    nameKo: r.koreanCodeName,
    sector: r.reutersIndustryName || "Other",
    exchange: r.stockExchangeType?.code || null,
    marketCap: toNumber(r.marketValue),
    change: toNumber(r.fluctuationsRatio),
    price: toNumber(r.currentPrice),
    currency: "USD",
  }));
}
 
// ---------------- 한국 (kr*) ----------------
 
const krMarkets = new Set(["ALL", "KOSPI", "KOSDAQ"]);
 
async function krFetchPage(market, startIdx) {
  const url =
    "https://stock.naver.com/api/domestic/market/stock/default" +
    `?tradeType=KRX&marketType=${market}&orderType=marketSum&startIdx=${startIdx}&pageSize=${PAGE_SIZE}`;
  const res = await fetch(url, { headers: NAVER_HEADERS });
  if (res.status !== 200) {
    throw new Error(`kr naver 요청 실패 (status ${res.status}, startIdx=${startIdx})`);
  }
  return res.json();
}
 
function krNormalize(items) {
  return items.map((r) => ({
    ticker: r.itemcode,
    name: r.itemname,
    nameKo: r.itemname,
    sector: null, // ⚠️ 한국 API엔 업종/섹터 분류 필드가 없음 (프론트에서 그룹 없이 처리 필요)
    exchange: null,
    marketCap: toNumber(r.marketSum),
    change: toNumber(r.prevChangeRate),
    price: toNumber(r.nowPrice),
    currency: "KRW",
  }));
}
 
// ---------------- 공통 디스패치 ----------------
 
const COUNTRIES = {
  us: { markets: usMarkets, fetchPage: usFetchPage, normalize: usNormalize },
  kr: { markets: krMarkets, fetchPage: krFetchPage, normalize: krNormalize },
};
 
async function fetchTopN(country, market, pages) {
  const cfg = COUNTRIES[country];
  const pageIndices = Array.from({ length: pages }, (_, i) => i * PAGE_SIZE);
  const pageResults = await Promise.all(pageIndices.map((idx) => cfg.fetchPage(market, idx)));
 
  const merged = [];
  for (const page of pageResults) {
    if (!Array.isArray(page)) continue;
    merged.push(...page);
    if (page.length < PAGE_SIZE) break; // 마지막 페이지로 추정
  }
  return cfg.normalize(merged);
}
 
export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (request.method !== "GET") return new Response("GET만 허용", { status: 405, headers: CORS });
 
    const url = new URL(request.url);
 
    const country = (url.searchParams.get("country") || "us").toLowerCase();
    const cfg = COUNTRIES[country];
    if (!cfg) {
      return new Response("지원하지 않는 country 값입니다 (us|kr)", { status: 400, headers: CORS });
    }
 
    const marketRaw = url.searchParams.get("market");
    const market = (marketRaw || "").toUpperCase();
    if (!marketRaw || !cfg.markets.has(market)) {
      const allowed = Array.from(cfg.markets).join("|");
      return new Response(`지원하지 않는 market 값입니다 (${allowed})`, { status: 400, headers: CORS });
    }
 
    let pages = parseInt(url.searchParams.get("pages") || String(DEFAULT_PAGES), 10);
    if (!Number.isFinite(pages) || pages < 1) pages = DEFAULT_PAGES;
    if (pages > MAX_PAGES) pages = MAX_PAGES;
 
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
 
    try {
      const records = await fetchTopN(country, market, pages);
      const headers = new Headers(CORS);
      headers.set("content-type", "application/json");
      headers.set("cache-control", "public, max-age=60");
      const response = new Response(
        JSON.stringify({ country, market, pages, count: records.length, records }),
        { status: 200, headers }
      );
      await cache.put(cacheKey, response.clone());
      return response;
    } catch (e) {
      return new Response("upstream 실패: " + String(e), { status: 502, headers: CORS });
    }
  },
};
