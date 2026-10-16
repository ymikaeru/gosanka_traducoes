"""Gera data/gosanka.js a partir do JSON do new_mioshie_zenshu + traducoes/fiel_*.txt.

Uso:  python scripts/build_data.py
"""
import glob
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "..", "new_mioshie_zenshu", "data", "poetry", "gosanka_kaitei.json")
OUT = os.path.join(ROOT, "data", "gosanka.js")


def load_lines(pattern):
    fiel = {}
    for path in sorted(glob.glob(os.path.join(ROOT, "traducoes", pattern))):
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                num, text = line.split("|", 1)
                fiel[int(num)] = [v.strip() for v in text.split(" / ")]
    return fiel


def romaji_3(leitura):
    """Agrupa a leitura (5 ku) nas 3 linhas do original impresso: 5 / 7-5 / 7-7."""
    ku = [k.strip() for k in leitura.split(" / ") if k.strip()]
    if len(ku) == 5:
        return [ku[0], ku[1] + " " + ku[2], ku[3] + " " + ku[4]]
    return ku


def same_words(a, b):
    norm = lambda t: " ".join(t.replace(" / ", " ").split()).lower()
    return norm(a) == norm(b)


def main():
    with open(SRC, encoding="utf-8") as f:
        src = json.load(f)
    fiel = load_lines("fiel_*.txt")
    antiga = load_lines("antiga_3linhas.txt")
    notas = {n: " / ".join(v) for n, v in load_lines("notas_*.txt").items()}

    sections, missing = [], []
    for s in src["sections"]:
        sec = {"jp": s["title_jp"], "pt": s["title_pt"], "poems": []}
        if s.get("intro"):
            sec["intro"] = s["intro"]
        for p in s["poems"]:
            n = p["num"]
            if n not in fiel:
                missing.append(n)
            old3 = antiga.get(n)
            if not old3 or not same_words(" ".join(old3), p.get("traducao", "")):
                sys.exit(f"Tradução antiga em 3 linhas ausente ou com palavras diferentes do acervo: {n}")
            sec["poems"].append({
                "n": n,
                "jp": p["original"],
                "ro": romaji_3(p.get("leitura", "")),
                "mk": p.get("marker", ""),
                "old": old3,
                "new": fiel.get(n, []),
            })
            if n in notas:
                sec["poems"][-1]["nt"] = notas[n]
        sections.append(sec)

    if missing:
        sys.exit(f"Faltam traduções fiéis para: {missing}")

    data = {
        "title_jp": src["title_jp"],
        "title_pt": src["title"],
        "dates": src.get("publication_date_pt", ""),
        "sections": sections,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("window.GOSANKA = ")
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    total = sum(len(s["poems"]) for s in sections)
    print(f"OK: {total} poemas, {len(sections)} seções -> {OUT}")


if __name__ == "__main__":
    main()
