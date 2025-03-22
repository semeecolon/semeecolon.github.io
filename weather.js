// Define Functions
async function customRequest(url, method = "GET", body = null, headers = {}) {
  // 기본 헤더 설정
  const requestHeaders = {
    // "Content-Type": "application/json",
    ...headers,
  };

  // 요청 옵션 설정
  const options = {
    method,
    headers: requestHeaders,
    // mode: "no-cors", // 요청 모드
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

function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    // 브라우저가 Geolocation API를 지원하는지 확인
    if (!navigator.geolocation) {
      resolve({
        lat: null,
        lon: null,
        error: "브라우저가 위치 정보를 지원하지 않습니다.",
      });
      return;
    }

    // 위치 정보 옵션 설정
    const options = {
      enableHighAccuracy: true, // 높은 정확도의 위치 정보 요청
      timeout: 5000, // 5초 제한 시간
      maximumAge: 0, // 캐시된 위치 정보를 사용하지 않음
    };

    // 위치 정보 요청 성공 시 호출될 함수
    function success(position) {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      resolve({
        lat: latitude,
        lon: longitude,
        error: "",
      });
    }

    // 위치 정보 요청 실패 시 호출될 함수
    function error(err) {
      let errorMessage = "";

      // 오류 코드에 따른 메시지 설정
      switch (err.code) {
        case err.PERMISSION_DENIED:
          errorMessage = "사용자가 위치 정보 접근을 거부했습니다.";
          break;
        case err.POSITION_UNAVAILABLE:
          errorMessage = "위치 정보를 사용할 수 없습니다.";
          break;
        case err.TIMEOUT:
          errorMessage = "위치 정보 요청 시간이 초과되었습니다.";
          break;
        case err.UNKNOWN_ERROR:
          errorMessage = "알 수 없는 오류가 발생했습니다.";
          break;
      }

      resolve({
        lat: null,
        lon: null,
        error: errorMessage,
      });
    }

    // Geolocation API 호출
    navigator.geolocation.getCurrentPosition(success, error, options);
  });
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
const proxyUrl = "https://cors-anywhere.herokuapp.com/";

// Main
async function initWeatherApp() {
  try {
    // 1. 위치 정보 가져오기
    const locationInfo = await getCurrentLocation();
    console.log("위치 정보:", locationInfo);

    // 2. 위치 정보 표시 및 기본 위치 설정
    const locationElement = document.getElementById("location");
    if (locationElement) {
      if (locationInfo.error) {
        locationInfo.lat = 37.4882034;
        locationInfo.lon = 126.9276843;
        locationElement.innerText = `위치 정보 획득 실패(기본 위치 사용): Lat-${locationInfo.lat}, Lon-${locationInfo.lon}`;
      } else {
        locationElement.innerText = `위치 정보: Lat-${locationInfo.lat}, Lon-${locationInfo.lon}`;
      }
    }

    // 3. 지역코드 정보 요청
    const locationUrl = "https://www.weather.go.kr/w/rest/zone/find/dong.do";
    const locationParams = {
      x: 1,
      y: 1,
      lat: locationInfo.lat,
      lon: locationInfo.lon,
      lang: "kor",
    };

    const dongData = [];
    // const dongData = await customRequest(
    //   getUrlWithParams(proxyUrl + locationUrl, locationParams),
    //   "GET",
    //   null,
    //   {
    //     "User-Agent":
    //       "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    //     Accept: "*/*",
    //     Host: "www.weather.go.kr",
    //     "Accept-Encoding": "gzip, deflate, br",
    //     Connection: "keep-alive",
    //   }
    // );
    console.log("지역코드 정보:", dongData);

    // 4. 지역코드 정보 표시
    const dongElement = document.getElementById("dong");
    if (dongElement && dongData && dongData.length > 0) {
      dongElement.innerText = `지역코드 정보: ${dongData[0].code} / ${dongData[0].name}`;
    }

    // 5. 날씨 정보 요청
    const weatherUrl =
      "https://www.weather.go.kr/w/wnuri-fct2021/main/current-weather.do";
    const weatherParams = {
      // code: dongData && dongData.length > 0 ? dongData[0].code : 1162069500,
      unit: encodeURI("m/s"),
      aws: "N",
      lat: locationInfo.lat,
      lon: locationInfo.lon,
    };

    const weatherData = await customRequest(
      getUrlWithParams(proxyUrl + weatherUrl, weatherParams)
    );

    // 6. 날씨 정보 표시
    const weatherElement = document.getElementById("weather");
    if (weatherElement) {
      weatherElement.innerHTML = weatherData;
    }
  } catch (error) {
    console.error("날씨 앱 초기화 중 오류 발생:", error);

    // 오류 발생 시 사용자에게 알림
    const weatherElement = document.getElementById("weather");
    if (weatherElement) {
      weatherElement.innerHTML = `<div class="error">날씨 정보를 가져오는 중 오류가 발생했습니다: ${error.message}</div>`;
    }
  }
}

// 페이지 로드 시 앱 초기화
document.addEventListener("DOMContentLoaded", initWeatherApp);
