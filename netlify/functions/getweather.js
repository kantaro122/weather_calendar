// ※ Node.js環境でfetchを使うために "node-fetch" を利用
//   Netlifyの最新ランタイムではグローバルfetchが使える場合もありますが、
//   互換性を考えて node-fetch をrequireする方法を紹介します。

const fetch = require("node-fetch");

// Netlify Functions のエントリーポイント
exports.handler = async (event, context) => {
  try {
    // --- 1) クエリパラメータから lat, lon を受け取る例 ---
    //    フロントエンドで  "?lat=35&lon=139" のように指定する
    const lat = event.queryStringParameters.lat;
    const lon = event.queryStringParameters.lon;

    // 入力チェック(無いとエラー)
    if (!lat || !lon) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "lat and lon query parameters are required." }),
      };
    }

    // --- 2) Netlifyの環境変数から APIキーを取得 ---
    //     (Netlifyダッシュボードの「Environment variables」で設定したもの)
    const apiKey = process.env.API_KEY;

    // --- 3) OpenWeatherMapのURLを作成 (5日間 / 3時間刻み forecast) ---
    //     units=metric → 摂氏
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;

    // --- 4) fetch で外部APIを呼び出し ---
    const response = await fetch(url);
    if (!response.ok) {
      // レスポンスが200系でない場合、エラーとして返す
      return {
        statusCode: response.status,
        body: `Error: ${response.statusText}`,
      };
    }

    // JSONとしてパース
    const data = await response.json();

    // --- 5) 結果をJSON形式で返す ---
    return {
      statusCode: 200,
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json"
      },
    };

  } catch (error) {
    // 例外が起きた場合は 500 ステータスでエラー情報を返す
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Server Error",
        error: error.toString()
      }),
    };
  }
};
