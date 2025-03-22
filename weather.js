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

// location information
// const locationInfo = getCurrentLocation();
// console.log(locationInfo);

// if (locationInfo.error) {
//   document.getElementById("location").innerText =
//     "위치 정보 획득 실패(기본 위치 사용)";
//   locationInfo.lat = 37.4882034;
//   locationInfo.lon = 126.9276843;
// } else {
//   document.getElementById("location").innerText =
//     locationInfo.lat + ", " + locationInfo.lon;
// }
// // location request
// const locationUrl = "https://www.weather.go.kr/w/rest/zone/find/dong.do";
// const locationParams = {
//   x: 1,
//   y: 1,
//   lat: locationInfo.lat,
//   lon: locationInfo.lon,
//   lang: "kor",
// };
// const locationResponse = customRequest(
//   getUrlWithParams(proxyUrl + locationUrl, locationParams)
// ).then((data) => {
//   // console.log(data);
//   document.getElementById("dong").innerText = `${data[0].code} ${data[0].name}`;
// });

// weather request
const weatherUrl =
  "https://www.weather.go.kr/w/wnuri-fct2021/main/current-weather.do";
const weatherParams = {
  code: 1162069500,
  unit: encodeURI("m/s"),
  aws: "N",
  lat: 37.4882034,
  lon: 126.9276843,
};

customRequest(getUrlWithParams(proxyUrl + weatherUrl, weatherParams))
  .then((data) => {
    // console.log(data);
    document.getElementById("weather").innerHTML = data;
  })
  .catch((error) => {
    console.error(error);
  });
