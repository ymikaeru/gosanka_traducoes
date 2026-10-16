# 御讃歌集（改訂版） — Traduções

Ferramenta para preparar o novo Livro de Oração a partir do 御讃歌集（改訂版） de Meishu-sama (462 poemas).
Cada poema mostra a leitura em romaji, o original japonês como referência e, lado a lado, duas traduções:

- **Fiel** — segue a ordem dos versos do waka e conserva as imagens escolhidas por Meishu-sama
  (眼を醒す = "abrir os olhos", 塵も芥も = "pó e cisco"), em 3 linhas que correspondem aos 3 blocos do original.
- **Antiga** — a tradução atual do acervo, com as mesmas palavras, apenas redistribuída nas mesmas 3 linhas.

Em cada poema é possível escolher a versão que entra no livro (Fiel, Antiga ou Editada) e exportar o
rascunho em Markdown. As escolhas ficam salvas no navegador; use **Exportar → Backup (.json)** para guardá-las.

## Como abrir

```bash
python -m http.server 8765
```

Depois acesse `http://localhost:8765`.

## Acesso

O site pede a mesma senha do Mioshie Zenshu (`login.html`, chave de sessão `mioshie_auth`).
Como este repositório é público, o código guarda apenas o SHA-256 da senha, não o texto.
É uma barreira para visitantes casuais: os arquivos do repositório continuam públicos.

## Estrutura

| Caminho | Conteúdo |
|---|---|
| `index.html`, `css/`, `js/` | o site |
| `data/gosanka.js` | dados gerados (não editar à mão) |
| `traducoes/fiel_00*.txt` | tradução fiel — `número\|linha 1 / linha 2 / linha 3` |
| `traducoes/antiga_3linhas.txt` | tradução antiga em 3 linhas (só as quebras podem mudar) |
| `traducoes/_5_versos/` | versão anterior da tradução fiel, em 5 versos |
| `scripts/` | geração dos dados |

## Regenerar os dados

Depois de editar algum arquivo em `traducoes/`:

```bash
python scripts/build_data.py
```

O script lê os originais de `../new_mioshie_zenshu/data/poetry/gosanka_kaitei.json` e confere que a
tradução antiga em 3 linhas tem exatamente as mesmas palavras do acervo.
