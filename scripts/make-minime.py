"""민규 미니미 픽셀아트 생성기.

프로필 그림(부스스한 짧은 머리, 큰 헤드폰, 흰 티셔츠, 잉크 파랑)을 바탕으로
기존 미니룸 아바타와 같은 2~3등신 도트 스타일로 그립니다.
논리 해상도(작은 격자)에 찍고, 바깥 테두리를 자동으로 두른 뒤 정수배로 키웁니다.
"""
from PIL import Image
import math, os, sys

W, H = 72, 92
SCALE = 4

# 팔레트 ------------------------------------------------------------
OUT = (18, 18, 52, 255)        # 바깥 테두리
LINE = (30, 30, 78, 255)       # 안쪽 선
HAIR = (26, 28, 70, 255)
HAIR2 = (40, 46, 120, 255)     # 머리 중간톤
HAIR_HI = (70, 90, 235, 255)   # 머리 파란 광택
SKIN = (255, 224, 204, 255)
SKIN2 = (240, 190, 170, 255)
BLUSH = (255, 170, 170, 255)
EYE = (22, 22, 60, 255)
WHITE = (255, 255, 255, 255)
TEE = (246, 247, 252, 255)
TEE2 = (205, 210, 234, 255)
INK = (31, 31, 232, 255)       # 프로필 잉크 파랑
INK2 = (20, 20, 150, 255)
PHONE = (46, 50, 96, 255)      # 헤드폰 컵
PHONE2 = (78, 84, 140, 255)
BAND = (222, 226, 240, 255)
JEAN = (44, 56, 110, 255)
JEAN2 = (32, 40, 84, 255)
SHOE = (250, 250, 255, 255)
SHOE2 = (200, 205, 225, 255)
GREY = (170, 176, 196, 255)
GREY2 = (120, 126, 150, 255)
SCREEN = (16, 20, 44, 255)
GREEN = (60, 230, 150, 255)
PINK = (255, 110, 180, 255)
YELLOW = (255, 214, 80, 255)
CYAN = (90, 220, 255, 255)
RED = (240, 70, 80, 255)
MUG = (255, 255, 255, 255)
COFFEE = (120, 70, 40, 255)
STEAM = (220, 225, 245, 255)
GLASS = (190, 230, 255, 200)


class Canvas:
    def __init__(self):
        self.px = {}

    def set(self, x, y, c):
        if 0 <= x < W and 0 <= y < H:
            if c is None:
                self.px.pop((x, y), None)
            else:
                self.px[(x, y)] = c

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.set(x, y, c)

    def ellipse(self, cx, cy, rx, ry, c, only=None):
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
                if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1:
                    if only is None or only(x, y):
                        self.set(x, y, c)

    def line(self, x0, y0, x1, y1, c):
        n = int(max(abs(x1 - x0), abs(y1 - y0), 1))
        for i in range(n + 1):
            self.set(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n), c)

    def thick(self, x0, y0, x1, y1, r, c):
        n = int(max(abs(x1 - x0), abs(y1 - y0), 1) * 2)
        for i in range(n + 1):
            x = x0 + (x1 - x0) * i / n
            y = y0 + (y1 - y0) * i / n
            self.ellipse(x, y, r, r, c)

    def pts(self, points, c):
        for x, y in points:
            self.set(x, y, c)

    def outline(self, color=OUT):
        add = []
        for (x, y) in list(self.px):
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if (x + dx, y + dy) not in self.px:
                    add.append((x + dx, y + dy))
        for p in add:
            self.set(p[0], p[1], color)

    def merge(self, other):
        for k, v in other.px.items():
            self.px[k] = v

    def image(self):
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        for (x, y), c in self.px.items():
            im.putpixel((x, y), c)
        bbox = im.getbbox()
        im = im.crop(bbox)
        return im.resize((im.width * SCALE, im.height * SCALE), Image.NEAREST)


# 몸 --------------------------------------------------------------------
CX = 36  # 몸 가운데
HEAD_CY = 27


def arm(c, sx, sy, ex, ey, hand=True):
    """어깨(sx,sy)에서 손(ex,ey)까지 티셔츠 소매 + 피부 팔 + 손"""
    mx, my = sx + (ex - sx) * 0.35, sy + (ey - sy) * 0.35
    c.thick(sx, sy, mx, my, 2.6, TEE)          # 반소매
    c.thick(mx, my, ex, ey, 1.6, SKIN)         # 팔
    if hand:
        c.ellipse(ex, ey, 2.4, 2.4, SKIN)


def legs(c, pose):
    top = 62
    if pose == "walk":
        c.rect(CX - 7, top, CX - 1, top + 9, JEAN)
        c.rect(CX + 1, top, CX + 7, top + 7, JEAN)
        c.rect(CX - 8, top + 10, CX - 1, top + 12, SHOE)
        c.rect(CX + 1, top + 8, CX + 8, top + 10, SHOE)
    elif pose == "float":
        c.rect(CX - 7, top, CX - 1, top + 7, JEAN)
        c.rect(CX + 1, top, CX + 7, top + 6, JEAN)
        c.rect(CX - 8, top + 8, CX - 2, top + 10, SHOE)
        c.rect(CX + 2, top + 7, CX + 8, top + 9, SHOE)
    else:
        c.rect(CX - 7, top, CX - 1, top + 9, JEAN)
        c.rect(CX + 1, top, CX + 7, top + 9, JEAN)
        c.rect(CX - 8, top + 10, CX - 1, top + 12, SHOE)
        c.rect(CX + 1, top + 10, CX + 8, top + 12, SHOE)


def legs_detail(c, pose):
    top = 62
    # 가운데 솔기, 청바지 그림자
    for y in range(top, top + 9):
        c.set(CX, y, None)
    c.line(CX - 7, top, CX - 7, top + 8, JEAN2)
    c.line(CX + 7, top, CX + 7, top + (6 if pose != "stand" else 8), JEAN2)
    # 운동화 파란 줄
    if pose == "walk" or pose == "float":
        d = 1 if pose == "float" else 0
        c.line(CX - 7, top + 11 - d * 2, CX - 3, top + 11 - d * 2, INK)
        c.line(CX + 3, top + 9 - d, CX + 7, top + 9 - d, INK)
    else:
        c.line(CX - 7, top + 11, CX - 3, top + 11, INK)
        c.line(CX + 3, top + 11, CX + 7, top + 11, INK)


def torso(c):
    # 넉넉한 흰 티셔츠
    c.rect(CX - 9, 46, CX + 9, 62, TEE)
    c.rect(CX - 10, 48, CX + 10, 61, TEE)
    c.ellipse(CX, 46, 9, 3, TEE)


def torso_detail(c):
    # 목선, 그림자, 가슴의 작은 잉크 로고 </>
    c.pts([(CX - 2, 45), (CX - 1, 46), (CX, 46), (CX + 1, 46), (CX + 2, 45)], TEE2)
    c.line(CX - 10, 60, CX + 10, 60, TEE2)
    c.line(CX + 9, 49, CX + 9, 59, TEE2)
    # </> 로고
    c.pts([(CX - 4, 53), (CX - 5, 54), (CX - 4, 55)], INK)
    c.pts([(CX + 1, 52), (CX, 53), (CX, 54), (CX - 1, 55), (CX - 1, 56)], INK)
    c.pts([(CX + 3, 53), (CX + 4, 54), (CX + 3, 55)], INK)


def head(c):
    # 목
    c.rect(CX - 2, 40, CX + 2, 45, SKIN2)


def hair(c):
    """프로필처럼 볼륨 있고 부스스한 짧은 머리. 윗머리는 여러 갈래로 삐치고,
    앞머리는 눈썹을 덮으며 비대칭으로 흘러내립니다."""
    c.ellipse(CX, HEAD_CY - 2, 17.5, 15, HAIR)
    # 윗머리 삐침(갈래)
    tufts = [(-12, 11, -14, 9), (-6, 9, -7, 7), (2, 8, 3, 6), (9, 9, 11, 7), (15, 14, 18, 13)]
    for bx, by, tx, ty in tufts:
        for i in range(0, 11):
            t = i / 10
            x = CX + bx + (tx - bx) * t
            y = by + (ty - by) * t
            r = 2.2 * (1 - t) + 1.2
            c.ellipse(x, y, r, r, HAIR)
    # 옆머리(귀 앞으로 내려오는 부분, 헤드폰 아래로 살짝)
    for sx in (-1, 1):
        for i in range(0, 11):
            t = i / 10
            c.ellipse(CX + sx * (12.5 - t * 0.5), 24 + t * 12, 2.6 * (1 - t) + 0.8, 2.0, HAIR)
    # 앞머리: 끝이 뾰족한 갈래들, 오른쪽으로 흐름
    bangs = [(-11, 18, -13, 31), (-7, 18, -9, 28), (-3, 18, -5, 29), (1, 18, -1, 27), (5, 18, 3, 28), (9, 18, 8, 28), (11, 19, 12, 31)]
    for bx, by, tx, ty in bangs:
        for i in range(0, 13):
            t = i / 12
            x = CX + bx + (tx - bx) * t
            y = by + (ty - by) * t
            r = 2.4 * (1 - t) + 0.4
            c.ellipse(x, y, r, r, HAIR)
    c.rect(CX - 12, 14, CX + 12, 20, HAIR)


def hair_front(c):
    """얼굴 위로 내려오는 앞머리·옆머리만 (뒷머리는 얼굴 뒤에 먼저 깔림)"""
    full = Canvas()
    hair(full)
    face_px = Canvas()
    face(face_px)
    for (x, y), col in full.px.items():
        # 얼굴 영역 안에서는 이마·앞머리(y<=34)와 옆머리만 남깁니다
        if (x, y) in face_px.px and y > 29 and abs(x - CX) < 9:
            continue
        c.set(x, y, col)


def face(c):
    c.ellipse(CX, HEAD_CY + 5, 11.5, 10.5, SKIN)


def head_detail(c, eyes="open"):
    # 머리 결(프로필의 잉크 선처럼 파란 광택 가닥)
    for x0, y0, x1, y1, col in [
        (-10, 13, -5, 8, HAIR_HI), (-6, 12, -3, 6, HAIR2), (1, 11, 4, 6, HAIR_HI), (6, 12, 10, 8, HAIR2),
        (-11, 18, -7, 14, HAIR2), (9, 16, 13, 13, HAIR_HI), (-2, 19, -1, 24, HAIR2), (4, 19, 5, 24, HAIR2),
        (-8, 20, -8, 25, HAIR2), (8, 20, 9, 25, HAIR2)]:
        c.line(CX + x0, y0, CX + x1, y1, col)
    # 눈 (차분한 반쯤 감은 눈 / 뜬 눈 / 웃는 눈)
    ey = HEAD_CY + 5
    for ex in (CX - 5, CX + 5):
        if eyes == "smile":
            c.pts([(ex - 1, ey + 1), (ex, ey), (ex + 1, ey + 1)], EYE)
        elif eyes == "focus":
            c.line(ex - 2, ey, ex + 1, ey, EYE)
            c.line(ex - 1, ey + 1, ex, ey + 1, EYE)
        else:
            c.rect(ex - 1, ey - 1, ex, ey + 1, EYE)
            c.set(ex - 1, ey - 1, WHITE)
        c.line(ex - 2, ey - 3, ex + 1, ey - 3, HAIR) if eyes != "smile" else None
    # 볼터치, 입
    c.pts([(CX - 8, ey + 3), (CX - 7, ey + 3), (CX + 7, ey + 3), (CX + 8, ey + 3)], BLUSH)
    if eyes == "smile":
        c.pts([(CX - 1, ey + 5), (CX, ey + 6), (CX + 1, ey + 5)], LINE)
    else:
        c.pts([(CX - 1, ey + 5), (CX, ey + 5)], SKIN2)


def headphones(c):
    # 머리띠
    for i in range(0, 181, 3):
        a = math.radians(180 + i)
        x = CX + 17.5 * math.cos(a)
        y = HEAD_CY - 2 + 16.5 * math.sin(a)
        c.ellipse(x, y, 1.3, 1.3, BAND)
    # 귀 컵(양쪽). 프로필처럼 크고 둥근 오버이어
    for sx in (-1, 1):
        x = CX + sx * 16
        c.ellipse(x, HEAD_CY + 4, 4.6, 6.2, PHONE)


def headphones_detail(c):
    for sx in (-1, 1):
        x = CX + sx * 16
        c.ellipse(x, HEAD_CY + 4, 2.6, 4.0, PHONE2)
        c.ellipse(x, HEAD_CY + 4, 1.4, 2.4, INK)
        c.set(round(x) - sx, HEAD_CY + 1, (140, 150, 255, 255))
    # 머리띠 윗부분 쿠션
    c.rect(CX - 5, HEAD_CY - 19, CX + 5, HEAD_CY - 18, GREY)


# 소품 --------------------------------------------------------------------
def laptop(c, x, y):
    """무릎/손 앞의 노트북. (x,y)는 화면 왼쪽 위"""
    c.rect(x, y, x + 20, y + 12, GREY2)            # 화면 뚜껑
    c.rect(x + 1, y + 1, x + 19, y + 11, SCREEN)
    lines = [(GREEN, 2, 8), (CYAN, 4, 12), (PINK, 4, 9), (YELLOW, 6, 10), (GREEN, 2, 6)]
    for i, (col, x0, ln) in enumerate(lines):
        c.line(x + x0, y + 2 + i * 2, x + x0 + ln, y + 2 + i * 2, col)
    c.rect(x - 2, y + 13, x + 22, y + 14, GREY)     # 키보드 몸통
    c.line(x + 7, y + 13, x + 13, y + 13, GREY2)


def mug(c, x, y):
    c.rect(x, y, x + 5, y + 6, MUG)
    c.rect(x + 1, y, x + 4, y, COFFEE)
    c.pts([(x + 6, y + 2), (x + 7, y + 3), (x + 6, y + 4)], MUG)
    c.pts([(x + 2, y + 4), (x + 3, y + 4)], INK)   # 머그 잉크 로고


def steam(c, x, y):
    c.pts([(x, y), (x + 1, y - 1), (x, y - 2), (x + 1, y - 3), (x + 3, y - 1), (x + 4, y - 2), (x + 3, y - 3), (x + 4, y - 4)], STEAM)


def bubble(c, x, y, w, h, fill=WHITE):
    c.rect(x, y, x + w, y + h, fill)
    c.pts([(x + 2, y + h + 1), (x + 3, y + h + 1), (x + 2, y + h + 2)], fill)


def bug(c, x, y):
    c.ellipse(x + 2, y + 2, 2.5, 2.2, RED)
    c.pts([(x - 1, y + 1), (x - 1, y + 3), (x + 5, y + 1), (x + 5, y + 3), (x + 1, y - 1), (x + 3, y - 1)], EYE)
    c.set(x + 2, y + 1, (255, 170, 170, 255))


def magnifier(c, x, y):
    c.ellipse(x, y, 4.2, 4.2, GREY2)
    c.ellipse(x, y, 3, 3, GLASS)
    c.thick(x + 3, y + 3, x + 6, y + 6, 1.1, (120, 80, 60, 255))


def rocket(c, x, y):
    c.rect(x, y + 2, x + 4, y + 9, WHITE)
    c.pts([(x + 1, y + 1), (x + 2, y), (x + 3, y + 1)], WHITE)
    c.set(x + 2, y + 1, RED)
    c.ellipse(x + 2, y + 5, 1.2, 1.2, INK)
    c.pts([(x - 1, y + 8), (x - 1, y + 9), (x + 5, y + 8), (x + 5, y + 9)], RED)
    c.pts([(x + 1, y + 10), (x + 2, y + 11), (x + 3, y + 10), (x + 2, y + 12)], YELLOW)
    c.pts([(x + 2, y + 13)], (255, 150, 60, 255))


def check_badge(c, x, y):
    c.ellipse(x, y, 5, 5, GREEN)
    c.pts([(x - 2, y), (x - 1, y + 1), (x, y + 2), (x + 1, y + 1), (x + 2, y), (x + 3, y - 1)], WHITE)


def robot(c, x, y):
    """AI 페어 프로그래머 — 둥둥 떠 있는 작은 로봇"""
    c.set(x, y - 7, YELLOW)
    c.line(x, y - 6, x, y - 5, GREY2)
    c.ellipse(x, y, 6.5, 5, (225, 232, 250, 255))
    c.rect(x - 4, y - 2, x + 4, y + 2, SCREEN)
    c.rect(x - 3, y - 1, x - 2, y, CYAN)
    c.rect(x + 2, y - 1, x + 3, y, CYAN)
    c.pts([(x - 1, y + 2), (x, y + 2), (x + 1, y + 2)], CYAN)
    c.pts([(x - 7, y), (x + 7, y)], GREY)
    c.ellipse(x, y + 8, 3, 0.8, (150, 170, 255, 120))


# 포즈 ------------------------------------------------------------------
def draw(pose):
    c = Canvas()
    eyes = "open"
    leg = "stand"
    back_props = []      # 몸 뒤
    front = []           # 몸 앞(테두리 전에)
    after = []           # 테두리 없이 위에 찍는 것(빛·김 등)

    if pose == "standing":
        arms = [(-9, 49, -12, 60), (9, 49, 12, 60)]
    elif pose == "waving":
        eyes = "smile"
        arms = [(-9, 49, -12, 60), (10, 48, 22, 38)]
    elif pose == "coding":
        eyes = "focus"
        arms = [(-9, 49, -6, 60), (9, 49, 6, 60)]
        front.append(lambda c: laptop(c, CX - 10, 52))
    elif pose == "coffee":
        eyes = "smile"
        arms = [(-9, 49, -12, 60), (9, 49, 10, 53)]
        front.append(lambda c: mug(c, CX + 9, 49))
        after.append(lambda c: steam(c, CX + 10, 46))
    elif pose == "debugging":
        eyes = "focus"
        arms = [(-9, 49, -12, 60), (9, 48, 16, 44)]
        front.append(lambda c: magnifier(c, CX + 20, 40))
        front.append(lambda c: bug(c, CX + 18, 38))
    elif pose == "deploy":
        eyes = "smile"
        leg = "walk"
        arms = [(-9, 49, -12, 60), (10, 48, 21, 37)]
        front.append(lambda c: rocket(c, CX + 20, 22))
    elif pose == "tests":
        eyes = "smile"
        arms = [(-9, 48, -21, 38), (9, 48, 21, 38)]
        front.append(lambda c: check_badge(c, CX + 25, 30))
    elif pose == "ai":
        eyes = "open"
        leg = "float"
        arms = [(-9, 49, -12, 60), (9, 48, 15, 46)]
        back_props.append(lambda c: robot(c, CX + 24, 34))
    else:
        raise ValueError(pose)

    def part(fn):
        p = Canvas()
        fn(p)
        p.outline(OUT)
        return p

    for f in back_props:
        c.merge(part(f))
    c.merge(part(lambda p: (legs(p, leg), torso(p))))
    c.merge(part(lambda p: (head(p), p.ellipse(CX, HEAD_CY - 2, 17.5, 15, HAIR), face(p))))
    c.merge(part(hair_front))
    c.merge(part(headphones))
    for sx, sy, ex, ey in arms:
        c.merge(part(lambda p, a=(sx, sy, ex, ey): arm(p, CX + a[0], a[1], CX + a[2], a[3])))
    for f in front:
        c.merge(part(f))
    legs_detail(c, leg)
    torso_detail(c)
    head_detail(c, eyes)
    headphones_detail(c)
    for f in after:
        f(c)
    return c.image()


POSES = ["standing", "waving", "coding", "coffee", "debugging", "deploy", "tests", "ai"]

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "public/assets/character"
    os.makedirs(out, exist_ok=True)
    sheet = Image.new("RGBA", (len(POSES) * 300, 400), (236, 238, 246, 255))
    for i, p in enumerate(POSES):
        im = draw(p)
        im.save(f"{out}/minime-{p}.png")
        sheet.alpha_composite(im, (i * 300 + (300 - im.width) // 2, 400 - im.height - 10))
    sheet.save(f"{out}/sheet.png")
    print("ok", [draw(p).size for p in POSES])
