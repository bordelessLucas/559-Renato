"""Gera PNG transparente da logo Olhar+IA, incluindo miolos de O/A."""
from collections import deque
from PIL import Image

SRC = r"c:\borderless\projetos\559-Renato\docs-ia\marca\logo-olhar-mais-ia.jpeg"
OUT_PUBLIC = r"c:\borderless\projetos\559-Renato\public\brand\logo-olhar-mais-ia.png"
OUT_DOCS = r"c:\borderless\projetos\559-Renato\docs-ia\marca\logo-olhar-mais-ia.png"


def near_white(r, g, b, a, thr=235):
    if a == 0:
        return True
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    return lum >= thr and min(r, g, b) >= thr - 18


def flood_edge_background(pixels, w, h):
    visited = [[False] * h for _ in range(w)]
    q = deque()

    for x in range(w):
        for y in (0, h - 1):
            r, g, b, a = pixels[x, y]
            if near_white(r, g, b, a):
                q.append((x, y))
                visited[x][y] = True

    for y in range(h):
        for x in (0, w - 1):
            if not visited[x][y]:
                r, g, b, a = pixels[x, y]
                if near_white(r, g, b, a):
                    q.append((x, y))
                    visited[x][y] = True

    neighbors8 = (
        (-1, 0),
        (1, 0),
        (0, -1),
        (0, 1),
        (-1, -1),
        (1, -1),
        (-1, 1),
        (1, 1),
    )

    while q:
        x, y = q.popleft()
        pixels[x, y] = (0, 0, 0, 0)
        for dx, dy in neighbors8:
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[nx][ny]:
                r, g, b, a = pixels[nx, ny]
                if near_white(r, g, b, a, thr=228):
                    visited[nx][ny] = True
                    q.append((nx, ny))


def clear_fringe(pixels, w, h):
    fringe = []
    for x in range(w):
        for y in range(h):
            r, g, b, a = pixels[x, y]
            if a == 0 or not near_white(r, g, b, a, thr=220):
                continue
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and pixels[nx, ny][3] == 0:
                    fringe.append((x, y))
                    break
    for x, y in fringe:
        pixels[x, y] = (0, 0, 0, 0)

    for x in range(w):
        for y in range(h):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            touches = any(
                0 <= x + dx < w
                and 0 <= y + dy < h
                and pixels[x + dx, y + dy][3] == 0
                for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1))
            )
            if touches:
                lum = 0.299 * r + 0.587 * g + 0.114 * b
                if lum > 200 and min(r, g, b) > 180:
                    pixels[x, y] = (0, 0, 0, 0)


def find_icon_cutoff(pixels, w, h):
    """Encontra o vão entre o ícone e o wordmark (coluna quase sem tinta)."""
    ink = []
    for x in range(w):
        count = 0
        for y in range(h):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            if lum < 230:
                count += 1
        ink.append(count)

    # Procura o primeiro vão largo após o bloco do ícone
    threshold = max(3, h // 80)
    in_icon = False
    gap_start = None
    for x, count in enumerate(ink):
        if count > threshold:
            if gap_start is not None and x - gap_start >= 8 and in_icon:
                return gap_start + (x - gap_start) // 2
            in_icon = True
            gap_start = None
        elif in_icon:
            if gap_start is None:
                gap_start = x

    return int(w * 0.30)


def clear_letter_counters(pixels, w, h, icon_cutoff):
    """Remove brancos fechados à direita do ícone (miolos de O/A e tagline)."""
    visited = [[False] * h for _ in range(w)]
    cleared = 0

    for sx in range(w):
        for sy in range(h):
            if visited[sx][sy]:
                continue
            r, g, b, a = pixels[sx, sy]
            if a == 0 or not near_white(r, g, b, a, thr=232):
                visited[sx][sy] = True
                continue

            # BFS do componente branco
            q = deque([(sx, sy)])
            visited[sx][sy] = True
            component = [(sx, sy)]
            min_x = max_x = sx

            while q:
                x, y = q.popleft()
                for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    nx, ny = x + dx, y + dy
                    if not (0 <= nx < w and 0 <= ny < h) or visited[nx][ny]:
                        continue
                    nr, ng, nb, na = pixels[nx, ny]
                    if na == 0 or not near_white(nr, ng, nb, na, thr=232):
                        continue
                    visited[nx][ny] = True
                    q.append((nx, ny))
                    component.append((nx, ny))
                    min_x = min(min_x, nx)
                    max_x = max(max_x, nx)

            # Preserva branco do olho / check no ícone
            if max_x < icon_cutoff:
                continue

            # Se o blob começa no ícone e só vaza um pouco, mantém
            if min_x < icon_cutoff and (max_x - min_x) > (w * 0.12):
                continue

            # Miolo tipográfico: limpa
            for x, y in component:
                pixels[x, y] = (0, 0, 0, 0)
            cleared += 1

    return cleared


def main():
    img = Image.open(SRC).convert("RGBA")
    pixels = img.load()
    w, h = img.size

    flood_edge_background(pixels, w, h)
    clear_fringe(pixels, w, h)

    cutoff = find_icon_cutoff(pixels, w, h)
    cleared = clear_letter_counters(pixels, w, h, cutoff)

    # Segunda passada de fringe após limpar miolos
    clear_fringe(pixels, w, h)

    bbox = img.getbbox()
    if bbox:
        pad = 4
        img = img.crop(
            (
                max(0, bbox[0] - pad),
                max(0, bbox[1] - pad),
                min(w, bbox[2] + pad),
                min(h, bbox[3] + pad),
            )
        )

    img.save(OUT_PUBLIC, "PNG")
    img.save(OUT_DOCS, "PNG")
    print(f"ok size={img.size} icon_cutoff={cutoff} counters_cleared={cleared}")


if __name__ == "__main__":
    main()
