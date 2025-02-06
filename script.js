/*****************************************************
 * カレンダー + Geolocation + OpenWeatherMap (/forecast)
 * 
 * 3時間刻みの5日間予報 -> 日別に集計してカレンダーに表示
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
//   { "YYYY-MM-DD": {tempMin, tempMax, humidity, icon, description}, ... }
// -----------------------------------------
let forecastDaily = {}; 

// -----------------------------------------
// ページ読み込み後
// -----------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  renderCalendar(currentYear, currentMonth);

  // 月ジャンプボタン
  document.getElementById("jumpBtn").addEventListener("click", jumpToMonth);

  // 位置情報 -> /forecast呼び出し
  document.getElementById("getLocationBtn").addEventListener("click", () => {
    getLocationAndFetchForecast();
  });
});

/* =======================================
   1) カレンダー描画
======================================= */
function renderCalendar(year, month) {
  const titleEl = document.getElementById("monthTitle");
  titleEl.textContent = `${year}年 ${month + 1}月`;

  const gridEl = document.getElementById("calendarGrid");
  gridEl.innerHTML = "";

  // (1) 曜日ヘッダー
  const weekdays = ["日","月","火","水","木","金","土"];
  for (let i = 0; i < 7; i++) {
    const cell = document.createElement("div");
    cell.classList.add("day-cell", "weekday-header");
    cell.textContent = weekdays[i];
    gridEl.appendChild(cell);
  }

  // (2) 月初め、月末など
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth  = new Date(year, month + 1, 0);
  const startWeek = firstDayOfMonth.getDay();
  const endDate   = lastDayOfMonth.getDate();
  // 前月末
  const prevLastDate = new Date(year, month, 0).getDate();

  // (3) 42セルぶん日付を埋める
  for (let i = 0; i < 42; i++) {
    const cell = document.createElement("div");
    cell.classList.add("day-cell");

    const dateNum = i - startWeek + 1;
    let dispYear = year;
    let dispMonth = month;
    let dispDate = dateNum;

    // 前月
    if (dateNum <= 0) {
      dispMonth = month - 1;
      if (dispMonth < 0) {
        dispYear--;
        dispMonth = 11;
      }
      dispDate = prevLastDate + dateNum;
      cell.classList.add("other-month");
    }
    // 次月
    else if (dateNum > endDate) {
      dispMonth = month + 1;
      if (dispMonth > 11) {
        dispYear++;
        dispMonth = 0;
      }
      dispDate = dateNum - endDate;
      cell.classList.add("other-month");
    }

    // 今日判定
    const dayNumEl = document.createElement("div");
    dayNumEl.classList.add("day-num");
    if (
      dispYear === todayYear &&
      dispMonth === todayMonth &&
      dispDate === todayDate
    ) {
      dayNumEl.innerHTML = `<span class="today-mark">${dispDate}</span>`;
    } else {
      dayNumEl.textContent = dispDate;
    }
    cell.appendChild(dayNumEl);

    // (4) YYYY-MM-DD
    const yyyy = dispYear;
    const mm   = String(dispMonth + 1).padStart(2, "0");
    const dd   = String(dispDate).padStart(2, "0");
    const dateKey = `${yyyy}-${mm}-${dd}`;

    // (5) もし forecastDaily[dateKey] があれば天気を表示
    if (forecastDaily[dateKey]) {
      const fData = forecastDaily[dateKey];
      // アイコン
      const iconUrl = `https://openweathermap.org/img/wn/${fData.icon}@2x.png`;
      const iconImg = document.createElement("img");
      iconImg.src = iconUrl;
      iconImg.classList.add("weather-icon");
      cell.appendChild(iconImg);

      // テキスト (min/max, 湿度, 説明)
      const weatherText = document.createElement("div");
      weatherText.classList.add("weather-text");
      weatherText.textContent =
        `↑${Math.round(fData.tempMax)}°C / ↓${Math.round(fData.tempMin)}°C ` +
        `湿度:${fData.humidity}%  ${fData.description}`;
      cell.appendChild(weatherText);
    }

    gridEl.appendChild(cell);
  }
}

/* =======================================
   2) 年月ジャンプボタン
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
   3) 位置情報 -> /data/2.5/forecast
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

      // forecastを取得
      await fetch5DaysForecast(lat, lon);

      // 取得後にカレンダー再描画
      renderCalendar(currentYear, currentMonth);
    },
    (err) => {
      console.error("位置情報の取得に失敗:", err);
      alert("位置情報を取得できませんでした。");
    }
  );
}

/* =======================================
   4) /data/2.5/forecast で3時間ごとの5日分を取得
   -> 日ごとに集計し、forecastDailyに格納
======================================= */
async function fetch5DaysForecast(lat, lon) {
  // ★あなたのキーを文字列リテラルで入れてください
  const apiKey = "66dba5f350434a05cc43ec76775e60ad";

  // リクエストURL
  const url = `https://api.openweathermap.org/data/2.5/forecast`
            + `?lat=${lat}`
            + `&lon=${lon}`
            + `&units=metric`
            + `&lang=ja`
            + `&appid=${apiKey}`;

  console.log("コピーしてブラウザに貼り付けて試すURL:", url);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("予報APIの呼び出しに失敗");
    }
    const data = await res.json();
    console.log("3時間刻みの予報データ:", data);

    // data.list[] を日付ごとにまとめる
    parseForecastData(data.list);

  } catch (error) {
    console.error("予報データの取得に失敗:", error);
    alert("天気予報を取得できませんでした。");
  }
}

/* =======================================
   5) list[] を「YYYY-MM-DD」ごとの min/max/humidity/icon に集計
======================================= */
function parseForecastData(list) {
  // 一旦、日付文字列をキーにして3時間刻みデータをまとめる
  const dayMap = {}; 
  list.forEach(item => {
    // "2025-02-04 09:00:00" のような日付文字列
    const dtTxt = item.dt_txt; 
    // "2025-02-04"だけ切り出し
    const dateStr = dtTxt.split(" ")[0];

    if (!dayMap[dateStr]) {
      dayMap[dateStr] = [];
    }
    dayMap[dateStr].push(item);
  });

  // まとめ終わったら、日ごとに min, max, avgHumidity, 先頭のiconなどを算出
  const result = {};

  for (const dateStr in dayMap) {
    const arr = dayMap[dateStr];
    let tempMin = Infinity;
    let tempMax = -Infinity;
    let sumHumidity = 0;

    // アイコンや天気説明は最初のデータを代表とする(やり方はお好みで)
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

  // グローバル変数 forecastDaily に格納し、renderCalendarで参照
  forecastDaily = result;
  console.log("日別まとめ:", forecastDaily);
}


