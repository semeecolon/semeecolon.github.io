const cardinalDirections = [
  { val: 0, dir: "N", desc: "북" },
  { val: 1, dir: "NNE", desc: "북북동" },
  { val: 2, dir: "NE", desc: "북동" },
  { val: 3, dir: "ENE", desc: "동북동" },
  { val: 4, dir: "E", desc: "동" },
  { val: 5, dir: "ESE", desc: "동남동" },
  { val: 6, dir: "SE", desc: "남동" },
  { val: 7, dir: "SSE", desc: "남남동" },
  { val: 8, dir: "S", desc: "남" },
  { val: 9, dir: "SSW", desc: "남남서" },
  { val: 10, dir: "SW", desc: "남서" },
  { val: 11, dir: "WSW", desc: "서남서" },
  { val: 12, dir: "W", desc: "서" },
  { val: 13, dir: "WNW", desc: "서북서" },
  { val: 14, dir: "NW", desc: "북서" },
  { val: 15, dir: "NNW", desc: "북북서" },
  { val: 16, dir: "N", desc: "북" },
];

const rainTypes = [
  { val: "0", desc: "없음" },
  { val: "1", desc: "비" },
  { val: "2", desc: "비/눈" },
  { val: "3", desc: "눈" },
  { val: "4", desc: "소나기" },
  { val: "5", desc: "빗방울" },
  { val: "6", desc: "빗방울/눈날림" },
  { val: "7", desc: "눈날림" },
];

const categoryNames = [
  { order: 0, category: "T1H", unit: "℃", name: "기온" },
  { order: 1, category: "FL", unit: "℃", name: "체감" },
  { order: 2, category: "REH", unit: "%", name: "습도" },
  {
    order: 3,
    category: "VEC",
    unit: null,
    name: "풍향",
    additionalCodes: cardinalDirections,
  },
  { order: 4, category: "WSD", unit: "m/s", name: "풍속" },
  { order: 5, category: "RN1", unit: "mm", name: "1시간 강수량" },
  {
    order: 6,
    category: "PTY",
    unit: null,
    name: "강수형태",
    additionalCodes: rainTypes,
  },
  { order: 7, category: "UUU", unit: "m/s", name: "풍속(동서바람성분)" },
  { order: 8, category: "VVV", unit: "m/s", name: "풍속(남북바람성분)" },
];

const errorCodes = [
  {
    code: "00",
    message: "NORMAL_SERVICE",
    description: "정상",
  },
  {
    code: "01",
    message: "APPLICATION_ERROR",
    description: "어플리케이션 에러",
  },
  {
    code: "02",
    message: "DB_ERROR",
    description: "데이터베이스 에러",
  },
  {
    code: "03",
    message: "NODATA_ERROR",
    description: "데이터없음 에러",
  },
  {
    code: "04",
    message: "HTTP_ERROR",
    description: "HTTP 에러",
  },
  {
    code: "05",
    message: "SERVICETIME_OUT",
    description: "서비스 연결실패 에러",
  },
  {
    code: "10",
    message: "INVALID_REQUEST_PARAMETER_ERROR",
    description: "잘못된 요청 파라미터 에러",
  },
  {
    code: "11",
    message: "NO_MANDATORY_REQUEST_PARAMETERS_ERROR",
    description: "필수요청 파라미터가 없음",
  },
  {
    code: "12",
    message: "NO_OPENAPI_SERVICE_ERROR",
    description: "해당 오픈API 서비스가 없거나 폐기됨",
  },
  {
    code: "20",
    message: "SERVICE_ACCESS_DENIED_ERROR",
    description: "서비스 접근거부",
  },
  {
    code: "21",
    message: "TEMPORARILY_DISABLE_THE_SERVICEKEY_ERROR",
    description: "일시적으로 사용할 수 없는 서비스 키",
  },
  {
    code: "22",
    message: "LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR",
    description: "서비스 요청 제한횟수 초과에러",
  },
  {
    code: "30",
    message: "SERVICE_KEY_IS_NOT_REGISTERED_ERROR",
    description: "등록되지 않은 서비스키",
  },
  {
    code: "31",
    message: "DEADLINE_HAS_EXPIRED_ERROR",
    description: "기한만료된 서비스키",
  },
  {
    code: "32",
    message: "UNREGISTERED_IP_ERROR",
    description: "등록되지 않은 IP",
  },
  {
    code: "33",
    message: "UNSIGNED_CALL_ERROR",
    description: "서명되지 않은 호출",
  },
  {
    code: "99",
    message: "UNKNOWN_ERROR",
    description: "기타에러",
  },
];

const endpoint = {
  ultraSrtNcst:
    "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst",
};

const serviceKey =
  "Awnj4I8fyeEvs1tk9YC8SLUFU031klHWIS3wZ1KI9HfJlA70m7xKfiENcIvvF3aGx+L2QhI9CkIfLa9PSNIpGg==";
