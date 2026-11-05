/*
 * TV Livre — catálogo de canais
 * ------------------------------------------------------------------
 * Regra de curadoria (vale para tudo que entra aqui):
 *   1. Só transmissões que a própria emissora, uma afiliada ou um canal
 *      FAST oficial publica de graça, sem login e sem DRM.
 *   2. Só HTTPS (o app roda em HTTPS; links http:// são bloqueados pelo navegador).
 *   3. Nada de canal pago (GloboNews, SporTV, Viva, BandSports…), nada de
 *      captura de satélite/operadora (IPs soltos, "_sat", URLs com token).
 *   4. Quando a emissora não libera o sinal para outros apps (Globo),
 *      o canal aparece com o atalho para o app oficial e a explicação.
 *
 * Tipos de fonte:
 *   { type: "hls", url, label, origin }         -> toca no player do app
 *   { type: "youtube", video, label, origin }   -> toca no player do YouTube dentro do app
 *   origin: "oficial" | "afiliada" | "fast" | "publica" | "comunidade"
 *
 * "match" = ids do projeto iptv-org usados na atualização automática
 * de fontes (só endereços que passam pela mesma regra acima).
 */
window.TV_CATALOG = {
  version: "3.0.1",
  curated: "2026-11-05", verifiedFromBrazil: "2026-11-05",
  categories: [
    { id: "principais", name: "Abertas nacionais" },
    { id: "noticias", name: "Notícias 24h" },
    { id: "esporte", name: "Esporte" },
    { id: "publicas", name: "Públicas e educativas" },
    { id: "variedades", name: "Variedades" },
    { id: "religiosos", name: "Religiosos" }
  ],
  channels: [
    {
      id: "globo", num: 1, name: "Globo", short: "Globo", hue: 214, category: "principais", featured: true,
      tagline: "Novelas, Jornal Nacional, futebol",
      sources: [],
      match: [],
      official: [
        { label: "Abrir o Globoplay", url: "https://globoplay.globo.com/", hint: "Ao vivo grátis com conta Globo gratuita" }
      ],
      notice: "A Globo só libera o sinal ao vivo gratuito dentro do Globoplay, com conta Globo grátis e a localização ativada. O vídeo é protegido por DRM, então nenhum aplicativo de terceiros consegue exibir a Globo legalmente. Aqui no TV Livre você tem o ge TV (canal gratuito oficial do Grupo Globo) e o atalho direto para o Globoplay.",
      related: "ge-tv"
    },
    {
      id: "sbt", num: 2, name: "SBT", short: "SBT", hue: 4, category: "principais", featured: true,
      tagline: "Pelas afiliadas, sinal nacional",
      sources: [
        { type: "hls", url: "https://6836041ea1117.streamlock.net/cverde/cverde/playlist.m3u8", label: "TV Cidade Verde (afiliada)", origin: "afiliada" },
        { type: "hls", url: "https://video09.logicahost.com.br/sbtroo/sbtroo/playlist.m3u8", label: "SBT Rondonópolis (afiliada)", origin: "afiliada" },
        { type: "hls", url: "https://cdn.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/playlist.m3u8", label: "SBT Interior (afiliada)", origin: "afiliada" },
        { type: "hls", url: "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8", label: "SBT Interior · servidor 2", origin: "afiliada" },
        { type: "hls", url: "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8", label: "SBT Cuiabá (afiliada)", origin: "afiliada" },
        { type: "hls", url: "https://video09.logicahost.com.br/sbtmutum/sbtmutum/playlist.m3u8", label: "SBT Nova Mutum (afiliada)", origin: "afiliada" },
        { type: "hls", url: "https://stream.amsolution.net.br:8443/live/60d0a8ea6b884/index.m3u8", label: "TV Difusora Leste (afiliada)", origin: "afiliada" },
        { type: "hls", url: "https://video09.logicahost.com.br/tvparaense/tvparaense/playlist.m3u", label: "TV Paraense (afiliada)", origin: "afiliada" },
        { type: "youtube", video: "ABVQXgr2LW4", label: "YouTube oficial do SBT", origin: "oficial" }
      ],
      match: ["SBTNacional.br", "SBTInterior.br", "SBTCuiaba.br", "SBTRondonopolis.br", "SBTNovaMutum.br", "TVDifusoraLeste.br", "TVParaense.br", "VTV.br", "TVAllamanda.br"],
      official: [
        { label: "Abrir o +SBT", url: "https://mais.sbt.com.br/", hint: "App oficial grátis, pede cadastro" },
        { label: "Site do SBT ao vivo", url: "https://www.sbt.com.br/ao-vivo", hint: "Sem cadastro" },
        { label: "SBT no YouTube", url: "https://www.youtube.com/@sbt/live", hint: "Transmissão oficial" }
      ]
    },
    {
      id: "record", num: 3, name: "Record", short: "Record", hue: 222, category: "principais", featured: true,
      tagline: "Sinal aberto via fonte pública",
      sources: [
        { type: "hls", url: "https://cdn.jmvstream.com/w/LVW-10842/LVW10842_513N26MDBL/chunklist.m3u8", label: "Record (fonte pública de afiliada)", origin: "afiliada" }
      ],
      match: ["Record.br", "RecordTV.br", "RecordTVSaoPaulo.br", "RecordTVRio.br", "RecordRS.br", "NDTVRecordTVCriciuma.br"],
      official: [
        { label: "Site da Record ao vivo", url: "https://record.r7.com/programacao/", hint: "Grátis, sem app" },
        { label: "Record News no app", url: "#ch=record-news", hint: "Canal oficial 24h, toca aqui" }
      ],
      notice: "A Record oficial só oferece o sinal completo no site R7 e no RecordPlus (plano gratuito com cadastro). Aqui o app usa uma fonte pública de afiliada, que pode sair do ar; quando isso acontece, o botão abaixo abre o site oficial."
    },
    {
      id: "band", num: 4, name: "Band", short: "Band", hue: 140, category: "principais",
      tagline: "Pela afiliada RBATV (PA)",
      sources: [
        { type: "hls", url: "https://cdn.live.br1.jmvstream.com/w/LVW-15748/LVW15748_Yed7yzLuRC/playlist.m3u8", label: "RBATV · afiliada Band no Pará", origin: "afiliada" }
      ],
      match: ["RBATV.br", "TVModelo.br"],
      official: [{ label: "Site da Band", url: "https://www.band.uol.com.br/", hint: "Portal oficial" }]
    },
    {
      id: "redetv", num: 5, name: "RedeTV!", short: "RedeTV!", hue: 300, category: "principais",
      tagline: "Sinal SP e afiliadas",
      sources: [
        { type: "hls", url: "https://tv01.zas.media:1936/redetvparana/redetvparana/playlist.m3u8", label: "RedeTV! Paraná (afiliada)", origin: "afiliada" },
        { type: "hls", url: "https://5b7f3c45ab7c2.streamlock.net/arapuan/ngrp:arapuan_all/playlist.m3u8", label: "TV Arapuan (afiliada PB)", origin: "afiliada" },
        { type: "hls", url: "https://6836041ea1117.streamlock.net/tvodia/tvodia/playlist.m3u8", label: "O Dia TV (afiliada PI)", origin: "afiliada" },
        { type: "hls", url: "https://hls.brasilstream.com.br/live/redetv/redetv/playlist.m3u8", label: "RedeTV! SP (não é 24h)", origin: "oficial" }
      ],
      match: ["RedeTV.br", "RedeTVParana.br", "TVArapuan.br", "ODiaTV.br"],
      official: [{ label: "Site da RedeTV!", url: "https://www.redetv.uol.com.br/", hint: "Portal oficial" }]
    },
    {
      id: "cultura", num: 6, name: "TV Cultura", short: "Cultura", hue: 28, category: "principais",
      tagline: "Roda Viva, Jornal da Cultura, infantil",
      sources: [
        { type: "hls", url: "https://player-tvcultura.stream.uol.com.br/live/tvcultura.m3u8", label: "TV Cultura oficial", origin: "oficial" },
        { type: "hls", url: "https://v-us-01.wisestream.io/memfs/e8740862-7a1f-45f3-acb2-4f357e144059.m3u8", label: "TV Cultura · servidor 2", origin: "oficial" }
      ],
      match: ["TVCultura.br"],
      official: []
    },
    {
      id: "tv-brasil", num: 7, name: "TV Brasil", short: "TV Brasil", hue: 196, category: "principais",
      tagline: "Emissora pública (EBC)",
      sources: [
        { type: "hls", url: "https://tvbrasil-stream.ebc.com.br/index.m3u8", label: "TV Brasil oficial (EBC)", origin: "publica" }
      ],
      match: ["TVBrasil.br"],
      official: []
    },

    {
      id: "record-news", num: 10, name: "Record News", short: "R News", hue: 226, category: "noticias",
      tagline: "Jornalismo 24h do Grupo Record",
      sources: [
        { type: "hls", url: "https://rnw-rn.otteravision.com/rnw/rn/rnw_rn.m3u8", label: "Record News oficial", origin: "fast" },
        { type: "hls", url: "https://stream.ads.ottera.tv/playlist.m3u8?network_id=2116", label: "Record News · servidor 2", origin: "fast" }
      ],
      match: ["RecordNews.br"],
      official: []
    },
    {
      id: "sbt-news", num: 11, name: "SBT News", short: "SBT News", hue: 8, category: "noticias",
      tagline: "Jornalismo 24h do SBT",
      sources: [
        { type: "hls", url: "https://dai.google.com/linear/hls/event/1XSOdtQ0SH2G8OEmEfGgjQ/master.m3u8", label: "SBT News oficial", origin: "fast" }
      ],
      match: ["SBTNews.br"],
      official: []
    },
    {
      id: "cnn-brasil", num: 12, name: "CNN Brasil", short: "CNN BR", hue: 0, category: "noticias",
      tagline: "Notícias ao vivo",
      sources: [
        { type: "hls", url: "https://d25usgadhphvwi.cloudfront.net/hls/main.m3u8", label: "CNN Brasil (sinal web)", origin: "oficial" }
      ],
      match: ["CNNBrasil.br"],
      official: []
    },
    {
      id: "jovem-pan", num: 13, name: "Jovem Pan News", short: "JP News", hue: 210, category: "noticias",
      tagline: "Notícias e debates (não é 24h)",
      sources: [
        { type: "hls", url: "https://d6yfbj4xxtrod.cloudfront.net/out/v1/7836eb391ec24452b149f3dc6df15bbd/index.m3u8", label: "Jovem Pan News oficial", origin: "oficial" }
      ],
      match: ["JovemPanNews.br"],
      official: []
    },
    {
      id: "canal-gov", num: 14, name: "Canal Gov", short: "Gov", hue: 160, category: "noticias",
      tagline: "Governo federal (EBC)",
      sources: [
        { type: "hls", url: "https://canalgov-stream.ebc.com.br/index.m3u8", label: "Canal Gov oficial (EBC)", origin: "publica" }
      ],
      match: ["CanalGov.br"],
      official: []
    },

    {
      id: "ge-tv", num: 20, name: "ge TV", short: "ge TV", hue: 132, category: "esporte",
      tagline: "Canal gratuito de esporte do Grupo Globo",
      sources: [
        { type: "hls", url: "https://amg00716-globo-amg00716c1-tcl-br-9495.playouts.now.amagi.tv/playlist.m3u8", label: "ge TV oficial (FAST)", origin: "fast" },
        { type: "hls", url: "https://dfr80qz435crc.cloudfront.net/EFGH/Amagi/Globo/GE_Fast_BR/GE_Fast.m3u8", label: "ge TV · servidor 2", origin: "fast" }
      ],
      match: ["geTV.br"],
      official: []
    },

    {
      id: "tv-camara", num: 30, name: "TV Câmara", short: "Câmara", hue: 150, category: "publicas",
      tagline: "Câmara dos Deputados",
      sources: [
        { type: "hls", url: "https://stream3.camara.gov.br/tv1/manifest.m3u8", label: "TV Câmara oficial", origin: "publica" }
      ],
      match: ["TVCamara.br"],
      official: []
    },
    {
      id: "tv-camara-2", num: 31, name: "TV Câmara 2", short: "Câmara 2", hue: 155, category: "publicas",
      tagline: "Comissões e sessões (não é 24h)",
      sources: [
        { type: "hls", url: "https://stream3.camara.gov.br/tv2/manifest.m3u8", label: "TV Câmara 2 oficial", origin: "publica" }
      ],
      match: ["TVCamara2.br"],
      official: []
    },
    {
      id: "cultura-fast", num: 32, name: "Cultura Fast", short: "C. Fast", hue: 36, category: "publicas",
      tagline: "Acervo da TV Cultura",
      sources: [
        { type: "hls", url: "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8", label: "Cultura Fast oficial", origin: "fast" }
      ],
      match: ["CulturaFast.br"],
      official: []
    },

    {
      id: "com-brasil", num: 40, name: "COM Brasil", short: "COM", hue: 262, category: "variedades",
      tagline: "Variedades e entretenimento",
      sources: [
        { type: "hls", url: "https://dfr80qz435crc.cloudfront.net/EFGH/Amagi/NewCo/New_Brasil_BR/New_Brasil.m3u8", label: "COM Brasil oficial (FAST)", origin: "fast" },
        { type: "hls", url: "https://br5093.streamingdevideo.com.br/abc/abc/playlist.m3u8", label: "COM Brasil · servidor 2", origin: "oficial" }
      ],
      match: ["COMBrasil.br"],
      official: []
    },
    {
      id: "rede-brasil", num: 41, name: "Rede Brasil", short: "R. Brasil", hue: 48, category: "variedades",
      tagline: "Rede aberta independente",
      sources: [
        { type: "hls", url: "https://video09.logicahost.com.br/redebrasiloficial/redebrasiloficial/playlist.m3u8", label: "Rede Brasil oficial", origin: "oficial" },
        { type: "hls", url: "https://redebrasil.nuvemplay.live/hls/stream.m3u8", label: "Rede Brasil · servidor 2", origin: "oficial" }
      ],
      match: ["RedeBrasil.br"],
      official: []
    },
    {
      id: "amazon-sat", num: 42, name: "Amazon Sat", short: "AmazonSat", hue: 120, category: "variedades",
      tagline: "Amazônia, natureza e cultura",
      sources: [
        { type: "hls", url: "https://amazonsat.brasilstream.com.br/hls/amazonsat/index.m3u8", label: "Amazon Sat oficial", origin: "oficial" }
      ],
      match: ["AmazonSat.br"],
      official: []
    },

    {
      id: "tv-aparecida", num: 50, name: "TV Aparecida", short: "Aparecida", hue: 205, category: "religiosos",
      tagline: "Missas e programação católica",
      sources: [
        { type: "hls", url: "https://cdn.jmvstream.com/w/LVW-9716/LVW9716_HbtQtezcaw/playlist.m3u8", label: "TV Aparecida oficial", origin: "oficial" }
      ],
      match: ["TVAparecida.br"],
      official: []
    }
  ]
};
