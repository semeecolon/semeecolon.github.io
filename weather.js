// Define Functions
async function customRequest(url, method = "GET", body = null, headers = {}) {
  // 기본 헤더 설정
  const requestHeaders = {
    "Content-Type": "application/json",
    ...headers,
  };

  // 요청 옵션 설정
  const options = {
    method,
    headers: requestHeaders,
    mode: "no-cors", // 요청 모드
    // credentials: "include", // 쿠키 포함 여부
  };

  // 요청 본문이 있는 경우 추가
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`HTTP 에러! 상태: ${response.status}`);
    }

    // 응답 형식에 따라 적절한 메서드 사용
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    } else if (contentType && contentType.includes("text/html")) {
      const htmlText = await response.text();

      // HTML 파싱
      // const parser = new DOMParser();
      // return parser.parseFromString(htmlText, "text/html");
      return htmlText;
    } else {
      return await response.text();
    }
  } catch (error) {
    console.error("요청 실패:", error);
    throw error;
  }
}

function getUrlWithParams(url, params) {
  const urlObj = new URL(url);

  // for (const key in params) {
  //   urlObj.searchParams.set(key, params[key]);
  // }

  Object.entries(params).forEach(([key, value]) => {
    urlObj.searchParams.append(key, value);
  });

  return urlObj.toString();
}

// Constants

// request
const reqUrl =
  "https://www.weather.go.kr/w/wnuri-fct2021/main/current-weather.do";
const reqData = {
  code: 1162069500,
  unit: encodeURI("m/s"),
  lat: 37.4882034,
  lon: 126.9276843,
};

customRequest(getUrlWithParams(reqUrl, reqData))
  .then((data) => {
    console.log(data);
  })
  .catch((error) => {
    console.error(error);
  });
