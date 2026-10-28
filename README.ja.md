<div align="center">

<img src="assets/cat-head.png" width="112" alt="デスクトップリマインダーの猫">

# PurrCue

水分補給、ストレッチ、ひと休みを知らせてくれる小さな猫。

[English](README.md) | [简体中文](README.zh-CN.md) | **日本語** | [한국어](README.ko.md)

[ダウンロード](https://github.com/zzuoing/desktop-reminder/releases/latest) · [JoyCows](https://joycows.com/) · [不具合を報告](https://github.com/zzuoing/desktop-reminder/issues)

<img src="assets/stretch.gif" width="360" alt="猫が伸びをするアニメーション">

</div>

## 機能

- Windows、macOS、Linux 向けパッケージ。オフラインで動作し、通知をローカルに保存します。
- 一度だけの通知と、曜日を指定する繰り返し通知。
- 仕事開始、換気、水分補給、食事、ストレッチ、散歩、トイレ、仕事終了の8つのクイック状態。その他の内容には汎用アニメーションを表示します。
- クイック状態は文章を入力し、再生中のアニメーションを中断してすぐに再生します。保存するまでは通知を予約しません。
- 日時選択パネル、トレイ操作、二重起動防止、4言語の画面表示。

## ダウンロードとインストール

[最新リリース](https://github.com/zzuoing/desktop-reminder/releases/latest) からダウンロードしてください。

| プラットフォーム | パッケージ | インストール方法 |
| --- | --- | --- |
| Windows x64 | `.exe` | インストーラーを起動し、言語と保存先を選択します。 |
| macOS Intel / Apple Silicon | universal `.dmg` / `.zip` | DMG を開いてアプリケーションへドラッグするか、ZIP を展開します。 |
| Linux x64 | `.AppImage` / `.deb` | AppImage に実行権限を付けて起動するか、パッケージマネージャーで deb をインストールします。 |

現在のパッケージは未署名で、macOS の公証は未設定です。macOS の動作は実機確認が必要です。Linux の表示位置、最前面表示、トレイ対応はデスクトップ環境や Wayland コンポジターにより異なります。Linux のログイン時自動起動はアプリから設定できません。

## 使い方

1. 一度だけの通知、または繰り返し通知と曜日を選びます。
2. 時刻欄かカレンダーアイコンから日時を選択します。`YYYY-MM-DD HH:mm` / `HH:mm` の手入力も可能です。
3. 内容を入力するか、クイック状態でアニメーションを確認してから保存します。

アニメーションはメイン画面の作業領域の下部に表示します。クリックまたは Esc で閉じます。Esc はグローバルショートカットとして利用可能である必要があります。設定ウィンドウを閉じてもトレイで動作を続けます。終了はトレイメニューから行ってください。

15秒ごと、およびスリープ復帰後に通知を確認します。一度だけの通知は予定時刻から24時間以内なら表示し、閉じると削除します。繰り返し通知はローカル時刻を使い、6時間以内なら補完し、指定した日ごとに1回表示します。複数の通知は後続の確認で順に処理します。クイック再生で一度だけの通知を中断すると、その通知は完了として削除され、ほかの通知は残ります。

## 言語

ウィンドウ下部の**翻訳アイコンの隣にあるメニュー**で切り替えます。初回起動時はシステム言語に従い、未対応の場合は英語になります。選択は保存されます。画面、カレンダー、トレイ、通知キーワードが英語、簡体字中国語、日本語、韓国語に対応します。入力した通知文は自動翻訳しません。

Windows インストーラーには独立した4言語の選択画面があります。最初は Windows の言語に従い、未対応の場合は英語になります。インストーラーの言語とアプリに保存する言語は別の設定です。DMG、ZIP、AppImage、deb に同じ Windows 形式のウィザードはありません。起動後は上記の言語規則を適用します。

## ローカルデータ

`reminders-v2.json` と `settings.json` は Electron のユーザーデータフォルダーに保存します。言語を変えてもフォルダー名 `桌面提醒` は変わりません。

| プラットフォーム | 既定のフォルダー |
| --- | --- |
| Windows | `%APPDATA%/桌面提醒` |
| macOS | `~/Library/Application Support/桌面提醒` |
| Linux | `$XDG_CONFIG_HOME/桌面提醒`（通常は `~/.config/桌面提醒`） |

Windows は新しいデータがない初回起動時に `%LOCALAPPDATA%/DesktopReminder/reminders-v2.json` を読み込み、元のファイルを残します。旧版の終了と自動起動の解除は手動で行ってください。読めないファイルは `.broken-<タイムスタンプ>` として保存し、保存に失敗した編集は取り消します。現在、アカウント、クラウド同期、テレメトリーはありません。

## 開発

Node.js 24+、npm、グラフィカルデスクトップが必要です。初回使用時に Electron ランタイムをダウンロードする場合があります。

```sh
npm ci
npm start
npm run check
npm test
npm run verify:app
npm run dist:win
npm run dist:linux
# macOS 上で実行：
npm run dist:mac -- --universal --publish never
```

出力先は `release/` です。`npm run preview -- 拉伸` で通知データを変更せずにプレビューできます。旧アプリは `legacy/` に保存し、配布物には含めません。元のアニメーションのタイミング、座標、ストレッチ GIF を保持していますが、フォントやアンチエイリアスは GDI+ と異なる場合があります。アニメーション検証と WSL ビルドは [開発資料（中国語）](DEVELOPMENT.md) を参照してください。

## AI アシスタント向け CLI

PurrCue は通知の追加、一覧、削除を行うローカル CLI を提供します。Windows は `PurrCue.exe` と同じ場所の `purrcue.cmd` を使うか、そのフォルダーを PATH に追加します。macOS は `PurrCue.app/Contents/purrcue`、展開した Linux パッケージは実行ファイルの隣の `purrcue` を使用します。同梱ランチャーに別途 Node は不要です。AppImage は `./PurrCue-<version>-linux-x86_64.AppImage --cli <command>` を使います。必要に応じて先に `chmod +x` を実行してください。

```sh
purrcue add --in 20m --message "Take a break" --json
purrcue add --at "2026-12-01 14:30" --message "Meeting" --json
purrcue add --time 09:00 --days mon,tue,wed,thu,fri --message "Start work" --json
purrcue list --json
purrcue remove <id> --json
purrcue status --json
```

ソースからは `node bin/purrcue.cjs <command>` を使います。`npm link` で npm のコマンドディレクトリに `purrcue` を登録することもできます。全オプションは `--help` を参照してください。オフセットのない日時はローカル時刻です。`--json` は標準出力に1つの `{ok,value}` または `{ok:false,error}` を返し、失敗時は終了コード1になります。ID は追加・一覧の結果から取得します。未起動ならトレイに自動起動します。`--no-launch` で自動起動を無効にし、`--data-dir <folder>` で別のプロファイルを指定できます。通知にはアプリの継続実行が必要です。

認証付きのローカル名前付きパイプ／Unix socket を介してアプリが検証・保存し、画面に反映します。HTTP リスナーやリモート API はありません。`cli-connection.json` はローカルアクセストークンを含むため共有しないでください。

AppImage の extract-and-run モードでは、外側のランタイムが CLI の応答の前後に展開先のパスを出力する場合があります。AI ツールが純粋な JSON 出力を必要とする場合は、展開した `purrcue` ランチャーを使ってください。

## リリース

コードをコミットしてプッシュした後、`v2.0.2` などのタグをプッシュします。GitHub Actions はタグを検証し、ビルド内のパッケージ、インストーラー、画面のバージョンを設定します。3プラットフォームすべてが成功した場合のみ、インストーラー付きの GitHub Release を公開します。`v2.0.2-beta.1` などはプレリリースになります。PR と手動実行は Actions の成果物のみ保存し、Release は公開しません。CI はバージョン変更を Git にコミットしません。

## ライセンスと謝辞

[MIT](LICENSE) · [サードパーティーの表記](THIRD_PARTY_NOTICES.md)。

README の構成は [BongoCat](https://github.com/ayangweb/BongoCat) を参考にしています。本プロジェクト独自の猫のアニメーションと通知処理を保持し、BongoCat のコードや画像は含みません。
