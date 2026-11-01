# UT 응답을 구글 시트로 받기

참가자가 UT(`/ut`)에서 [제출하기]를 누르면 응답이 구글 시트에 한 줄로 쌓여요.
흐름: 참가자 브라우저 → Dots 서버(`/api/ut-submit`) → 구글 Apps Script 웹 앱 → 시트

- 시트로 가는 것: 닉네임, 사전·사후 응답, 자동 기록(시간·완료 여부·추가 질문 횟수·AI 실패 횟수), 제출 시각
- 시트로 가지 않는 것: 참가자가 쓴 경험 내용(답변, STAR 원고). 참가자 브라우저에만 남아요
- Apps Script 주소는 Dots 서버의 환경변수(`UT_SHEET_URL`)에만 넣어요. 참가자 브라우저에는 보이지 않아요

---

## 1. 시트 만들기

1. [sheets.google.com](https://sheets.google.com)에서 **빈 스프레드시트**를 만들어요.
2. 제목을 알아보기 쉽게 바꿔요. 예: `Dots UT 응답`
3. 첫 줄(제목 줄)은 비워 두세요. 첫 응답이 들어올 때 자동으로 채워져요.

## 2. 코드 붙여 넣기

1. 시트 메뉴에서 **확장 프로그램 → Apps Script**를 눌러요.
2. 열린 화면의 `Code.gs`에 있던 내용을 모두 지우고, 아래 코드를 그대로 붙여 넣어요.
   - 코드 위아래의 ```` ```javascript ````, ```` ``` ```` 줄은 **복사하지 마세요.** 들어가면 `TypeError: "" is not a function (1행)` 오류가 나요. 첫 줄은 `// Dots UT 응답 받기`, 셋째 줄은 `const SHEET_NAME = "응답";`, 마지막 줄은 `}`여야 해요.
3. 위쪽 **저장(디스크 모양)** 버튼을 눌러요.

```javascript
// Dots UT 응답 받기: 받은 한 줄을 "응답" 시트 맨 아래에 붙인다.
// 첫 줄(제목)은 처음 받은 응답의 항목 이름으로 자동으로 만들고, 새 항목이 생기면 오른쪽에 칸을 더한다.
const SHEET_NAME = "응답";

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000); // 여러 명이 동시에 제출해도 줄이 섞이지 않게
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    let header = sheet.getLastColumn() > 0 ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
    if (header.length === 0 || header.every((h) => h === "")) header = [];
    Object.keys(data).forEach((key) => {
      if (header.indexOf(key) === -1) header.push(key);
    });
    sheet.getRange(1, 1, 1, header.length).setValues([header]);

    // 참가자가 쓴 글이 =, +, -, @로 시작하면 시트가 수식으로 읽지 않게 앞에 '를 붙인다
    const row = header.map((key) => {
      const v = data[key];
      if (v === undefined || v === null) return "";
      if (typeof v === "string" && /^[=+\-@]/.test(v)) return "'" + v;
      return v;
    });
    sheet.appendRow(row);

    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
```

## 3. 웹 앱으로 배포하기

1. Apps Script 화면 오른쪽 위 **배포 → 새 배포**를 눌러요.
2. 톱니바퀴(유형 선택)에서 **웹 앱**을 골라요.
3. 이렇게 설정해요.
   - 설명: `Dots UT` (아무거나)
   - 다음 사용자 인증 정보로 실행: **나**
   - 액세스 권한이 있는 사용자: **모든 사용자**
     (Dots 서버가 로그인 없이 보내야 해서 필요해요. 주소를 아는 사람만 보낼 수 있고, 주소는 서버에만 둬요)
4. **배포**를 누르면 권한 허용 창이 떠요. 내 구글 계정을 고르고 **허용**을 눌러요.
   - "Google에서 확인하지 않은 앱" 경고가 나오면 **고급 → (프로젝트 이름)(으)로 이동(안전하지 않음)** 을 눌러요. 내가 만든 코드라 괜찮아요.
5. 끝나면 나오는 **웹 앱 URL**(`https://script.google.com/macros/s/…/exec`)을 복사해요.

> 코드를 나중에 고쳤다면 **배포 → 배포 관리 → 연필(수정) → 버전: 새 버전 → 배포**로 다시 배포해야 반영돼요. 주소는 그대로예요.

## 4. 주소를 환경변수에 넣기

**내 컴퓨터에서 테스트할 때**

1. 프로젝트 폴더의 `.env.local` 파일을 열어요.
2. 맨 아래에 한 줄을 더해요. (따옴표 없이)
   ```
   UT_SHEET_URL=https://script.google.com/macros/s/…/exec
   ```
3. 개발 서버를 껐다 켜요(`npm run dev`). 환경변수는 켤 때 한 번 읽어요.

**배포한 사이트(Vercel 등)에서**

- 배포한 곳의 환경변수 설정에 `UT_SHEET_URL`을 같은 값으로 넣고 다시 배포해요.
- `.env.local`은 GitHub에 올라가지 않아요(`.gitignore`). 주소를 코드나 문서에 직접 적지 마세요.

## 5. 확인하기

1. 브라우저에서 `/ut`를 열고 처음부터 끝까지 한 번 진행해요(아래 "직접 해 보기 순서").
2. 제출 후 시트에 **응답** 탭이 생기고 한 줄이 들어오면 성공이에요.
3. 안 들어오면
   - 화면에 "시트 주소가 설정되지 않았어요" → `UT_SHEET_URL`을 넣고 서버를 다시 켰는지 확인
   - "시트에 저장하지 못했어요" → 웹 앱 배포의 액세스 권한이 **모든 사용자**인지, 주소가 `/exec`로 끝나는지 확인

## 직접 해 보기 순서

1. `/ut`를 연다 → 안내를 읽고 동의 체크 → [시작하기]
2. 사전 질문에 모두 답하고 [경험 정리 시작하기]
3. 작업 화면에서 경험 하나를 끝까지 정리한다 (질문 → 원고 → 역량 연결 → 역량 키워드 → [경험 완성하기])
   - 중간에 새로고침해도 이어지는지, 위쪽 [테스트 그만하기]도 한 번 확인해 보면 좋아요
4. 자동으로 넘어온 사후 질문에 답하고 [제출하기] → "참여해 주셔서 감사합니다"
5. 시트에 한 줄이 들어왔는지, 경험 내용(답변·원고)이 들어가지 않았는지 확인
6. 같은 브라우저로 `/ut`를 다시 열면 감사 화면이 나오는지 확인

> 같은 브라우저로 다시 처음부터 하려면 개발자 도구(F12) → Application → Local Storage에서 `dots:ut`, `dots:ut-state`를 지우면 돼요. 실제 경험 데이터(`dots:state`)는 따로라 지워지지 않아요.
