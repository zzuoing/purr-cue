<div align="center">

<img src="assets/cat-head.png" width="112" alt="데스크톱 알림 고양이">

# PurrCue

물 마시기, 스트레칭, 잠깐의 휴식을 알려 주는 작은 고양이.

[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | **한국어**

[다운로드](https://github.com/zzuoing/purr-cue/releases/latest) · [JoyCows](https://joycows.com/) · [문제 제보](https://github.com/zzuoing/purr-cue/issues)

<img src="assets/stretch.gif" width="360" alt="기지개를 켜는 고양이 애니메이션">

</div>

## 기능

- Windows, macOS, Linux 패키지 제공. 오프라인으로 동작하며 알림을 로컬에 저장합니다.
- 일회성 알림과 요일을 선택하는 반복 알림.
- 업무 시작, 환기, 물 마시기, 식사, 스트레칭, 산책, 화장실, 업무 종료의 8가지 빠른 상태. 그 밖의 내용에는 기본 애니메이션을 사용합니다.
- 빠른 상태는 내용을 입력하고 현재 애니메이션을 중단한 뒤 즉시 재생합니다. 저장하기 전에는 예약 알림을 만들지 않습니다.
- 날짜·시간 선택 패널, 트레이 제어, 중복 실행 방지, 4개 언어 화면 지원.

## 다운로드 및 설치

[최신 릴리스](https://github.com/zzuoing/purr-cue/releases/latest)에서 설치 파일을 받으세요.

| 플랫폼 | 패키지 | 설치 방법 |
| --- | --- | --- |
| Windows x64 | `.exe` | 설치 프로그램에서 언어와 설치 폴더를 선택합니다. |
| macOS Intel / Apple Silicon | universal `.dmg` / `.zip` | DMG를 열어 응용 프로그램 폴더로 드래그하거나 ZIP을 압축 해제합니다. |
| Linux x64 | `.AppImage` / `.deb` | AppImage에 실행 권한을 부여해 실행하거나 패키지 관리자로 deb를 설치합니다. |

현재 패키지는 서명되지 않았으며 macOS 공증도 설정되지 않았습니다. macOS 동작은 실제 기기 검증이 더 필요합니다. Linux의 창 위치, 항상 위 표시, 트레이 지원은 데스크톱 환경과 Wayland 컴포지터에 따라 다를 수 있습니다. 앱에서 Linux 로그인 시 자동 시작은 아직 지원하지 않습니다.

## 사용 방법

1. 일회성 알림 또는 반복 알림과 요일을 선택합니다.
2. 시간 입력란이나 달력 아이콘에서 날짜와 시간을 선택합니다. `YYYY-MM-DD HH:mm` / `HH:mm` 직접 입력도 가능합니다.
3. 내용을 입력하거나 빠른 상태로 애니메이션을 미리 본 뒤 저장해 예약합니다.

애니메이션은 주 모니터 작업 영역 아래에 표시됩니다. 클릭하거나 Esc를 눌러 닫습니다. Esc는 전역 단축키로 등록할 수 있어야 합니다. 설정 창을 닫아도 트레이에서 계속 실행됩니다. 종료하려면 트레이 메뉴를 사용하세요.

15초마다, 그리고 절전 모드에서 깨어난 뒤 알림을 확인합니다. 일회성 알림은 예정 시각으로부터 24시간 이내에 표시하며 닫으면 삭제됩니다. 반복 알림은 현지 시각을 사용하고 6시간 이내의 누락분을 표시하며 선택한 날마다 한 번만 실행됩니다. 여러 알림은 이후 확인 주기에 순서대로 처리합니다. 빠른 재생으로 일회성 알림을 중단하면 해당 알림은 완료로 처리되어 삭제되고 다른 알림은 유지됩니다.

## 언어

창 아래의 **번역 아이콘 옆 메뉴**에서 변경합니다. 처음 실행할 때 시스템 언어를 따르며 지원하지 않는 언어는 영어로 표시됩니다. 선택은 저장됩니다. 화면, 달력, 트레이, 알림 키워드가 영어, 중국어 간체, 일본어, 한국어를 지원합니다. 입력한 알림 내용은 자동 번역하지 않습니다.

Windows 설치 프로그램에는 별도의 네 언어 선택 화면이 있습니다. 처음에는 Windows 언어를 따르며 지원하지 않으면 영어를 사용합니다. 설치 언어와 앱에 저장된 언어는 독립적입니다. DMG, ZIP, AppImage, deb에는 같은 Windows 방식의 설치 마법사가 없습니다. 앱 실행 후에는 위의 언어 규칙을 따릅니다.

## 로컬 데이터

`reminders-v2.json`과 `settings.json`은 Electron 사용자 데이터 폴더에 저장됩니다. 언어를 바꿔도 폴더 이름 `桌面提醒`은 유지됩니다.

| 플랫폼 | 기본 폴더 |
| --- | --- |
| Windows | `%APPDATA%/桌面提醒` |
| macOS | `~/Library/Application Support/桌面提醒` |
| Linux | `$XDG_CONFIG_HOME/桌面提醒` (일반적으로 `~/.config/桌面提醒`) |

Windows는 새 데이터가 없는 첫 실행 시 `%LOCALAPPDATA%/DesktopReminder/reminders-v2.json`을 가져오고 원본을 보존합니다. 이전 앱을 종료하고 자동 시작을 직접 해제하세요. 읽을 수 없는 파일은 `.broken-<타임스탬프>`로 백업하며 저장에 실패한 수정은 되돌립니다. 현재 계정, 클라우드 동기화, 원격 측정 기능은 없습니다.

## 개발

Node.js 24+, npm, 그래픽 데스크톱이 필요합니다. 처음 사용할 때 Electron 런타임을 다운로드할 수 있습니다.

```sh
npm ci
npm start
npm run check
npm test
npm run verify:app
npm run dist:win
npm run dist:linux
# macOS에서 실행:
npm run dist:mac -- --universal --publish never
```

결과물은 `release/`에 생성됩니다. `npm run preview -- 拉伸`으로 알림 데이터를 바꾸지 않고 미리 볼 수 있습니다. 원본 앱은 `legacy/`에 보존하며 배포 패키지에는 포함하지 않습니다. 기존 애니메이션의 타이밍, 좌표, 스트레칭 GIF를 유지하지만 글꼴과 안티앨리어싱은 GDI+와 다를 수 있습니다. 애니메이션 검사와 WSL 빌드는 [개발 문서(중국어)](DEVELOPMENT.md)를 참고하세요.

## AI 어시스턴트용 CLI

PurrCue는 알림 추가, 목록 확인, 삭제를 위한 로컬 CLI를 제공합니다. Windows에서는 `PurrCue.exe` 옆의 `purrcue.cmd`를 해당 폴더에서 실행하거나 폴더를 PATH에 추가하세요. macOS는 `PurrCue.app/Contents/purrcue`, 압축을 푼 Linux 패키지는 실행 파일 옆의 `purrcue`를 사용합니다. 번들 실행기는 별도 Node 설치가 필요하지 않습니다. AppImage는 `./PurrCue-<version>-linux-x86_64.AppImage --cli <command>`를 사용하며 필요하면 먼저 `chmod +x`를 실행하세요.

```sh
purrcue add --in 20m --message "Take a break" --json
purrcue add --at "2026-12-01 14:30" --message "Meeting" --json
purrcue add --time 09:00 --days mon,tue,wed,thu,fri --message "Start work" --json
purrcue list --json
purrcue remove <id> --json
purrcue status --json
```

소스에서는 `node bin/purrcue.cjs <command>`를 사용하거나 `npm link`로 npm 명령 폴더에 `purrcue`를 등록할 수 있습니다. 전체 옵션은 `--help`를 참고하세요. 오프셋 없는 날짜는 현지 시각을 사용합니다. `--json`은 표준 출력으로 `{ok,value}` 또는 `{ok:false,error}` 객체 하나를 반환하며 실패 시 종료 코드는 1입니다. ID는 추가 또는 목록 결과에서 얻습니다. 앱이 꺼져 있으면 트레이로 자동 실행합니다. `--no-launch`로 자동 실행을 끄고 `--data-dir <folder>`로 별도 프로필을 지정할 수 있습니다. 알림을 받으려면 앱이 계속 실행 중이어야 합니다.

인증된 로컬 명명된 파이프/Unix socket을 통해 앱이 검증·저장하고 화면에 반영합니다. HTTP 리스너나 원격 API는 없습니다. `cli-connection.json`에는 로컬 접근 토큰이 있으므로 공유하지 마세요.

AppImage의 extract-and-run 모드에서는 외부 런타임이 CLI 응답 앞뒤에 압축 해제 경로를 출력할 수 있습니다. AI 도구에 순수한 JSON 표준 출력이 필요하면 압축을 푼 `purrcue` 실행기를 사용하세요.

## 릴리스

코드를 커밋하고 푸시한 뒤 `v2.0.2` 같은 버전 태그를 푸시합니다. GitHub Actions는 태그를 검증하고 빌드 디렉터리의 패키지, 설치 파일, 화면 버전을 설정합니다. 세 플랫폼 빌드가 모두 성공해야 설치 파일이 포함된 GitHub Release를 게시합니다. `v2.0.2-beta.1` 같은 태그는 사전 릴리스가 됩니다. PR과 수동 실행은 Actions 결과물만 업로드하며 Release를 게시하지 않습니다. CI는 버전 변경을 Git에 커밋하지 않습니다.

## 라이선스 및 감사

[MIT](LICENSE) · [서드 파티 고지](THIRD_PARTY_NOTICES.md).

README 구성은 [BongoCat](https://github.com/ayangweb/BongoCat)을 참고했습니다. 이 프로젝트의 고양이 애니메이션과 알림 로직을 유지하며 BongoCat 코드나 이미지는 포함하지 않습니다.
