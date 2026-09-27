/* 미니룸 캐릭터 모드입니다. 그림과 모드 구성은 원본 src/config/character.ts 와 같고, 멘트만 바꿨습니다.
   클릭할 때마다 다음 모드로 바뀌고, 해당 모드의 멘트 중 하나가 말풍선으로 뜹니다. */
export type CharacterMode = {
  id: string;
  label: string;
  src: string;
  lines: string[];
};

export const characterModes: CharacterMode[] = [
  {
    id: "standing",
    label: "기본",
    src: "/assets/character/n-standing.png",
    lines: [
      "안녕하세요! 민규의 미니미예요.",
      "오늘도 AI랑 코딩 중!",
      "방향키로 저를 움직여보세요!",
      "민규의 AI 작업실에 오신 걸 환영해요."
    ]
  },
  {
    id: "waving",
    label: "인사",
    src: "/assets/character/n-waving.png",
    lines: [
      "반가워요! 잘 왔어요 👋",
      "방문해줘서 고마워요!",
      "오늘 하루도 화이팅이에요!",
      "다음에 또 놀러와요~"
    ]
  },
  {
    id: "floating1",
    label: "부유",
    src: "/assets/character/n-floating1.png",
    lines: [
      "둥실~ 아이디어 충전 중...",
      "빌드 기다리는 중... ☕",
      "테스트가 전부 통과하길 🙏",
      "잠깐 무중력 상태예요 😌"
    ]
  },
  {
    id: "floating2",
    label: "이동",
    src: "/assets/character/n-floating2.png",
    lines: [
      "다음 기능 만들러 갑니다!",
      "버그 잡으러 출발!",
      "배포하러 다녀올게요.",
      "새 아이디어를 검증하러 갑니다!"
    ]
  },
  {
    id: "action1",
    label: "분석",
    src: "/assets/character/n-action1.png",
    lines: [
      "로그 분석 중...",
      "프롬프트 다듬는 중!",
      "AI랑 코드 리뷰 중이에요.",
      "테스트 돌리는 중... 거의 다 됐어요!"
    ]
  },
  {
    id: "mascot",
    label: "마스코트",
    src: "/assets/character/n-mascot.png",
    lines: [
      "마스코트 모드!",
      "이 작업실의 마스코트입니다!",
      "프로젝트 탭도 구경해 보세요 💜",
      "민규를 기억해 주세요 💚"
    ]
  }
];
