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
  var range = e.range;
  var sheet = range.getSheet();
  var row = range.getRow();

  console.log('NamedValues:', JSON.stringify(namedValues));

  var userId = namedValues[config.COLUMNS.USER_ID] ? namedValues[config.COLUMNS.USER_ID][0] : null;
  var userName = namedValues[config.COLUMNS.NAME] ? namedValues[config.COLUMNS.NAME][0] : 'Unknown';
  var bambooNoFromForm = namedValues[config.COLUMNS.BAMBOO_NO] ? namedValues[config.COLUMNS.BAMBOO_NO][0] : null;
  var attendanceStatus = namedValues[config.COLUMNS.STATUS] ? namedValues[config.COLUMNS.STATUS][0] : '未回答';

  if (!userId) {
    console.warn('User ID not found in response.');
    return;
  }

  var userInfo = syncBambooUser(userId, bambooNoFromForm, userName);

  if (userInfo && userInfo.bambooNo !== '未登録') {
    // 【追加】回答シートのE列（5列目）に竹号を書き込む
    sheet.getRange(row, 5).setValue(userInfo.bambooNo);

    var replyText = CONFIG.REPLY_MESSAGE_TEMPLATE
      .replace('{bambooNo}', userInfo.bambooNo)
      .replace('{status}', attendanceStatus);

    console.log('Sending message to ' + userId + ': ' + replyText);
    sendLineMessage(userId, replyText);
  } else {
    console.warn('UserInfo match failed or Bamboo No is not registered for: ' + userName);
    // 竹号が特定できなかった場合もE列に「未登録」と記録
    sheet.getRange(row, 5).setValue('未登録');
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

  // 1. User ID で最速検索
  for (var i = 1; i < data.length; i++) {
    if (data[i][col.USER_ID] === userId) {
      return {
        userId: userId,
        bambooNo: data[i][col.BAMBOO_NO],
        name: data[i][col.NAME]
      };
    }
  }

  // 2. 竹号で検索
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

  // 3. LINE名で検索
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

/**
 * トリガーをプログラムで作成する関数
 * 【重要】この関数をGASエディタで一度だけ手動実行してください。
 * 実行すると、CONFIG.FORMS に登録されたすべてのスプレッドシートに対して
 * 「フォーム送信時」トリガーが自動的に作成されます。
 */
function setupTriggers() {
  // 既存のトリガーをすべて削除（重複防止）
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'onFormSubmit') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // CONFIG.FORMS の各スプレッドシートに対してトリガーを作成
  CONFIG.FORMS.forEach(function (formConfig) {
    try {
      var ss = SpreadsheetApp.openById(formConfig.RESPONSE_SHEET_ID);
      ScriptApp.newTrigger('onFormSubmit')
        .forSpreadsheet(ss)
        .onFormSubmit()
        .create();
      console.log('Trigger created for: ' + formConfig.NAME);
    } catch (e) {
      console.error('Failed to create trigger for ' + formConfig.NAME + ': ' + e.message);
    }
  });

  console.log('Trigger setup completed!');
}
