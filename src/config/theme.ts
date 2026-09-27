/* 진입 화면(Spiral 셰이더)과 인트로 글자 색입니다.
   연하늘 바탕에 남색 무늬로, 오래 봐도 눈이 편한 차분한 톤입니다. */
export const theme = {
  spiralBack: "#DCE6FF",
  spiralFront: "#0B1B4D",
  /* 제목·설명 글자 */
  text: "#FFFFFF",
  textStroke: "#0B1B4D",
  /* 글자·버튼 둘레의 빛 (r, g, b) */
  glow: "255, 255, 255",
  /* "모든 활동 구경하기" 버튼 (마우스를 올리면 두 색이 뒤집힙니다) */
  buttonBack: "#0B1B4D",
  buttonText: "#FFFFFF",
  displayFont: "'Pretendard', 'Noto Sans KR', system-ui, sans-serif",
  bodyFont: "'Pretendard', 'Noto Sans KR', system-ui, sans-serif"
} as const;
