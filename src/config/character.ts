/* 미니룸 캐릭터(미니미) 모드입니다. 클릭할 때마다 다음 모드로 바뀌고, 해당 모드의 멘트 중 하나가
   말풍선으로 뜹니다.
   그림은 프로필 그림(헤드폰, 부스스한 머리, 흰 티셔츠, 잉크 파랑)을 바탕으로 한 도트 캐릭터로,
   scripts/make-minime.py 가 그립니다. 포즈를 고치려면 그 파일을 고친 뒤
   `python3 scripts/make-minime.py` 로 다시 만드세요. */
export type CharacterMode = {
  id: string;
  label: string;
  src: string;
  lines: string[];
};

const SRC = "/assets/character";

export const characterModes: CharacterMode[] = [
  {
    id: "standing",
    label: "기본",
    src: `${SRC}/minime-standing.png`,
    lines: [
      "안녕하세요! 민규의 미니미예요.",
      "헤드폰 끼면 집중 모드 ON 🎧",
      "바닥을 누르면 그쪽으로 걸어가요!",
      "민규의 AI 작업실에 오신 걸 환영해요."
    ]
  },
  {
    /* 처음 들어왔을 때 인사하는 모드입니다. id 를 바꾸면 인사가 안 떠요. */
    id: "waving",
    label: "인사",
    src: `${SRC}/minime-waving.png`,
    lines: ["반가워요! 잘 왔어요 👋", "방문해줘서 고마워요!", "방명록에 한마디 남겨 주세요!", "다음에 또 놀러와요~"]
  },
  {
    id: "coding",
    label: "코딩",
    src: `${SRC}/minime-coding.png`,
    lines: ["타닥타닥… 기능 만드는 중 ⌨️", "git commit -m \"오늘도 한 걸음\"", "AI랑 페어 프로그래밍 중!", "이 줄만 고치면 끝… 아마도?"]
  },
  {
    id: "coffee",
    label: "커피",
    src: `${SRC}/minime-coffee.png`,
    lines: ["빌드 기다리는 중… ☕", "커피 한 잔 = 버그 하나 해결", "잠깐 쉬면서 아이디어 충전!", "npm install 이 끝날 때까지 쉬어요"]
  },
  {
    id: "debugging",
    label: "디버깅",
    src: `${SRC}/minime-debugging.png`,
    lines: ["버그 발견! 🐛 잡으러 갑니다", "로그를 한 줄씩 따라가는 중…", "재현 먼저, 수정은 그다음!", "console.log 탐정 출동 🔍"]
  },
  {
    id: "tests",
    label: "테스트 통과",
    src: `${SRC}/minime-tests.png`,
    lines: ["테스트 전부 통과! ✅", "초록불이다~!", "고친 김에 테스트도 하나 더 추가!", "npm test — pass 53, fail 0 🎉"]
  },
  {
    id: "deploy",
    label: "배포",
    src: `${SRC}/minime-deploy.png`,
    lines: ["배포 출발! 🚀", "git push 완료, 이제 기다리기만…", "운영 서버로 날아갑니다~", "배포 성공! 프로젝트 탭도 구경해 보세요"]
  },
  {
    id: "ai",
    label: "AI 동료",
    src: `${SRC}/minime-ai.png`,
    lines: ["제 AI 동료를 소개할게요 🤖", "AI가 짜고, 제가 확인하고!", "프롬프트 다듬는 중…", "판단은 사람이, 반복은 AI가!"]
  }
];
