/* 미니홈피에 들어가는 글·링크·탭을 모아 둔 곳입니다.
   화면 구성은 원본(N-lifescience/mini-homepage, MIT)을 따르고, 내용은 민규의 작업 기록으로 채웠습니다.
   내용을 바꾸고 싶으면 이 파일만 고치면 됩니다. */

export const profile = {
  ownerName: "민규",
  introTitle: "민규의 AI 작업실",
  introDescription: "AI와 함께 만들고 운영한 서비스 기록",
  catalogDescription: "AI와 함께 서비스를 만듭니다",
  todayIs: "맑음 ☀️",
  /* 왼쪽 프로필 사진입니다. public/assets/ 안에 파일을 넣고 경로를 적으세요. */
  photo: { src: "/assets/profile.png", alt: "헤드폰을 쓴 인물의 파란 잉크 일러스트 프로필" },
  /* 홈 탭 위쪽 미니룸 배경입니다. */
  miniroom: { src: "/assets/miniroom-bg-cyberpunk.jpg", alt: "사이버펑크 랩 미니룸" },
  /* 오른쪽 위, 옛날 싸이월드 주소창을 흉내 낸 문구입니다. 배포 주소가 정해지면 맞춰 주세요. */
  displayUrl: "kmk7000.github.io/portfolio/",
  miniroomTitle: "Mini Room",
  miniroomSub: "미니룸",
  guestbookTitle: "What friends say",
  guestbookSub: "한마디로 표현한다면~",
  projectsSubtitle: "AI와 함께 만든 서비스",
  projectsEmptyText: "아직 올린 프로젝트가 없습니다.",
  photoSubtitle: "프로젝트 스크린샷"
} as const;

export const contactEmail = "milk45453@gmail.com";

/* ------------------------------------------------------------------ */
/* 오른쪽 탭                                                            */
/* ------------------------------------------------------------------ */

/* custom 은 주인장이 편집 모드에서 직접 만든 탭입니다(사진 위주, 앨범/연도별 보기). */
export type TabKind = "home" | "profile" | "projects" | "photo" | "oekaki" | "custom";

/* 탭 내용을 보여 주는 방식입니다. list: 세로 목록, album: 격자, year: 연도별 묶음 */
export type TabView = "list" | "album" | "year";

export type TabDef = {
  id: string;
  label: string;
  kind: TabKind;
  /* 주인장이 정한 기본 보기. 방문자는 화면에서 잠깐 바꿔 볼 수 있습니다. */
  view?: TabView;
};

export const tabs: TabDef[] = [
  { id: "home", label: "홈", kind: "home" },
  { id: "profile", label: "프로필", kind: "profile" },
  { id: "projects", label: "프로젝트", kind: "projects" },
  { id: "photo", label: "사진첩", kind: "photo" },
  { id: "oekaki", label: "낙서장", kind: "oekaki" }
];

/* ------------------------------------------------------------------ */
/* 프로필·사진첩·프로젝트 본문 블록                                        */
/* ------------------------------------------------------------------ */

/* year 는 "연도별보기" 에서 묶는 기준입니다. 비워 두면 "기타" 로 모입니다. */
type BlockBase = { id: string; year?: string };

export type ContentBlock =
  | (BlockBase & { type: "heading"; text: string })
  | (BlockBase & { type: "text"; text: string })
  | (BlockBase & { type: "list"; items: string[] })
  /* href 는 https:// 주소나 mailto: 메일 주소를 적습니다. */
  | (BlockBase & { type: "link"; label: string; href: string })
  /* 사진 블록은 여러 장을 담을 수 있습니다. 첫 장이 목록에 보이는 대표 사진입니다. */
  | (BlockBase & { type: "image"; images: string[]; caption: string });

export const profileBlocks: ContentBlock[] = [
  { id: "hello", type: "heading", text: "안녕하세요, 민규입니다." },
  {
    id: "hello-text",
    type: "text",
    text: "AI 코딩 도구와 함께 서비스를 기획하고, 만들고, 직접 운영합니다. 이 미니홈피는 그렇게 만든 작업물을 모아 둔 기록장입니다."
  },
  { id: "way", type: "heading", text: "AI와 일하는 방식" },
  {
    id: "way-list",
    type: "list",
    items: [
      "검증 먼저: 만들기 전에 시장·정책·API 제약을 조사해 문서로 남깁니다.",
      "지침은 문서로: 프로젝트마다 CLAUDE.md, DESIGN.md 같은 작업 지침을 두고 AI와 사람이 같은 기준을 봅니다.",
      "테스트로 확인: 기능마다 자동 테스트를 붙여 AI가 만든 코드를 검증합니다.",
      "교훈은 다시 지침으로: 운영하며 겪은 실수와 해결법을 지침에 적어 같은 실수를 반복하지 않습니다.",
      "판단은 사람이: 가격 결정이나 최종 등록 승인처럼 책임이 따르는 결정은 사람이 합니다."
    ]
  },
  { id: "tools", type: "heading", text: "주로 쓰는 도구" },
  {
    id: "tools-list",
    type: "list",
    items: [
      "AI 개발 도구: Claude Code, Kiro, Google AI Studio",
      "제품 속 AI: Claude, Gemini, GPT, Qwen, DeepSeek API (구조화 출력)",
      "개발·운영: Python·FastAPI, React·TypeScript, Supabase, Firebase, Fly.io, Vercel"
    ]
  },
  { id: "contact", type: "heading", text: "연락처" },
  { id: "contact-mail", type: "link", label: contactEmail, href: `mailto:${contactEmail}` }
];

/* 사진첩입니다. 프로젝트 화면을 묶어서 보여 줍니다. */
const SHOT = "/assets/projects";

export const photoBlocks: ContentBlock[] = [
  {
    id: "sellitmate-app",
    type: "image",
    year: "2026",
    images: [
      `${SHOT}/sellitmate/dashboard.webp`,
      `${SHOT}/sellitmate/products.webp`,
      `${SHOT}/sellitmate/pricing.webp`,
      `${SHOT}/sellitmate/campaign.webp`,
      `${SHOT}/sellitmate/discount.webp`
    ],
    caption: "SellItMate 앱 화면"
  },
  {
    id: "sellitmate-extension",
    type: "image",
    year: "2026",
    images: [`${SHOT}/sellitmate/extension-collect.webp`, `${SHOT}/sellitmate/extension-popup.webp`],
    caption: "SellItMate 크롬 확장프로그램"
  },
  {
    id: "sellitmate-site",
    type: "image",
    year: "2026",
    images: [`${SHOT}/sellitmate/landing.webp`, `${SHOT}/sellitmate/calculator.webp`],
    caption: "SellItMate 소개 페이지·판매가 계산기"
  },
  {
    id: "welmes-store",
    type: "image",
    year: "2026",
    images: [`${SHOT}/welmes/home.webp`, `${SHOT}/welmes/products.webp`],
    caption: "WELMES 스토어"
  },
  {
    id: "welmes-video",
    type: "image",
    year: "2026",
    images: [`${SHOT}/welmes/video-1.webp`, `${SHOT}/welmes/video-2.webp`, `${SHOT}/welmes/video-3.webp`],
    caption: "WELMES 홍보 영상 장면"
  },
  {
    id: "portfolio-home",
    type: "image",
    year: "2026",
    images: [`${SHOT}/portfolio/home.webp`],
    caption: "이 미니홈피"
  }
];

/* ------------------------------------------------------------------ */
/* 프로젝트                                                             */
/* ------------------------------------------------------------------ */

export type ProjectStatus = "운영 중" | "개발 중";
export type ProjectFact = { label: string; value: string };
export type ProjectLink = { label: string; href: string };
export type ProjectShot = { src: string; caption: string };

export type Project = {
  /* 주소 ?tab=projects&project=<id> 에 쓰입니다. 영문 소문자·숫자·- 만 쓰세요. */
  id: string;
  title: string;
  category: string;
  status: ProjectStatus;
  period: string;
  /* 목록과 상세 맨 위에 보이는 한 줄 소개입니다. */
  summary: string;
  /* 목록 왼쪽 작은 그림입니다. 없으면 "준비 중" 칸이 보입니다. */
  cover?: string;
  tags: string[];
  facts: ProjectFact[];
  links: ProjectLink[];
  body: ContentBlock[];
  shots: ProjectShot[];
};

export const projects: Project[] = [
  {
    id: "sellitmate",
    title: "SellItMate (셀잇메이트)",
    category: "SaaS",
    status: "운영 중",
    period: "2026.08 ~",
    summary: "국내 쇼핑몰 상품을 수집해 쇼피(Shopee) 8개국에 한 번에 등록하는 크로스보더 셀러 도구",
    cover: `${SHOT}/sellitmate/landing.webp`,
    tags: ["Shopee Open API", "크롬 확장프로그램", "구조화 출력", "마진 역산", "멀티테넌시"],
    facts: [
      { label: "기간", value: "2026.08 ~ 운영 중" },
      { label: "역할", value: "기획 · 개발 · 운영 (AI와 1인 개발)" },
      { label: "구성", value: "웹 앱 · 크롬 확장프로그램 · API 서버" },
      { label: "기술", value: "Python · FastAPI · SQLAlchemy · SQLite · Vanilla JS · Supabase Auth · Paddle · Fly.io" },
      { label: "제품 속 AI", value: "Claude 구조화 출력 · 프롬프트 캐싱 (Qwen 선택 가능)" },
      { label: "지원 범위", value: "수집 쇼핑몰 20곳 이상 · 쇼피 8개국" },
      { label: "규모", value: "커밋 137개 · 자동 테스트 1,400여 개" }
    ],
    links: [
      { label: "서비스 바로가기", href: "https://sellitmate.com" },
      { label: "크롬 웹스토어", href: "https://chromewebstore.google.com/detail/dclfdlpifocbfjofglnebopplolmgjkg" },
      { label: "쇼피 판매가 계산기", href: "https://sellitmate.com/shopee-calculator.html" }
    ],
    body: [
      { id: "problem", type: "heading", text: "풀려던 문제" },
      {
        id: "problem-text",
        type: "text",
        text: "쇼피 크로스보더 판매는 같은 상품을 나라마다 다시 번역하고, 판매가를 계산하고, 카테고리를 골라 올려야 합니다. 상품이 늘수록 등록 작업이 판매 활동을 밀어냅니다. 그래서 규칙이 정해진 반복 작업은 자동화하고, 판단이 필요한 일은 사람에게 남기는 도구를 만들었습니다."
      },
      { id: "features", type: "heading", text: "주요 기능" },
      {
        id: "features-list",
        type: "list",
        items: [
          "크롬 확장프로그램으로 무신사·네이버·쿠팡·올리브영·알리익스프레스 등 20곳 이상의 쇼핑몰에서 상품 수집",
          "AI가 영문 상품명(SEO)·상세설명·옵션을 번역하고 쇼피 카테고리를 추천",
          "매입가·배송비·국가별 수수료·환율을 반영한 판매가 역산",
          "Shopee Global Product API로 8개국(SG·MY·TH·TW·VN·PH·BR·MX)에 동시 등록 (이미지는 한 번만 업로드)",
          "국가별 금지 품목 1차 검사, 대량 할인·캠페인 가격 계산, 정산 대조"
        ]
      },
      { id: "trust", type: "heading", text: "제품 속 AI를 믿을 수 있게 만든 장치" },
      {
        id: "trust-list",
        type: "list",
        items: [
          "응답을 Pydantic 스키마로 검증하는 구조화 출력을 써서, 형식이 어긋난 답이 들어올 수 없게 했습니다.",
          "카테고리는 쇼피가 준 후보 안에서만 고르게 하고, 후보 밖 값은 거부합니다 (환각 방어).",
          "확신도가 0.5 미만이면 자동 등록을 멈추고 사람이 확인합니다.",
          "옵션 번역의 개수나 순서가 원문과 어긋나면 자동으로 원문을 씁니다.",
          "상품마다 같은 지침은 프롬프트 캐싱으로 처리해 대량 처리 비용을 낮췄습니다."
        ]
      },
      { id: "way", type: "heading", text: "AI와 일한 방식" },
      {
        id: "way-list",
        type: "list",
        items: [
          "만들기 전에 '한국 셀러가 쇼피 크로스보더 셀러가 될 수 있는가'부터 검증해 문서로 남겼습니다.",
          "CLAUDE.md에 DB 백업 절차, 멀티테넌시 규칙, Shopee 인증 구조처럼 비싸게 얻은 지식을 적어 두고 매 작업의 기준으로 삼았습니다.",
          "커밋 137개 중 52개를 Claude와 함께 작성했고, 기능마다 자동 테스트를 붙였습니다.",
          "사이트 점검, 가격·마진 계산 검토, 이용자 행동 분석을 날짜별 문서로 남기며 개선했습니다.",
          "쇼피 약관(무단 수집 금지)에 걸리는 키워드 분석 기능은 만들지 않기로 결정했습니다."
        ]
      },
      { id: "lesson", type: "heading", text: "배운 점" },
      {
        id: "lesson-text",
        type: "text",
        text: "샵 단위 인증이 '구조상 불가능'하다는 잘못된 결론을 세 번 내린 적이 있습니다. 실제로는 인증 화면에서 샵별 체크박스를 켜면 되는 문제였습니다. 그 뒤로 '불가능'이라는 결론은 공식 문서와 실제 화면으로 확인한 뒤에만 받아들이도록 지침에 적었습니다."
      }
    ],
    shots: [
      { src: `${SHOT}/sellitmate/landing.webp`, caption: "소개 페이지 첫 화면" },
      { src: `${SHOT}/sellitmate/dashboard.webp`, caption: "대시보드: 국가별 등록 현황" },
      { src: `${SHOT}/sellitmate/products.webp`, caption: "상품 목록: 등록 상태와 소싱 마진율" },
      { src: `${SHOT}/sellitmate/pricing.webp`, caption: "8개국 판매가·예상 이익 계산" },
      { src: `${SHOT}/sellitmate/campaign.webp`, caption: "캠페인 가격 최적화 결과" },
      { src: `${SHOT}/sellitmate/discount.webp`, caption: "대량 할인 관리" },
      { src: `${SHOT}/sellitmate/extension-collect.webp`, caption: "확장프로그램: 상품 페이지의 수집 버튼" },
      { src: `${SHOT}/sellitmate/extension-popup.webp`, caption: "확장프로그램 팝업" },
      { src: `${SHOT}/sellitmate/calculator.webp`, caption: "무료 도구: 쇼피 판매가 계산기" }
    ]
  },
  {
    id: "welmes",
    title: "WELMES",
    category: "B2B 커머스",
    status: "운영 중",
    period: "2026.06 ~",
    summary: "일본 화장품을 해외 매장 바이어에게 도매로 파는 B2B 플랫폼",
    cover: `${SHOT}/welmes/home.webp`,
    tags: ["B2B 도매", "Supabase", "11개 언어", "상품 자동화", "PayPal"],
    facts: [
      { label: "기간", value: "2026.06 ~ 운영 중" },
      { label: "역할", value: "기획 · 디자인 · 개발 · 운영 (AI와 1인 개발)" },
      { label: "기술", value: "React · TypeScript · Vite · Tailwind CSS · Supabase · PayPal · Vercel" },
      { label: "제품 속 AI", value: "상품명 생성·번역 (Gemini · GPT · Claude · Qwen · DeepSeek 비교 평가)" },
      { label: "규모", value: "커밋 157개 · 테스트 파일 36개 · 11개 언어" }
    ],
    links: [{ label: "사이트 바로가기", href: "https://welmes.business" }],
    body: [
      { id: "problem", type: "heading", text: "풀려던 문제" },
      {
        id: "problem-text",
        type: "text",
        text: "해외 뷰티 매장이 일본 정품 화장품을 도매로 들여오려면 언어, 가격 확인, 결제가 모두 걸림돌입니다. WELMES는 가입한 사업자 바이어에게 도매가를 보여 주고, 세트 단가·다국어·해외 결제를 한곳에서 처리하는 도매 플랫폼입니다."
      },
      { id: "features", type: "heading", text: "주요 기능" },
      {
        id: "features-list",
        type: "list",
        items: [
          "가입한 바이어에게만 도매가를 공개하고 세트 단가·총액을 함께 표시",
          "영어를 기본으로 11개 언어 지원, 일본어 상품명은 일본어 글꼴로 따로 표시",
          "PayPal 결제·웹훅 검증과 해외 송금 입금 대조 화면",
          "주문 금액은 브라우저가 아니라 서버에서 계산",
          "공급사 상품 자동 등록, 매일 가격·재고 변동을 감지해 자동 반영하고 기록·알림"
        ]
      },
      { id: "trust", type: "heading", text: "제품 속 AI를 믿을 수 있게 만든 장치" },
      {
        id: "trust-list",
        type: "list",
        items: [
          "일본어 원문 상품명을 영문 상품명·SEO 문구로 바꾸는 일을 백그라운드 작업(워커)으로 처리합니다.",
          "Gemini·GPT·Claude·Qwen·DeepSeek 5곳을 같은 입력, 같은 JSON 형식으로 비교하는 평가 도구와 30개 평가 세트를 만들었습니다.",
          "웹 검색 근거(출처 링크)가 없는 결과는 자동 승인 기준을 넘지 못하게 했습니다.",
          "브랜드·용량·SPF 같은 사실이 빠지거나 바뀌면 탈락시키는 품질 기준을 두었습니다.",
          "사람이 승인한 상품명은 다시 생성해도 덮어쓰지 않습니다."
        ]
      },
      { id: "way", type: "heading", text: "AI와 일한 방식" },
      {
        id: "way-list",
        type: "list",
        items: [
          "커밋 157개 중 102개를 Claude와 함께 작성했습니다.",
          "DESIGN.md를 'AI 코딩 에이전트와 사람이 함께 읽는 기준 문서'로 두고, 여기에 없는 색·크기·간격은 새로 만들지 않게 했습니다.",
          "자동화 규칙과 예외 처리를 문서(AUTOMATION.md, 기능별 설계 문서)에 먼저 적고 구현했습니다.",
          "결제·웹훅·세금·번역처럼 틀리면 위험한 부분부터 자동 테스트를 붙였습니다."
        ]
      },
      { id: "lesson", type: "heading", text: "배운 점" },
      {
        id: "lesson-text",
        type: "text",
        text: "가격과 재고 변동은 바로 반영하지만, 재입고된 상품을 다시 공개하는 일은 자동화하지 않았습니다. 관리자가 일부러 숨겨 둔 상품이 의도치 않게 다시 보이는 일을 막기 위해서입니다. 무엇을 자동화하고 무엇을 사람이 정할지 나누는 기준이 가장 중요했습니다."
      }
    ],
    shots: [
      { src: `${SHOT}/welmes/home.webp`, caption: "Store home" },
      { src: `${SHOT}/welmes/products.webp`, caption: "All products (wholesale prices unlock after sign-up)" },
      { src: `${SHOT}/welmes/video-1.webp`, caption: "홍보 영상 장면 1" },
      { src: `${SHOT}/welmes/video-2.webp`, caption: "홍보 영상 장면 2" },
      { src: `${SHOT}/welmes/video-3.webp`, caption: "홍보 영상 장면 3" }
    ]
  },
  {
    id: "billionaire",
    title: "Billionaire",
    category: "앱",
    status: "개발 중",
    period: "2026.07 ~",
    summary: "일본 직장인을 위한 전자명함과 익명 커뮤니티 앱",
    tags: ["전자명함", "명함 OCR", "익명 커뮤니티", "Capacitor", "일본 시장"],
    facts: [
      { label: "기간", value: "2026.07 ~ 개발 중" },
      { label: "플랫폼", value: "웹 · iOS · Android (Capacitor)" },
      { label: "기술", value: "React · TypeScript · Firebase · Gemini API" }
    ],
    links: [],
    body: [
      {
        id: "about",
        type: "text",
        text: "종이 명함을 촬영하면 AI(Gemini)가 내용을 읽어 전자명함으로 정리하고, 직장인끼리 익명으로 이야기할 수 있는 커뮤니티를 더한 일본 시장용 앱입니다."
      },
      {
        id: "status",
        type: "text",
        text: "Google AI Studio에서 만든 시제품을 Claude Code로 옮겨 개발을 이어 가고 있습니다. 아직 개발 중이라 공개 링크는 없습니다."
      }
    ],
    shots: []
  },
  {
    id: "portfolio",
    title: "민규의 AI 작업실 (이 미니홈피)",
    category: "웹",
    status: "운영 중",
    period: "2026.09 ~",
    summary: "싸이월드 미니홈피를 AI와 함께 다시 만든 이 포트폴리오",
    cover: `${SHOT}/portfolio/home.webp`,
    tags: ["React 19", "TypeScript", "화면 비교 검증", "GitHub Pages"],
    facts: [
      { label: "기간", value: "2026.09 ~" },
      { label: "기술", value: "React 19 · TypeScript · Vite · GitHub Pages" },
      { label: "바탕", value: "MIT 라이선스 미니홈피 템플릿 (meyo-lab · mini-homepage)" },
      { label: "검증", value: "단위 테스트 · Playwright 화면 비교" }
    ],
    links: [
      { label: "원본 템플릿 (미요Lab)", href: "https://pcallpang.github.io/meyo-lab/" },
      { label: "mini-homepage 저장소", href: "https://github.com/N-lifescience/mini-homepage" }
    ],
    body: [
      {
        id: "about",
        type: "text",
        text: "MIT 라이선스로 공개된 싸이월드풍 미니홈피를 바탕으로 만들었습니다. 디자인 값은 그대로 옮기고, 방명록·방문자 수·낙서장은 서버 없이 브라우저 저장소로 동작하게 바꿨습니다."
      },
      {
        id: "way-list",
        type: "list",
        items: [
          "AI가 원본 저장소의 라이선스와 구조를 먼저 분석하고, 스타일과 동작을 컴포넌트 단위로 옮겼습니다.",
          "Playwright로 원본과 화면을 픽셀 단위로 비교해 차이를 1% 안팎으로 맞췄습니다.",
          "프로필 그림은 이미지 생성 AI로 만들었습니다."
        ]
      }
    ],
    shots: [{ src: `${SHOT}/portfolio/home.webp`, caption: "홈 화면" }]
  }
];

/* ------------------------------------------------------------------ */
/* 왼쪽 아래 파도타기                                                    */
/* ------------------------------------------------------------------ */

export type WaveLink = { id: string; label: string; href: string };

export const waveLinks: WaveLink[] = [
  { id: "sellitmate", label: "SellItMate", href: "https://sellitmate.com" },
  {
    id: "sellitmate-extension",
    label: "SellItMate 크롬 확장프로그램",
    href: "https://chromewebstore.google.com/detail/dclfdlpifocbfjofglnebopplolmgjkg"
  },
  { id: "welmes", label: "WELMES", href: "https://welmes.business" },
  { id: "mail", label: "메일 보내기", href: `mailto:${contactEmail}` },
  { id: "meyo-lab", label: "미요Lab (원본 템플릿)", href: "https://pcallpang.github.io/meyo-lab/" }
];

/* ------------------------------------------------------------------ */
/* BGM — 유튜브 영상을 음원으로 씁니다                                    */
/* ------------------------------------------------------------------ */

/* videoId 는 https://www.youtube.com/watch?v=abcd1234XYZ 에서 v= 뒤의 값입니다.
   한 영상에 여러 곡이 이어져 있으면 같은 videoId 에 startAt(초)을 적으세요.
   배열을 비우면 플레이어가 아예 표시되지 않습니다. */
export type BgmTrack = {
  id: string;
  title: string;
  artist?: string;
  videoId: string;
  startAt?: number;
};

export const bgmTracks: BgmTrack[] = [
  { id: "die-for-you", title: "Die For You", artist: "The Weeknd & Ariana Grande", videoId: "b8EYaOwq2Fo" },
  { id: "myself", title: "Myself", artist: "Post Malone", videoId: "Yh14pDsD5DQ" }
];

/* ------------------------------------------------------------------ */
/* 홈 탭 아래쪽 한마디(방명록) 예시                                        */
/* ------------------------------------------------------------------ */

export type GuestbookSeed = { id: string; author: string; text: string; date: string };

export const guestbookSeed: GuestbookSeed[] = [
  {
    id: "seed-1",
    author: "민규",
    text: "민규의 AI 작업실에 오신 걸 환영해요! 편하게 한마디 남겨 주세요.",
    date: "2026-09-27"
  }
];
