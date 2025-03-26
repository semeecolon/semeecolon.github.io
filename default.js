// Define Functions

// API 요청
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

// URL 쿼리스트링 추가
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

// 현재위치 찾기
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

// 하버사인 공식을 사용한 두 지점 간 거리 계산 (km 단위)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371.00877; // 지구 반경 (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // km 단위 거리
}

// 위치정보를 통한 지역찾기
function findNearRegionByLocation(locationInfo, indexedData) {
  // 1. 격자 좌표로 후보 지역 필터링
  const key = `${locationInfo.x}_${locationInfo.y}`;
  const candidates = indexedData.get(key) || [];
  console.log(`지역 후보군: ${candidates.length}개`);

  if (candidates.length === 0) return null;

  // 2. 가장 가까운 지역 찾기
  let nearestRegion = null;
  let minDistance = Infinity;

  for (const region of candidates) {
    const regionLat = parseFloat(region.latitudeDecimal);
    const regionLon = parseFloat(region.longitudeDecimal);

    const distance = calculateDistance(
      locationInfo.lat,
      locationInfo.lon,
      regionLat,
      regionLon
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestRegion = region;
    }
  }

  return {
    region: nearestRegion,
    distance: minDistance, // km 단위
  };
}
