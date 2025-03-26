// 날짜 포맷
const formatDate = (date) => {
  // yyyyMMdd
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const yyyyMMdd = `${year}${month}${day}`;

  // HHmm
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const HHmm = `${hours}${minutes}`;

  return { yyyyMMdd, HHmm };
};

// 초단기 실황 API 파라미터 날짜/시간
const getUltraSrtDate = () => {
  // 현재 시간
  const now = new Date();

  // 현재 분이 10분 이전이면 10분 차감
  const minutes = now.getMinutes();

  if (minutes < 10) {
    now.setMinutes(now.getMinutes() - 10);
  }

  const yesterday = new Date();
  yesterday.setHours(yesterday.getHours() - 23);
  yesterday.setMinutes(yesterday.getMinutes() - 59);

  return { now: formatDate(now), yesterday: formatDate(yesterday) };
};
