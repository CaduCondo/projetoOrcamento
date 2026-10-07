"""Gera os ícones do aplicativo (PNG) em src/static/icons — sem depender de nenhuma biblioteca externa.
    python tools/gerar_icones.py
Desenho: quadrado azul com "R$" branco. Também gera a versão "maskable" (sem cantos arredondados, com margem de segurança).
"""
import os, struct, zlib

FONT = {  # letras 5x7
    'R': ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    '$': ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
}
AZUL = (47, 111, 237, 255)
BRANCO = (255, 255, 255, 255)
TRANSP = (0, 0, 0, 0)

def png(path, w, h, pixels):
    raw = b''.join(b'\x00' + bytes(v for px in pixels[y * w:(y + 1) * w] for v in px) for y in range(h))
    def chunk(t, d):
        c = struct.pack('>I', len(d)) + t + d
        return c + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))

def icone(n, arredondado, escala):
    px = [AZUL] * (n * n)
    if arredondado:                                   # cantos arredondados (transparentes)
        r = n * 0.22
        for y in range(n):
            for x in range(n):
                cx = min(max(x, r), n - 1 - r); cy = min(max(y, r), n - 1 - r)
                if (x - cx) ** 2 + (y - cy) ** 2 > r * r:
                    px[y * n + x] = TRANSP
    texto = 'R$'; cols = 5 * len(texto) + (len(texto) - 1)
    cel = n * escala / cols
    x0 = (n - cols * cel) / 2; y0 = (n - 7 * cel) / 2
    for i, ch in enumerate(texto):
        for ry, linha in enumerate(FONT[ch]):
            for rx, bit in enumerate(linha):
                if bit == '1':
                    ax = x0 + (i * 6 + rx) * cel; ay = y0 + ry * cel
                    for y in range(int(ay), int(ay + cel + 0.999)):
                        for x in range(int(ax), int(ax + cel + 0.999)):
                            if 0 <= x < n and 0 <= y < n and px[y * n + x] != TRANSP:
                                px[y * n + x] = BRANCO
    return px

if __name__ == '__main__':
    saida = os.path.join(os.path.dirname(__file__), '..', 'src', 'static', 'icons')
    os.makedirs(saida, exist_ok=True)
    for n in (180, 192, 512):
        png(os.path.join(saida, f'icon-{n}.png'), n, n, icone(n, True, 0.62))
    png(os.path.join(saida, 'icon-maskable-512.png'), 512, 512, icone(512, False, 0.46))   # miolo menor: o sistema recorta as bordas
    print('ícones gerados em', os.path.normpath(saida))
