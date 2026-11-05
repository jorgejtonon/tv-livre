# TV Livre 3.0 — como colocar no ar e instalar

Este repositório é o aplicativo completo. Endereço: **https://jorgejtonon.github.io/tv-livre/** Ele precisa ficar hospedado em um endereço **https** para tocar os canais e para instalar no celular. O jeito gratuito e permanente é o **GitHub Pages**, na sua conta `jorgejtonon`.

## 1. Publicar no GitHub Pages (uma vez só, ~5 minutos, pelo computador)

1. Entre em github.com e clique em **New repository**.
2. Nome: `tv-livre`. Marque **Public**. Clique em **Create repository**.
3. Na página do repositório, clique em **uploading an existing file**.
4. Abra a pasta `tv-livre/` deste ZIP, selecione **os 11 arquivos de dentro dela** (não a pasta) e arraste para a página. Clique em **Commit changes**.
5. Vá em **Settings → Pages**. Em *Branch*, escolha `main` e `/ (root)`, clique em **Save**.
6. Espere 1 a 2 minutos. O endereço do seu app será:

   **https://jorgejtonon.github.io/tv-livre/**

> Alternativa sem GitHub: app.netlify.com/drop — arraste a pasta `tv-livre/` e ele gera um endereço https na hora (crie a conta grátis para o link não expirar).

## 2. Instalar no celular Android

1. Abra **https://jorgejtonon.github.io/tv-livre/** no **Chrome**.
2. Menu **⋮ → Instalar app** (ou *Adicionar à tela inicial*).
3. O ícone **TV Livre** aparece na tela inicial e abre em tela própria, sem barra do navegador.

## 3. Instalar no computador

Abra o mesmo endereço no Chrome ou no Edge e clique no ícone de instalar que aparece no fim da barra de endereço.

## 4. Primeiro uso (importante)

1. Abra o app e toque em **Verificar canais**. Ele testa cada transmissão **a partir da sua internet**, que é o teste que vale de verdade. Leva menos de 1 minuto e gasta pouquíssimos dados.
2. Os cartões passam a mostrar **No ar**, **Fora do ar** ou **Só no app oficial**.
3. Toque num canal. Se a primeira fonte falhar, o player troca sozinho para a próxima e lembra qual funcionou.

## Uso no dia a dia

| Ação | Celular | Computador |
|---|---|---|
| Trocar de canal | deslizar o dedo para cima/baixo no vídeo, ou setas na barra | ↑ ↓ |
| Ir direto a um canal | — | digitar o número (ex.: 0 2 = SBT) |
| Tela cheia | toque duplo no vídeo ou botão ⛶ | F |
| Mudo / volume | botão de som | M / ← → |
| Trocar de fonte | botão **Fonte 2/9** | S |
| Voltar ao catálogo | botão voltar do Android | Esc |

## O que esperar de cada emissora principal

- **Globo**: abre o Globoplay. É o único lugar com o sinal ao vivo grátis (conta Globo gratuita + localização ligada), e o vídeo é protegido contra exibição em outros apps. Dentro do TV Livre você assiste ao **ge TV**, canal gratuito oficial do Grupo Globo.
- **SBT**: toca dentro do app pelo **YouTube oficial do SBT**, com 8 afiliadas como reserva automática.
- **Record**: toca por uma fonte pública de afiliada (pode cair). O **Record News** (oficial, 24h) toca direto no app. Sinal completo oficial: site R7 e RecordPlus.

## Atualização automática

Uma vez por semana o app confere as listas públicas **iptv-org** e **Free-TV** no GitHub e acrescenta endereços novos **dos mesmos canais**, com a regra: só https, nada de canal pago, nada de captura de satélite ou operadora, nunca na Globo. Também dá para forçar em **⋯ → Atualizar fontes agora**.

## Editar canais

Tudo fica em `channels.js`, comentado. Para adicionar uma fonte a um canal, copie uma linha `{ type: "hls", url: "...", label: "...", origin: "oficial" }` dentro de `sources`. Depois, suba o arquivo de novo no GitHub (ele substitui o anterior).

## Créditos

Player HLS: hls.js 1.7.3 (Apache 2.0). Fontes tipográficas: Archivo e JetBrains Mono (SIL OFL). Listas de referência: iptv-org e Free-TV (projetos abertos no GitHub).
