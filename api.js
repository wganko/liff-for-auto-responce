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

  // ログ出力（デバッグ用：Apps Scriptの「実行数」から確認可能）
  console.log('NamedValues:', JSON.stringify(namedValues));

  var userId = namedValues[config.COLUMNS.USER_ID] ? namedValues[config.COLUMNS.USER_ID][0] : null;
  var userName = namedValues[config.COLUMNS.NAME] ? namedValues[config.COLUMNS.NAME][0] : 'Unknown';
  var bambooNoFromForm = namedValues[config.COLUMNS.BAMBOO_NO] ? namedValues[config.COLUMNS.BAMBOO_NO][0] : null;
  var attendanceStatus = namedValues[config.COLUMNS.STATUS] ? namedValues[config.COLUMNS.STATUS][0] : '未回答';

  if (!userId) {
    console.warn('User ID not found in response.');
    return;
  }

  // 竹号リストとの照合
  // 1. User ID で検索
  // 2. なければ竹号で検索（初回のみ）
  // 3. なければLINE名で検索（バックアップ）
  var userInfo = syncBambooUser(userId, bambooNoFromForm, userName);

  if (userInfo && userInfo.bambooNo !== '未登録') {
    var replyText = CONFIG.REPLY_MESSAGE_TEMPLATE
      .replace('{bambooNo}', userInfo.bambooNo)
      .replace('{status}', attendanceStatus);

    console.log('Sending message to ' + userId + ': ' + replyText);
    sendLineMessage(userId, replyText);
  } else {
    console.warn('UserInfo match failed or Bamboo No is not registered for: ' + userName);
    // 照合失敗時もログを頼りに特定できるようにする
  }
}

/**
 * 竹号リストシートとの同期ロジック
 */
function syncBambooUser(userId, bambooNo, lineName) {
  var ss = SpreadsheetApp.openById(CONFIG.BAMBOO_SHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.BAMBOO_SHEET_NAME);
  var data = sheet.getDataRange().getValues();

  var col = CONFIG.BAMBOO_COL;

  // 1. User ID で最速検索（既に紐付け済みの人）
  for (var i = 1; i < data.length; i++) {
    if (data[i][col.USER_ID] === userId) {
      return {
        userId: userId,
        bambooNo: data[i][col.BAMBOO_NO],
        name: data[i][col.NAME]
      };
    }
  }

  // 2. User ID で見つからない場合、竹号で検索（初回回答時）
  if (bambooNo) {
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][col.BAMBOO_NO]) === String(bambooNo)) {
        sheet.getRange(i + 1, col.USER_ID + 1).setValue(userId);
        return {
          userId: userId,
          bambooNo: data[i][col.BAMBOO_NO],
          name: data[i][col.NAME]
        };
      }
    }
  }

  // 3. User ID も竹号も見つからない場合、LINE名で検索（念のため）
  if (lineName) {
    for (var i = 1; i < data.length; i++) {
      if (data[i][col.NAME] === lineName) {
        sheet.getRange(i + 1, col.USER_ID + 1).setValue(userId);
        return {
          userId: userId,
          bambooNo: data[i][col.BAMBOO_NO],
          name: data[i][col.NAME]
        };
      }
    }
  }

  return { bambooNo: '未登録' };
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

  var res = UrlFetchApp.fetch(url, options);
  console.log('LINE API Response:', res.getContentText());
}
