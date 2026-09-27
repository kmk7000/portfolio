/* 미니룸 캐릭터(미니미) 모드입니다. 클릭(톡)할 때마다 다음 모드로 바뀌고, 해당 모드의 멘트 중
   하나가 말풍선으로 뜹니다.
   그림은 프로필 그림을 바탕으로 Codex 로 만든 시트 두 장(design/minime-codex-source*.png,
   저장소에는 올리지 않음)에서 필요한 포즈만 잘라 쓴 것입니다.
   scale 은 서 있는 포즈 대비 그림 높이입니다. 책상·의자가 있는 포즈도 사람 크기가 같아 보이게
   이 비율대로 줄여 그립니다. */
export type CharacterMode = {
  id: string;
  label: string;
  src: string;
  /* 서 있는 포즈 높이를 1 로 봤을 때 이 그림의 높이 */
  scale: number;
  /* 책상·의자·서버가 함께 그려진 포즈는 바닥에서 살짝 떠서 둥실둥실 움직입니다.
     (원본의 "부유" 포즈처럼, 가구째 들고 다니는 게 어색하지 않게) */
  float?: boolean;
  lines: string[];
};

const SRC = "/assets/character";

/* 처음 미니홈피에 들어왔을 때 이 모드로 이 멘트를 띄웁니다. */
export const GREETING_MODE_ID = "standing";
export const GREETING_LINE = "반가워요! 잘 왔어요 👋";

export const characterModes: CharacterMode[] = [
  {
    id: "standing",
    label: "기본",
    src: `${SRC}/minime-standing.png`,
    scale: 1,
    lines: [
      "안녕하세요! 민규의 미니미예요.",
      "오늘도 AI랑 코딩 중!",
      "바닥을 누르면 그쪽으로 걸어가요!",
      "민규의 AI 작업실에 오신 걸 환영해요."
    ]
  },
  {
    id: "float",
    label: "둥실",
    src: `${SRC}/minime-float.png`,
    scale: 0.994,
    float: true,
    lines: ["둥실~ 아이디어 충전 중 ✨", "머릿속으로 설계 그리는 중…", "무중력 상태로 버그 생각 중", "다음엔 뭘 만들어 볼까?"]
  },
  {
    id: "coding",
    label: "코딩",
    src: `${SRC}/minime-coding.png`,
    scale: 0.883,
    float: true,
    lines: ["타닥타닥… 기능 만드는 중 ⌨️", "git commit -m \"오늘도 한 걸음\"", "AI랑 페어 프로그래밍 중!", "이 줄만 고치면 끝… 아마도?"]
  },
  {
    id: "laptop",
    label: "노트북",
    src: `${SRC}/minime-laptop.png`,
    scale: 0.868,
    float: true,
    lines: ["바닥에 앉아서 한 줄 더 🧑‍💻", "아이디어 떠오르면 바로 메모!", "프롬프트 다듬는 중…", "편한 자세가 최고의 개발 환경"]
  },
  {
    id: "focus",
    label: "집중",
    src: `${SRC}/minime-focus.png`,
    scale: 0.883,
    float: true,
    lines: ["모니터 두 개 = 생산성 두 배!", "왼쪽엔 코드, 오른쪽엔 AI", "지금은 말 걸면 안 돼요… 🤫", "문서 읽는 중… 조금만요!"]
  },
  {
    id: "debugging",
    label: "디버깅",
    src: `${SRC}/minime-debugging.png`,
    scale: 0.761,
    float: true,
    lines: ["어… 이게 왜 되지? 🤔", "버그 발견! 🐛 잡으러 갑니다", "로그를 한 줄씩 따라가는 중…", "재현 먼저, 수정은 그다음!"]
  },
  {
    id: "coffee",
    label: "커피",
    src: `${SRC}/minime-coffee.png`,
    scale: 0.82,
    float: true,
    lines: ["빌드 기다리는 중… ☕", "커피 한 잔 = 버그 하나 해결", "npm install 끝날 때까지 한 모금", "잠깐 쉬면서 아이디어 충전!"]
  },
  {
    id: "deploy",
    label: "배포",
    src: `${SRC}/minime-deploy.png`,
    scale: 0.857,
    float: true,
    lines: ["서버 상태 확인 중… 🖥️", "배포 출발! 🚀", "git push 완료, 이제 기다리기만…", "로그 이상 없음, 운영 서버 정상!"]
  },
  {
    id: "relax",
    label: "휴식",
    src: `${SRC}/minime-relax.png`,
    scale: 0.809,
    float: true,
    lines: ["테스트 전부 통과! ✅ 이제 쉬어요", "배포 끝~ 기지개 한 번 🙆", "초록불 보면서 휴식 중 😌", "프로젝트 탭도 구경해 보세요!"]
  }
];

/* 모드와 별개로, 상황에 따라 잠깐 바뀌는 그림입니다.
   - walk: 서 있는 포즈로 걸어갈 때(바닥 누르기·끌기·방향키) 보여 줍니다. 떠다니는 포즈는 그대로 둥실 이동합니다.
   - sleep: 한동안 아무도 건드리지 않으면 졸기 시작합니다. 누르면 깹니다. */
export const specialSprites = {
  walk: { src: `${SRC}/minime-walk.png`, scale: 1.022, label: "걷기" },
  sleep: { src: `${SRC}/minime-sleep.png`, scale: 1.041, label: "졸기" }
} as const;

/* 이만큼(ms) 아무 조작이 없으면 졸기 시작합니다. */
export const IDLE_SLEEP_MS = 40_000;
export const sleepLines = ["Zzz… (눌러서 깨워 주세요)", "쿨쿨… 빌드 끝나면 깨워 주세요 💤"];
export const wakeLines = ["앗, 깜빡 졸았어요! 😳", "잠깐 눈만 감았어요… 진짜로요!"];
