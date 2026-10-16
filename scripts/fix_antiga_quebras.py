"""Aplica correções manuais de quebra em traducoes/antiga_3linhas.txt.

Uso: python scripts/fix_antiga_quebras.py arquivo_de_correcoes.txt
O arquivo de correções tem o mesmo formato (número|l1 / l2 / l3). Uma correção só
é aceita se as palavras forem idênticas às da linha atual — muda só a quebra.
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "traducoes", "antiga_3linhas.txt")


def words(t):
    return " ".join(t.replace(" / ", " ").split())


def main(fix_path):
    lines = open(PATH, encoding="utf-8").read().splitlines()
    idx = {l.split("|", 1)[0]: i for i, l in enumerate(lines) if "|" in l and not l.startswith("#")}
    ok = bad = 0
    for row in open(fix_path, encoding="utf-8"):
        row = row.strip()
        if not row or row.startswith("#"):
            continue
        n, t = row.split("|", 1)
        cur = lines[idx[n]].split("|", 1)[1]
        if words(cur) != words(t) or t.count(" / ") != 2:
            print("REJEITADA", n, "\n  atual:", cur, "\n  nova: ", t)
            bad += 1
            continue
        lines[idx[n]] = n + "|" + t
        ok += 1
    open(PATH, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print(f"{ok} aplicadas, {bad} rejeitadas")


if __name__ == "__main__":
    main(sys.argv[1])
