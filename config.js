/**
 * 設定ファイル
 * ユーザーが変更する定数を定義します。
 */
var CONFIG = {
    // LINE Messaging API チャネルアクセストークン
    LINE_CHANNEL_ACCESS_TOKEN: 'jMKJmWZAmw6hWsIS8ExU0HqOyRLd4wJPy+zAB1bimRsisq/MDm05jtNne/bYZoRW9Lxsl/byoZgUv0H/A6WoJmwLy6Kpqu2oZDrqPRg9VpFojpENU+EZnjYN2HXPcsyddT6AJd6jQTJilQ0cWlbY/wdB04t89/1O/w1cDnyilFU=',

    // 竹号リスト（LINEアカウント竹号登録自動回答用）のスプレッドシートID
    BAMBOO_SHEET_ID: '1flEIyN6b6ZcHhpxI_TGKfXweONdTocmtoki1hT-YS5g',
    BAMBOO_SHEET_NAME: 'シート1',

    // フォーム設定マスタースプレッドシート
    FORM_CONFIG_SHEET_ID: '1dTrPV3uXEk2y-sjffMNYBst8vsic7pRLAsxheLA15ps',
    FORM_CONFIG_SHEET_NAME: 'シート1',

    // 回答記録スプレッドシート（複数シートで管理）
    RESPONSE_SHEET_ID: '1Fi-Kf8yBFQlfKYSI2ul1T8HGLhXuYIGOsOQp6Es-DM4',

    // フォーム設定マスターの列配置（0始まり）
    FORM_CONFIG_COL: {
        FORM_ID: 0,          // A列: フォームID
        TITLE: 1,            // B列: 会議名
        DATE: 2,             // C列: 日付
        TIME: 3,             // D列: 時間
        LOCATION: 4,         // E列: 場所
        LOCATION_URL: 5,     // F列: 場所URL
        DESCRIPTION: 6,      // G列: 説明文
        QUESTION_LABEL: 7,   // H列: 質問ラベル（出欠など）
        OPTION1: 8,          // I列: 選択肢1
        OPTION2: 9,          // J列: 選択肢2
        RESPONSE_SHEET_NAME: 10,  // K列: 回答記録シート名
        ACTIVE: 11           // L列: 有効フラグ
    },

    // 竹号リストシートの列配置（0始まり）
    BAMBOO_COL: {
        USER_ID: 1,   // B列: # user id
        NAME: 2,      // C列: LINE名
        BAMBOO_NO: 3  // D列: 竹号
    }
};
