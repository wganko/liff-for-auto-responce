/**
 * メインエントリーポイント
 * LINE WebhookからのPOSTリクエストを処理します。
 */
function doPost(e) {
  // api.js に定義された Webhook ハンドラーを呼び出す
  return handleLineWebhook(e);
}
