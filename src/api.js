/**
 * アプリケーションロジックとユーティリティ関数
 */

/**
 * LINE Webhook ハンドラー
 */
function handleLineWebhook(e) {
  if (!e || !e.postData) {
    return ContentService.createTextOutput('No Data').setMimeType(ContentService.MimeType.TEXT);
  }
  return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
}

/**
 * フォーム回答送信時のイベントハンドラー
 */
function onFormSubmit(e) {
  try {
    var range = e.range;
    var sheet = range.getSheet();
    var spreadsheet = sheet.getParent();
    var sheetId = spreadsheet.getId();

    var formConfig = CONFIG.FORMS.find(function (f) {
      return f.RESPONSE_SHEET_ID === sheetId;
    });

    if (!formConfig) {
      console.warn('Config not found for spreadsheet: ' + sheetId);
      return;
    }

    processAttendanceResponse(e, formConfig);

  } catch (err) {
    console.error('onFormSubmit Error:', err);
  }
}

/**
 * 回答データの処理
 */
function processAttendanceResponse(e, config) {
  var namedValues = e.namedValues;

  var userId = namedValues[config.COLUMNS.USER_ID] ? namedValues[config.COLUMNS.USER_ID][0] : null;
  var bambooNoFromForm = namedValues[config.COLUMNS.BAMBOO_NO] ? namedValues[config.COLUMNS.BAMBOO_NO][0] : null;
  var attendanceStatus = namedValues[config.COLUMNS.STATUS] ? namedValues[config.COLUMNS.STATUS][0] : '未回答';

  if (!userId) {
    console.warn('User ID not found in response.');
    return;
  }

  // 竹号リストとの照合・User IDの紐付け
  // 氏名ではなく「竹号」をキーとして初回紐付けを行う
  var userInfo = syncBambooUser(userId, bambooNoFromForm);

  if (userInfo) {
    var replyText = CONFIG.REPLY_MESSAGE_TEMPLATE
      .replace('{bambooNo}', userInfo.bambooNo)
      .replace('{status}', attendanceStatus);

    sendLineMessage(userId, replyText);
  }
}

/**
 * 竹号リストシートとの同期ロジック
 * 1. まず User ID で検索
 * 2. 見つからない場合、竹号で検索し、見つかれば User ID をその行に保存（紐付け）
 */
function syncBambooUser(userId, bambooNo) {
  if (!bambooNo) return null;

  var ss = SpreadsheetApp.openById(CONFIG.BAMBOO_SHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.BAMBOO_SHEET_NAME);
  var data = sheet.getDataRange().getValues();

  var col = CONFIG.BAMBOO_COL;

  // 1. User ID で検索（登録済みの場合）
  for (var i = 1; i < data.length; i++) {
    if (data[i][col.USER_ID] === userId) {
      return {
        userId: userId,
        bambooNo: data[i][col.BAMBOO_NO],
        name: data[i][col.NAME]
      };
    }
  }

  // 2. User ID で見つからない場合、竹号で検索（初回紐付け）
  for (var i = 1; i < data.length; i++) {
    // スプレッドシート側のデータ（数値・文字列）を考慮して文字列比較
    if (String(data[i][col.BAMBOO_NO]) === String(bambooNo)) {
      // 一致する竹号が見つかった場合、User ID を記録して紐付ける
      sheet.getRange(i + 1, col.USER_ID + 1).setValue(userId);
      console.log('Linked User ID ' + userId + ' to Bamboo No ' + bambooNo);
      return {
        userId: userId,
        bambooNo: data[i][col.BAMBOO_NO],
        name: data[i][col.NAME]
      };
    }
  }

  return null;
}

/**
 * LINEメッセージ送信
 */
function sendLineMessage(userId, text) {
  var url = 'https://api.line.me/v2/bot/message/push';
  var payload = {
    to: userId,
    messages: [{ type: 'text', text: text }]
  };

  var options = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + CONFIG.LINE_CHANNEL_ACCESS_TOKEN
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    UrlFetchApp.fetch(url, options);
  } catch (e) {
    console.warn('Failed to send LINE message: ' + e.message);
  }
}
