/**
 * アプリケーションロジックとユーティリティ関数
 */

/**
 * フォーム設定をマスターシートから取得
 * @param {string} formId - フォームID
 * @returns {Object|null} フォーム設定オブジェクト
 */
function getFormConfig(formId) {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.FORM_CONFIG_SHEET_ID);
    var sheet = ss.getSheetByName(CONFIG.FORM_CONFIG_SHEET_NAME) || ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    var col = CONFIG.FORM_CONFIG_COL;

    // ヘッダー行をスキップして検索
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][col.FORM_ID]) === String(formId)) {
        return {
          formId: data[i][col.FORM_ID],
          title: data[i][col.TITLE],
          date: data[i][col.DATE],
          time: data[i][col.TIME],
          location: data[i][col.LOCATION],
          locationUrl: data[i][col.LOCATION_URL],
          description: data[i][col.DESCRIPTION],
          questionLabel: data[i][col.QUESTION_LABEL] || '出欠',
          option1: data[i][col.OPTION1] || '出席',
          option2: data[i][col.OPTION2] || '欠席',
          responseSheetName: data[i][col.RESPONSE_SHEET_NAME],
          active: data[i][col.ACTIVE]
        };
      }
    }
    return null;
  } catch (err) {
    console.error('getFormConfig Error:', err);
    return null;
  }
}

/**
 * LIFFからのフォーム送信を処理
 * @param {Object} data - フォームデータ
 * @returns {ContentService.TextOutput} JSONレスポンス
 */
function handleLiffFormSubmission(data) {
  try {
    console.log('=== LIFF Form Submission ===');
    console.log('Data:', JSON.stringify(data));

    var userId = data.userId;
    var userName = data.userName;
    var attendance = data.attendance;
    var formKey = data.formKey || '1';

    // フォーム設定をマスターから取得
    var formConfig = getFormConfig(formKey);
    if (!formConfig) {
      throw new Error('フォーム設定が見つかりません: ' + formKey);
    }
    console.log('Form Config:', JSON.stringify(formConfig));

    // 竹号を照合
    var userInfo = syncBambooUser(userId, null, userName);
    var bambooNo = userInfo ? userInfo.bambooNo : '未登録';
    console.log('Bamboo No:', bambooNo);

    // スプレッドシートに記録
    var ss = SpreadsheetApp.openById(CONFIG.RESPONSE_SHEET_ID);
    var sheet = ss.getSheetByName(formConfig.responseSheetName);

    if (!sheet) {
      // シートが存在しない場合は作成
      sheet = ss.insertSheet(formConfig.responseSheetName);
      sheet.appendRow(['タイムスタンプ', '竹号', 'LINE名', '出欠回答', 'LINE User ID']);
    }

    // 新しい行を追加（管理者向けの使いやすい順序）
    var timestamp = new Date();
    var newRow = [
      timestamp,           // A: タイムスタンプ
      bambooNo,            // B: 竹号（キー項目）
      userName,            // C: LINE名
      attendance,          // D: 出欠回答
      userId               // E: LINE User ID（管理用・末尾に配置）
    ];

    sheet.appendRow(newRow);
    console.log('Row added to spreadsheet:', formConfig.responseSheetName);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      bambooNo: bambooNo,
      message: '記録しました'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    console.error('handleLiffFormSubmission Error:', err);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

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
        // User IDとタイムスタンプを記録
        sheet.getRange(i + 1, col.USER_ID + 1).setValue(userId);
        sheet.getRange(i + 1, 1).setValue(new Date()); // A列にタイムスタンプ
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
        // User IDとタイムスタンプを記録
        sheet.getRange(i + 1, col.USER_ID + 1).setValue(userId);
        sheet.getRange(i + 1, 1).setValue(new Date()); // A列にタイムスタンプ
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

  // デバッグ：送信内容をログ出力
  console.log('=== LINE API Request ===');
  console.log('URL:', url);
  console.log('User ID:', userId);
  console.log('Message:', text);
  console.log('Payload:', JSON.stringify(payload));

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
    var res = UrlFetchApp.fetch(url, options);
    var responseCode = res.getResponseCode();
    var responseText = res.getContentText();

    // デバッグ：レスポンス内容をログ出力
    console.log('=== LINE API Response ===');
    console.log('Status Code:', responseCode);
    console.log('Response Body:', responseText);

    if (responseCode !== 200) {
      console.error('LINE API Error: Status ' + responseCode);
      console.error('Error details:', responseText);
    } else {
      console.log('✓ Message sent successfully!');
    }
  } catch (err) {
    console.error('=== LINE API Exception ===');
    console.error('Error:', err.toString());
    console.error('Stack:', err.stack);
  }
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
