// 데이터 인덱싱
const dataIndex = async (dataName) => {
  let dataIndexMap;

  try {
    // 데이터 로드
    const resp = await fetch(dataName);
    const jsonData = await resp.json();

    // Map을 사용한 데이터 인덱싱
    dataIndexMap = new Map();

    console.time("데이터 인덱싱");

    jsonData.forEach((item) => {
      const key = `${item.gridX}_${item.gridY}`;

      if (!dataIndexMap.has(key)) {
        dataIndexMap.set(key, []);
      }

      dataIndexMap.get(key).push(item);
    });

    console.timeEnd("데이터 인덱싱");
    console.log(
      `총 ${jsonData.length}개 데이터 인덱싱 완료, Data 수: ${dataIndexMap.size}`
    );
  } catch (error) {
    console.error("데이터 로드 실패: ", error);
  }

  return dataIndexMap;
};
