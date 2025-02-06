// test-weather.js (例)

const apiKey = "66dba5f350434a05cc43ec76775e60ad"; // 本物のキーを入れる

async function fetchCurrentWeather(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather`
           + `?lat=${lat}`
           + `&lon=${lon}`
           + `&units=metric`
           + `&lang=ja`
           + `&appid=${apiKey}`;

  console.log("コピーしてブラウザに貼り付けて試すURL:", url);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("天気APIの呼び出しに失敗");
    }
    const data = await res.json();
    console.log("現在の天気データ:", data);
    return data;
  } catch (error) {
    console.error("天気データの取得に失敗:", error);
    alert("天気を取得できませんでした。");
    return null;
  }
}

function getLocationAndFetchWeather() {
  if (!("geolocation" in navigator)) {
    alert("位置情報に対応していません。");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      console.log("現在地:", lat, lon);

      const weather = await fetchCurrentWeather(lat, lon);
      if (weather) {
        console.log("取得成功！");
      }
    },
    (err) => {
      console.error("位置情報取得に失敗:", err);
      alert("位置情報を取得できませんでした。");
    }
  );
}

// ページ読み込み後にボタンを設定
window.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("getLocationBtn");
  if (btn) {
    btn.addEventListener("click", getLocationAndFetchWeather);
  }
});
