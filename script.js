/*****************************************************
 * カレンダー + Geolocation + Netlify Functions
 * 
 * サーバーレス関数を呼んで天気予報を取得 → カレンダー表示
 *****************************************************/

// -----------------------------------------
// A) 日付情報
// -----------------------------------------
const now = new Date();
const todayYear = now.getFullYear();
const todayMonth = now.getMonth();
const todayDate = now.getDate();

// 表示中のカレンダー年月 (例: 2025年2月)
let currentYear = 2025;
let currentMonth = 1; // 0=1月,1=2月,...

// -----------------------------------------
// B) 取得した「日別の予報」データを保持
let forecastDaily = {}; 

// -----------------------------------------
// ページ読み込み後
// -----------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  renderCalendar(currentYear, currentMonth);

  // 月ジャンプ
  document.getElementById("jumpBtn").addEventListener("click", jumpToMonth);

  // 現在地取得してサーバーレス関数呼び出し
  document.getElementById("getLocationBtn").addEventListener("click", () => {
    getLocationAndFetchForecast();
  });
});

/* =======================================
   1) カレンダー描画(既存)
======================================= */
function renderCalendar(year, month) {
  // ... ここは既存のカレンダー描画ロジックそのまま ...
  // (省略)
}

/* =======================================
   2) 年月ジャンプボタン(既存)
======================================= */
function jumpToMonth() {
  const ySel = document.getElementById("jumpYear");
  const mSel = document.getElementById("jumpMonth");
  const y = parseInt(ySel.value, 10);
  const m = parseInt(mSel.value, 10);

  currentYear = y;
  currentMonth = m;
  renderCalendar(currentYear, currentMonth);
}

/* =======================================
   3) 位置情報 -> サーバーレス関数呼び出し
======================================= */
function getLocationAndFetchForecast() {
  if (!("geolocation" in navigator)) {
    alert("ブラウザが位置情報に対応していません。");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      console.log("現在地:", lat, lon);

      // サーバーレス関数を呼び出して予報を取得
      await callServerlessFunction(lat, lon);

      // 再描画
      renderCalendar(currentYear, currentMonth);
    },
    (err) => {
      console.error("位置情報の取得に失敗:", err);
      alert("位置情報を取得できませんでした。");
    }
  );
}

/* =======================================
   4) サーバーレス関数を呼び出して天気データを取得
======================================= */
async function callServerlessFunction(lat, lon) {
  // Netlify Functionsのエンドポイント (相対パス)
  // デプロイ後: https://<your-site>.netlify.app/.netlify/functions/getWeather?lat=xxx&lon=yyy
  const url = `/.netlify/functions/getweather?lat=${lat}&lon=${lon}`;
  console.log("呼び出しURL:", url);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("サーバーレス関数の呼び出しに失敗");
    }
    const data = await res.json();
    console.log("サーバーレス関数からの予報データ:", data);

    // data.list[] を日付ごとにまとめる
    parseForecastData(data.list);

  } catch (error) {
    console.error("予報データの取得に失敗:", error);
    alert("天気予報を取得できませんでした。");
  }
}

/* =======================================
   5) 日ごとに min/max/humidity/icon を集計
======================================= */
function parseForecastData(list) {
  const dayMap = {}; 
  list.forEach(item => {
    const dtTxt = item.dt_txt; 
    const dateStr = dtTxt.split(" ")[0];

    if (!dayMap[dateStr]) {
      dayMap[dateStr] = [];
    }
    dayMap[dateStr].push(item);
  });

  const result = {};

  for (const dateStr in dayMap) {
    const arr = dayMap[dateStr];
    let tempMin = Infinity;
    let tempMax = -Infinity;
    let sumHumidity = 0;

    let icon = arr[0].weather[0].icon;
    let description = arr[0].weather[0].description;

    arr.forEach(obj => {
      const t = obj.main.temp;
      if (t < tempMin) tempMin = t;
      if (t > tempMax) tempMax = t;
      sumHumidity += obj.main.humidity;
    });

    const avgHum = sumHumidity / arr.length;

    result[dateStr] = {
      tempMin: tempMin,
      tempMax: tempMax,
      humidity: Math.round(avgHum),
      icon: icon,
      description: description
    };
  }

  forecastDaily = result;
  console.log("日別まとめ:", forecastDaily);
}


