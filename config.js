/**
 * 設定ファイル
 * ユーザーが変更する定数を定義します。
 */
var CONFIG = {
    // LINE Messaging API チャネルアクセストークン
    LINE_CHANNEL_ACCESS_TOKEN: 'kC2P/9OVAOceiDGtbCSxcJE6Nku7Y4Bvu4TQDj/G7TAMnpUQG7v9Hv/Kae4Bud4V9Lxsl/byoZgUv0H/A6WoJmwLy6Kpqu2oZDrqPRg9VpEIjEVn3EDioodyd4VHoj8j0+5GLINOsvinGL2ZsWRiEgdB04t89/1O/w1cDnyilFU=',

    // 竹号リスト（LINEアカウント竹号登録自動回答用）のスプレッドシートID
    BAMBOO_SHEET_ID: '1flEIyN6b6ZcHhpxI_TGKfXweONdTocmtoki1hT-YS5g',
    BAMBOO_SHEET_NAME: 'シート1',

    // メッセージテンプレート
    // {bambooNo} と {status} はプログラム内で置換されます
    REPLY_MESSAGE_TEMPLATE: '{bambooNo}さん、ご回答ありがとうございます。\n回答内容は、”{status}”です。',

    // 管理対象のフォーム設定
    FORMS: [
        {
            NAME: '全役員会出欠連絡',
            RESPONSE_SHEET_ID: '1E9xMlA_eGWC8Tzt5fciOpAUYxW_qBTuTolH3pSBrVEY',
            RESPONSE_SHEET_NAME: 'フォームの回答 1',
            COLUMNS: {
                USER_ID: 'LINE User ID',
                BAMBOO_NO: '竹号',
                NAME: 'LINE名', // ここを「LINE名」に修正（画像のヘッダーに合わせました）
                STATUS: '出欠回答' // ここを「出欠回答」に修正（画像のヘッダーに合わせました）
            }
        },
        {
            NAME: '2つ目のフォーム (仮)',
            RESPONSE_SHEET_ID: 'DUMMY_SHEET_ID_2',
            RESPONSE_SHEET_NAME: 'フォームの回答 1',
            COLUMNS: {
                USER_ID: 'LINE User ID',
                BAMBOO_NO: '竹号',
                NAME: 'LINE名',
                STATUS: '出欠回答'
            }
        }
    ],

    // 竹号リストシートの列配置（0始まり）
    BAMBOO_COL: {
        USER_ID: 0,   // A列: User ID
        BAMBOO_NO: 1, // B列: 竹号
        NAME: 2       // C列: LINE名
    }
};
