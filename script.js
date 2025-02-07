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

  // 月ジャンプボタン
  document.getElementById("jumpBtn").addEventListener("click", jumpToMonth);

  // 現在地を取得してサーバーレス関数を呼び出す
  document.getElementById("getLocationBtn").addEventListener("click", () => {
    getLocationAndFetchForecast();
  });
});

/* =======================================
   1) カレンダー描画
======================================= */
function renderCalendar(year, month) {
  // カレンダーのタイトルをセット
  const titleEl = document.getElementById("monthTitle");
  titleEl.textContent = `${year}年 ${month + 1}月`;

  // カレンダー本体（グリッド）をクリア
  const gridEl = document.getElementById("calendarGrid");
  gridEl.innerHTML = "";

  // (1) 曜日ヘッダーを作る
  const weekdays = ["日","月","火","水","木","金","土"];
  for (let i = 0; i < 7; i++) {
    const cell = document.createElement("div");
    cell.classList.add("day-cell", "weekday-header");
    cell.textContent = weekdays[i];
    gridEl.appendChild(cell);
  }

  // 月初日・月末日などを計算
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth  = new Date(year, month + 1, 0);
  const startWeek = firstDayOfMonth.getDay();   // 月の最初の曜日 (0=日,1=月,...)
  const endDate   = lastDayOfMonth.getDate();   // 月末日 (28~31)
  
  // 前月末日
  const prevLastDate = new Date(year, month, 0).getDate();

  // (2) 合計 42セルぶん日付を埋める(7x6)
  for (let i = 0; i < 42; i++) {
    const cell = document.createElement("div");
    cell.classList.add("day-cell");

    // 表示する日付計算
    const dateNum = i - startWeek + 1;
    let dispYear = year;
    let dispMonth = month;
    let dispDate = dateNum;

    // 前月
    if (dateNum <= 0) {
      dispMonth = month - 1;
      if (dispMonth < 0) {
        dispYear--;
        dispMonth = 11; // 前年の12月
      }
      dispDate = prevLastDate + dateNum;
      cell.classList.add("other-month");
    }
    // 翌月
    else if (dateNum > endDate) {
      dispMonth = month + 1;
      if (dispMonth > 11) {
        dispYear++;
        dispMonth = 0; // 翌年の1月
      }
      dispDate = dateNum - endDate;
      cell.classList.add("other-month");
    }

    // 日付数字(右上に表示)
    const dayNumEl = document.createElement("div");
    dayNumEl.classList.add("day-num");
    if (dispYear === todayYear && dispMonth === todayMonth && dispDate === todayDate) {
      // 今日の日付を赤丸
      dayNumEl.innerHTML = `<span class="today-mark">${dispDate}</span>`;
    } else {
      dayNumEl.textContent = dispDate;
    }
    cell.appendChild(dayNumEl);

    // 日付キー (YYYY-MM-DD)
    const yyyy = dispYear;
    const mm   = String(dispMonth + 1).padStart(2, "0");
    const dd   = String(dispDate).padStart(2, "0");
    const dateKey = `${yyyy}-${mm}-${dd}`;

    // (3) もし forecastDaily[dateKey] があれば天気を表示
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

      // サーバーレス関数を呼び出して予報データを取得
      await callServerlessFunction(lat, lon);

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
   4) サーバーレス関数を呼び出して天気データを取得
======================================= */
async function callServerlessFunction(lat, lon) {
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
    // "2025-02-04 09:00:00" → "2025-02-04"
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


