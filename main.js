/**
 * メインエントリーポイント
 * LIFFからのフォーム送信、またはLINE Webhookを処理します。
 */
function doPost(e) {
  try {
    // JSONリクエストの場合（LIFFからのフォーム送信）
    if (e.postData && e.postData.type === 'application/json') {
      var data = JSON.parse(e.postData.contents);

      // action に応じて処理を分岐
      if (data.action === 'submitAttendance') {
        return handleLiffFormSubmission(data);
      }
    }

    // それ以外は従来のWebhookハンドラー
    return handleLineWebhook(e);

  } catch (err) {
    console.error('doPost Error:', err);
    return createJsonResponse({ success: false, message: err.toString() });
  }
}

/**
 * GETリクエスト（LIFFからのフォーム設定取得、フォーム送信など）
 */
function doGet(e) {
  try {
    // URLパラメータからactionを取得
    var params = e.parameter;

    // フォーム設定を取得
    if (params.action === 'getFormConfig') {
      var formId = params.formId || '1';
      var config = getFormConfig(formId);
      if (config) {
        return createJsonResponse({ success: true, config: config });
      } else {
        return createJsonResponse({ success: false, message: 'フォーム設定が見つかりません: ' + formId });
      }
    }

    // フォーム送信を処理
    if (params.action === 'submitAttendance') {
      var data = {
        userId: params.userId,
        userName: params.userName,
        attendance: params.attendance,
        formKey: params.formKey || '1'
      };
      return handleLiffFormSubmission(data);
    }

    // デフォルト: API動作確認
    return createJsonResponse({
      success: true,
      message: 'API is running',
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('doGet Error:', err);
    return createJsonResponse({ success: false, message: err.toString() });
  }
}

/**
 * JSONレスポンスを作成するヘルパー関数
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
