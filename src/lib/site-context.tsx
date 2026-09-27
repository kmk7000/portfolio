/* 사이트 전체가 함께 쓰는 "내용 + 주인장 상태" 입니다. (원본 useSiteContent 와 같은 역할)

   - content: 저장된 내용(없으면 코드 기본값)
   - update(): 화면에 먼저 반영하고 뒤에서 저장합니다. 그래야 고칠 때 끊기지 않습니다.
   - adminMode: 주소에 ?admin=1 이 있을 때만 켜집니다. 오른쪽 위에 주인장 메뉴가 보입니다.
   - editing: 주인장이 "편집" 을 눌렀을 때만 true 입니다. */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cloudErrorText, signInWithGoogle, signOutUser, subscribeUser, type SignedInUser } from "./firebase.ts";
import { fetchImages, saveSiteContent, subscribeSiteContent, uploadImage } from "./site-content-cloud.ts";
import {
  defaultContent,
  isOwnerUser,
  normalizeContent,
  uploadedIdsIn,
  type SiteContent,
  type SiteContentPatch
} from "./site-content.ts";

export type SiteState = {
  content: SiteContent;
  update: (patch: SiteContentPatch) => void;
  /* 올린 사진 { id: dataUrl } */
  images: Readonly<Record<string, string>>;
  upload: (file: File) => Promise<string>;
  adminMode: boolean;
  user: SignedInUser | null;
  isOwner: boolean;
  editing: boolean;
  setEditing: (on: boolean) => void;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

export function readAdminParam(search: string): boolean {
  return new URLSearchParams(search).get("admin") === "1";
}

const SiteContext = createContext<SiteState | null>(null);

export function SiteProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent>(defaultContent);
  const [images, setImages] = useState<Record<string, string>>({});
  const [user, setUser] = useState<SignedInUser | null>(null);
  const [editOn, setEditOn] = useState(false);
  const [adminMode] = useState(() => readAdminParam(window.location.search));
  /* 저장을 기다리는 동안 들어온 스냅샷이 방금 고친 화면을 되돌리지 않도록 셉니다. */
  const pending = useRef(0);
  const latest = useRef(content);
  latest.current = content;

  useEffect(
    () =>
      subscribeSiteContent(
        raw => {
          if (pending.current === 0) setContent(normalizeContent(raw));
        },
        error => console.warn("[site] 내용을 불러오지 못해 기본 내용을 보여 줍니다.", error)
      ),
    []
  );

  /* 로그인 상태만 지켜봅니다. 여기서 새 계정을 만들지는 않습니다. */
  useEffect(() => subscribeUser(setUser), []);

  const isOwner = isOwnerUser(user);
  const editing = isOwner && editOn;

  /* 내용에 들어 있는 올린 사진 중 아직 없는 것만 불러옵니다. */
  const wanted = useMemo(() => uploadedIdsIn(content.blocks), [content.blocks]);
  const requested = useRef(new Set<string>());
  useEffect(() => {
    const missing = wanted.filter(id => !requested.current.has(id));
    if (missing.length === 0) return;
    missing.forEach(id => requested.current.add(id));
    fetchImages(missing).then(found => setImages(prev => ({ ...prev, ...found })));
  }, [wanted]);

  const update = useCallback((patch: SiteContentPatch) => {
    const next = { ...latest.current, ...patch };
    latest.current = next;
    setContent(next);
    pending.current += 1;
    saveSiteContent(patch)
      .catch(error => window.alert(cloudErrorText(error, "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.")))
      .finally(() => {
        pending.current -= 1;
      });
  }, []);

  const upload = useCallback(async (file: File) => {
    const { id, ref, dataUrl } = await uploadImage(file);
    requested.current.add(id);
    setImages(prev => ({ ...prev, [id]: dataUrl }));
    return ref;
  }, []);

  const login = useCallback(async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      window.alert(cloudErrorText(error, "로그인하지 못했어요. 팝업 차단을 풀고 다시 시도해 주세요."));
    }
  }, []);

  const logout = useCallback(async () => {
    setEditOn(false);
    await signOutUser();
  }, []);

  const value = useMemo<SiteState>(
    () => ({
      content,
      update,
      images,
      upload,
      adminMode,
      user,
      isOwner,
      editing,
      setEditing: setEditOn,
      login,
      logout
    }),
    [content, update, images, upload, adminMode, user, isOwner, editing, login, logout]
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteState {
  const value = useContext(SiteContext);
  if (!value) throw new Error("useSite 는 SiteProvider 안에서만 쓸 수 있습니다.");
  return value;
}
