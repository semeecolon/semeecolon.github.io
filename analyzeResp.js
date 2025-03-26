// Description: 응답 데이터 분석 함수 모음

// -------------------------------------------------------------------
// 공통
// -------------------------------------------------------------------

// 섭씨-화씨 변환
const celsiusToFahrenheit = (celsius) => {
  if (celsius === null) return null;
  return celsius * 1.8 + 32;
};

// 화씨-섭씨 변환
const fahrenheitToCelsius = (fahrenheit) => {
  if (fahrenheit === null) return null;
  return (fahrenheit - 32) / 1.8;
};

// -------------------------------------------------------------------
// 기능별
// -------------------------------------------------------------------

// 체감온도 계산기
const calcWindChill = (temp, windSpeed) => {
  // 조건 확인: 기온 10°C 이하, 풍속 4.8km/h 이상
  if (temp > 10 || windSpeed < 4.8) {
    return temp; // 조건에 맞지 않으면 실제 기온 반환
  }

  // 미국 기상청(NWS) 체감온도 공식
  const windChill =
    13.12 +
    0.6215 * temp -
    11.37 * Math.pow(windSpeed, 0.16) +
    0.3965 * temp * Math.pow(windSpeed, 0.16);

  // 소수점 첫째 자리까지 반올림
  return Math.round(windChill * 10) / 10;
};

// 열지수 계산기
const calcHeatIndex = (tempF, humidity) => {
  // 화씨 온도가 80°F 미만이면 체감온도는 기온과 동일
  if (tempF < 80) {
    return tempF;
  }

  // 열지수 계산을 위한 계수
  const c1 = -42.379;
  const c2 = 2.04901523;
  const c3 = 10.14333127;
  const c4 = -0.22475541;
  const c5 = -0.00683783;
  const c6 = -0.05481717;
  const c7 = 0.00122874;
  const c8 = 0.00085282;
  const c9 = -0.00000199;

  // 열지수 계산 공식
  const heatIndex =
    c1 +
    c2 * tempF +
    c3 * humidity +
    c4 * tempF * humidity +
    c5 * Math.pow(tempF, 2) +
    c6 * Math.pow(humidity, 2) +
    c7 * Math.pow(tempF, 2) * humidity +
    c8 * tempF * Math.pow(humidity, 2) +
    c9 * Math.pow(tempF, 2) * Math.pow(humidity, 2);

  // 소수점 첫째 자리까지 반올림
  return Math.round(heatIndex * 10) / 10;
};

// 날씨별 실질온도(체감, 열지수) 계산
const calcApparentTemp = (tempC, windSpeed, humidity, isMps = true) => {
  if (tempC === null || windSpeed === null || humidity === null) return null;

  const windSpeedKph = isMps ? windSpeed * 3.6 : windSpeed; // 1 m/s = 3.6 km/h
  const tempF = celsiusToFahrenheit(tempC) || 0;

  // 추운날씨: 체감온도 계산
  if (tempC <= 10) {
    const windChill = calcWindChill(tempC, windSpeedKph);
    return {
      apparentTemp: windChill,
      method: "체감온도",
      difference: windChill - tempC,
      windSpeedOriginal: windSpeed,
      windSpeedKph: windSpeedKph,
    };
  }
  // 더운날씨: 열지수 계산
  else if (tempF >= 80) {
    const heatIndex = calcHeatIndex(tempF, humidity);
    const heatIndexC = fahrenheitToCelsius(heatIndex) || 0;

    return {
      apparentTemp: heatIndexC,
      method: "열지수",
      difference: heatIndexC - tempC,
    };
  }
  // 그 외: 실제 기온 동일
  else {
    return {
      apparentTemp: tempC,
      method: "실제 기온",
      difference: 0,
    };
  }
};

// 풍향코드 변환
const windDirection = (val) => {
  if (val === null) return null;

  const directionVal = Math.floor((val + 22.5 * 0.5) / 22.5);
  return directionVal;
};

// -------------------------------------------------------------------
// 응답 데이터 분석
// -------------------------------------------------------------------

// 초단기 실황
const analyzeUltraSrtNcst = (resp) => {
  // 응답 코드
  const { resultCode, resultMsg } = resp.response.header;

  if (resultCode !== "00") {
    const error = errorCodes.find((error) => error.code === resultCode);
    console.error("에러:", error);
    return { error };
  }

  const { items } = resp.response.body;
  const { item } = items;

  // item 항목의 baseTime 별 최대값 항목 추출
  const categoryValues = item.reduce((acc, cur) => {
    const { baseTime, category, obsrValue } = cur;

    if (!acc[category]) {
      acc[category] = { baseTime, category, obsrValue };
    } else {
      if (acc[category].baseTime < baseTime) {
        acc[category] = { baseTime, category, obsrValue };
      }
    }
    return acc;
  }, {});

  // 중간 정보 가공
  const { T1H, REH, WSD } = categoryValues;
  const FL = calcApparentTemp(
    parseFloat(T1H?.obsrValue || "0"),
    parseFloat(WSD?.obsrValue || "0"),
    parseFloat(REH?.obsrValue || "0")
  );

  // 기상 정보 항목 데이터 가공
  const result = Object.values(categoryValues)
    .map((item) => {
      const { category, obsrValue } = item;
      const { order, name, unit, additionalCodes } = categoryNames.find(
        (c) => c.category === category
      );

      let organizedObsrValue = obsrValue;

      switch (category) {
        case "T1H": // 기온 - 체감온도
          organizedObsrValue = `${obsrValue} ${unit}`;
          if (FL) {
            organizedObsrValue += ` / 체감 ${FL.apparentTemp} ${unit} (${FL.method})`;
          }
          break;
        case "VEC": // 풍향
          const windCode = windDirection(parseInt(obsrValue));
          organizedObsrValue = additionalCodes.find(
            (c) => c.val === windCode
          ).desc;
          break;
        case "PTY": // 강수형태
          organizedObsrValue =
            additionalCodes.find((c) => c.val === obsrValue).desc || "-";
          break;
        default:
          organizedObsrValue += ` ${unit}`;
          break;
      }

      return {
        order,
        category,
        obsrValue,
        organizedObsrValue,
        name,
        unit,
      };
    })
    .sort((a, b) => a.order - b.order);

  return { result };
};
