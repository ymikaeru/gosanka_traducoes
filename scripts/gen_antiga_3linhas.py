"""Gera traducoes/antiga_3linhas.txt: a tradução antiga redistribuída em 3 linhas,
na mesma proporção das linhas da tradução fiel, sem alterar nenhuma palavra.

As quebras preferem cair depois de pontuação e evitam terminar linha em
preposição/artigo. Maiúsculas "de início de verso" que ficam no meio da frase
passam a minúsculas (nomes próprios e pronomes divinos são preservados).

Uso:  python scripts/gen_antiga_3linhas.py   (depois revise o arquivo à mão)
"""
import glob
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "..", "new_mioshie_zenshu", "data", "poetry", "gosanka_kaitei.json")
OUT = os.path.join(ROOT, "traducoes", "antiga_3linhas.txt")

KEEP_CAPS = {"Deus", "Cristo", "Izunome", "Eu", "Ele", "Kannon", "Miroku", "Messias", "Komyo", "Buda"}
WEAK = set("""a o as os um uma uns umas e ou de do da dos das em no na nos nas ao aos à às
por pelo pela pelos pelas para com sem sob sobre que se seu sua seus suas meu minha
teu tua nem mas pois como quão tão mais este esta estes estas esse essa deste desta
neste nesta cujo cuja cujos cujas onde quando até entre""".split())


def flatten(text):
    """Junta as linhas da tradução antiga num só texto, ajustando maiúsculas de verso."""
    text = re.sub(r"\s+/\s+", "\n", text.strip())
    parts = [p.strip() for p in text.split("\n") if p.strip()]
    out = parts[0] if parts else ""
    for part in parts[1:]:
        first = part.split(" ", 1)[0]
        bare = re.sub(r"\W", "", first)
        if out and out[-1] not in ".!?:" and first[:1].isupper() and bare not in KEEP_CAPS:
            part = part[0].lower() + part[1:]
        out += " " + part
    return re.sub(r"\s+", " ", out)


def best_breaks(words, targets):
    lens = [len(w) + 1 for w in words]
    total = float(sum(lens))
    cum, acc = [], 0
    for l in lens:
        acc += l
        cum.append(acc / total)

    def cost(i, target):  # quebra depois de words[i]
        w = words[i]
        c = abs(cum[i] - target)
        if w[-1] in ".!?;:": c -= .12
        elif w[-1] in ",—": c -= .08
        if re.sub(r"\W", "", w).lower() in WEAK: c += .25
        return c

    n = len(words)
    if n < 3:
        return [" ".join(words), "", ""]
    best = None
    for i in range(0, n - 2):
        for j in range(i + 1, n - 1):
            c = cost(i, targets[0]) + cost(j, targets[1])
            if best is None or c < best[0]:
                best = (c, i, j)
    _, i, j = best
    return [" ".join(words[:i + 1]), " ".join(words[i + 1:j + 1]), " ".join(words[j + 1:])]


def main():
    fiel = {}
    for path in sorted(glob.glob(os.path.join(ROOT, "traducoes", "fiel_*.txt"))):
        for line in open(path, encoding="utf-8"):
            line = line.strip()
            if line and not line.startswith("#"):
                n, t = line.split("|", 1)
                fiel[int(n)] = [x.strip() for x in t.split(" / ")]
    src = json.load(open(SRC, encoding="utf-8"))
    rows = ["# Tradução antiga redistribuída em 3 linhas (mesmas palavras do acervo).",
            "# Formato: número|linha 1 / linha 2 / linha 3 — ajuste só as quebras, não o texto."]
    for s in src["sections"]:
        for p in s["poems"]:
            f = fiel[p["num"]]
            fl = [len(x) for x in f]
            t1 = fl[0] / sum(fl)
            t2 = (fl[0] + fl[1]) / sum(fl)
            lines = best_breaks(flatten(p["traducao"]).split(" "), (t1, t2))
            rows.append(f'{p["num"]}|' + " / ".join(lines))
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(rows) + "\n")
    print("OK ->", OUT)


if __name__ == "__main__":
    main()
