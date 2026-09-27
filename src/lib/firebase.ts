/* 방명록·낙서장이 쓰는 Firebase(Firestore + 익명 로그인)입니다.
   아래 설정 값은 브라우저에 공개되는 식별자라 비밀이 아닙니다. 누가 무엇을 할 수 있는지는
   firestore.rules 가 정합니다.
   Firebase 코드는 커서 첫 화면을 느리게 하지 않도록 필요할 때 따로 불러옵니다. */
import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBOjr9fEPHN-jcNay2aUCGkW7QiJdDzL74",
  authDomain: "portfolio-2baf4.firebaseapp.com",
  projectId: "portfolio-2baf4",
  storageBucket: "portfolio-2baf4.firebasestorage.app",
  messagingSenderId: "579316976507",
  appId: "1:579316976507:web:9d69a30a6fae49c2dc4bde"
};

export type Cloud = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  fs: typeof import("firebase/firestore");
};

/* 로컬에서 에뮬레이터로 확인할 때만: 주소 끝에 ?emulator 를 붙입니다. */
function emulatorRequested(): boolean {
  return typeof location !== "undefined" && location.hostname === "localhost" && /[?&]emulator\b/.test(location.search);
}

let loading: Promise<Cloud> | null = null;

export function cloud(): Promise<Cloud> {
  loading ??= (async () => {
    const [{ initializeApp }, authMod, fs] = await Promise.all([
      import("firebase/app"),
      import("firebase/auth"),
      import("firebase/firestore")
    ]);
    const emulator = emulatorRequested();
    const app = initializeApp(emulator ? { ...firebaseConfig, projectId: "demo-portfolio" } : firebaseConfig);
    const auth = authMod.getAuth(app);
    const db = fs.getFirestore(app);
    if (emulator) {
      authMod.connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
      fs.connectFirestoreEmulator(db, "localhost", 8080);
    }
    return { app, auth, db, fs };
  })();
  /* 불러오기에 실패하면 다음에 다시 시도할 수 있게 비웁니다. */
  loading.catch(() => {
    loading = null;
  });
  return loading;
}

/* 이 브라우저에 이미 익명 계정이 있으면 그 uid, 없으면 null 입니다. 새로 만들지 않습니다.
   (읽기만 하는 방문자마다 계정을 만들지 않으려는 것입니다.) */
export async function currentUid(): Promise<string | null> {
  const { auth } = await cloud();
  await auth.authStateReady();
  return auth.currentUser?.uid ?? null;
}

/* 글을 쓸 때 부릅니다. 계정이 없으면 익명으로 로그인합니다. */
export async function ensureUid(): Promise<string> {
  const { auth } = await cloud();
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser.uid;
  const { signInAnonymously } = await import("firebase/auth");
  const { user } = await signInAnonymously(auth);
  return user.uid;
}

/* Firebase 오류를 방문자에게 보여 줄 문장으로 바꿉니다. */
export function cloudErrorText(error: unknown, fallback: string): string {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  if (code.includes("permission-denied")) return "권한이 없어요. 새로고침한 뒤 다시 시도해 주세요.";
  if (code.includes("unavailable") || code.includes("network")) return "인터넷 연결을 확인하고 다시 시도해 주세요.";
  if (code.includes("too-many-requests") || code.includes("resource-exhausted")) return "잠시 뒤 다시 시도해 주세요.";
  if (code.includes("admin-restricted") || code.includes("operation-not-allowed")) return "지금은 글을 남길 수 없어요.";
  if (error instanceof Error && !code) return error.message;
  return fallback;
}
