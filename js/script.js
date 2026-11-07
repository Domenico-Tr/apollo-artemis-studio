/* =====================================================================
   Apollo Artemis Studio — comportamento della pagina
   I contenuti stanno nella cartella "contenuti" (file JSON) e si
   modificano dal pannello di gestione: qui non serve cambiare nulla.
   Indice:
     1. Utilità e lettura dei contenuti
     2. Segnaposto a tema mito (per le opere ancora senza foto)
     2b. Il cielo: alba della prima visita ed eclissi tra le sezioni
     3. Menu, filtri e griglia delle opere
     4. Scheda dell'opera a tutto schermo
     5. Eventi
     6. Contatti
     7. Testata e menu (fondo della barra, foglia d'oro, menu del telefono)
     7b. Passaggio tra le sezioni con l'eclissi
     9. Effetti a tema mito (nome inciso, polvere d'oro, cursore, fregio)
     10. Provalo nella tua stanza
     9b. Titoli d'oro, alone delle opere, simboli di fondo, orizzonti, stelle
     11. Mi piace e visualizzazioni
     8. Avvio
===================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------------
     1. Utilità
     ------------------------------------------------------------------ */
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const menoMovimento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // I colori del mito, a turno per categorie e voci di menu
  const PIGMENTI = ["var(--oro)", "var(--melograno)", "var(--egeo)", "var(--alloro)"];

  const NOMI_CATEGORIE = Object.fromEntries(CATEGORIE.map((c) => [c.id, c.nome]));
  const STATI = { disponibile: "Disponibile", venduta: "Venduta", riservata: "Riservata" };
  const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
  const MESI_BREVI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

  // Contenuti letti dai file JSON all'avvio
  let OPERE = [];
  let EVENTI = [];
  let CONTATTI = {};
  let PROCESSO = [];

  const percorsoLocale = (p) => String(p || "").trim().replace(/^\/+/, "");

  const slug = (s) =>
    String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  // Il pannello salva "Quadri", il sito usa "quadri": accetta entrambi
  function idCategoria(valore) {
    const t = String(valore || "").trim().toLowerCase();
    const c = CATEGORIE.find((x) => x.id === t || x.nome.toLowerCase() === t);
    if (c) return c.id;
    const ultima = CATEGORIE[CATEGORIE.length - 1];
    return ultima ? ultima.id : "altro";
  }

  function normalizzaOpera(o) {
    const opera = o && typeof o === "object" ? o : {};
    return {
      ...opera,
      id: opera.id || slug(opera.titolo) || "opera",
      titolo: String(opera.titolo || "Senza titolo"),
      categoria: idCategoria(opera.categoria),
      stato: String(opera.stato || "").trim().toLowerCase(),
      // "/img/foto.jpg" e "img/foto.jpg" funzionano entrambi, anche su GitHub Pages
      immagine: String(opera.immagine || "").trim().replace(/^\/+/, ""),
      inEvidenza: opera.inEvidenza === true || opera.inEvidenza === "true",
    };
  }

  function normalizzaEvento(e) {
    return {
      ...e,
      inizio: String(e.inizio).slice(0, 10),
      fine: e.fine ? String(e.fine).slice(0, 10) : "",
    };
  }

  async function caricaContenuti() {
    const leggi = async (percorso) => {
      const risposta = await fetch(percorso, { cache: "no-store" });
      if (!risposta.ok) throw new Error(`${percorso}: errore ${risposta.status}`);
      return risposta.json();
    };
    const [opere, eventi, sito, processo] = await Promise.all([
      leggi("contenuti/opere.json"),
      leggi("contenuti/eventi.json"),
      leggi("contenuti/sito.json"),
      // facoltativo: se il file non c'è ancora la sezione resta vuota
      leggi("contenuti/processo.json").catch(() => []),
    ]);
    PROCESSO = (Array.isArray(processo) ? processo : [])
      .filter((v) => v && v.titolo && (v.video || v.link))
      .map((v) => ({
        ...v,
        video: percorsoLocale(v.video),
        copertina: percorsoLocale(v.copertina),
        link: String(v.link || "").trim(),
        data: v.data ? String(v.data).slice(0, 10) : "",
      }));
    OPERE = (Array.isArray(opere) ? opere : []).filter(Boolean).map(normalizzaOpera);
    EVENTI = (Array.isArray(eventi) ? eventi : [])
      .filter((e) => e && e.titolo && e.inizio)
      .map(normalizzaEvento);
    CONTATTI = sito && typeof sito === "object" ? sito : {};
  }

  function mostraErroreContenuti(errore) {
    console.error("Contenuti non letti:", errore);
    const doppioClic = location.protocol === "file:";
    const motivo = doppioClic
      ? "Hai aperto index.html con un doppio clic: in questo modo il browser non permette di leggere i file della cartella <code>contenuti</code>. Aprilo con Live Server in VS Code (tasto destro su index.html, Open with Live Server) oppure dal sito pubblicato."
      : `Controlla che la cartella <code>contenuti</code> sia stata caricata insieme al sito e che i file JSON non contengano errori. Dettaglio: ${esc(errore && errore.message)}`;
    $("#opere-griglia").innerHTML = `<p class="avviso-contenuti"><strong>Le opere non si possono caricare.</strong> ${motivo}</p>`;
    $("#evidenza").hidden = true;
  }

  /* ------------------------------------------------------------------
     2. Segnaposto dipinti
     Ogni opera senza "immagine" riceve un piccolo dipinto astratto,
     sempre uguale per la stessa opera (il disegno dipende dal suo id).
     ------------------------------------------------------------------ */
  function generatore(seme) {
    let t = seme >>> 0;
    return function () {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashTesto(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // Schiarisce (q > 0) o scurisce (q < 0) un colore esadecimale
  function tinta(hex, q) {
    const n = parseInt(hex.replace("#", ""), 16);
    const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    const verso = q > 0 ? 255 : 0;
    const k = Math.abs(q);
    return `rgb(${rgb.map((v) => Math.round(v + (verso - v) * k)).join(",")})`;
  }

  const haFiltro = (() => {
    try {
      const c = document.createElement("canvas").getContext("2d");
      c.filter = "blur(2px)";
      return c.filter === "blur(2px)";
    } catch (e) {
      return false;
    }
  })();

  let grana = null;
  function texturaGrana() {
    if (grana) return grana;
    const c = document.createElement("canvas");
    c.width = c.height = 192;
    const x = c.getContext("2d");
    const img = x.createImageData(192, 192);
    const r = generatore(7);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 90 + r() * 165;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    grana = c;
    return c;
  }

  // Ombra morbida che funziona anche nei browser senza ctx.filter
  function ombra(ctx, traccia, sfocatura, alpha) {
    const off = 20000;
    const m = ctx.getTransform();
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${alpha})`;
    ctx.shadowBlur = sfocatura;
    ctx.shadowOffsetX = m.a * off;
    ctx.shadowOffsetY = m.b * off;
    ctx.translate(-off, 0);
    ctx.fillStyle = "#000";
    traccia();
    ctx.restore();
  }

  function rettangoloArrotondato(ctx, x, y, w, h, raggio) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, raggio);
    else ctx.rect(x, y, w, h);
  }

  // Una stella a punte (4 punte di solito): prepara il tracciato, poi si riempie
  function stella(ctx, x, y, raggio, punte = 4, interno = 0.38) {
    ctx.beginPath();
    for (let i = 0; i < punte * 2; i++) {
      const rr = i % 2 ? raggio * interno : raggio;
      const t = (i * Math.PI) / punte - Math.PI / 2;
      ctx.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr);
    }
    ctx.closePath();
  }

  // Il meandro greco lungo una fascia: x, y in alto a sinistra, larghezza, lato del modulo
  function meandro(ctx, x, y, larghezza, m, colore, spessore) {
    ctx.save();
    ctx.strokeStyle = colore;
    ctx.lineWidth = spessore || Math.max(1, m * 0.11);
    ctx.lineJoin = "miter";
    ctx.lineCap = "square";
    ctx.beginPath();
    for (let px = x; px <= x + larghezza - m; px += m) {
      ctx.moveTo(px, y + m * 0.93);
      ctx.lineTo(px + m, y + m * 0.93);
      ctx.moveTo(px, y + m * 0.93);
      ctx.lineTo(px, y + m * 0.1);
      ctx.lineTo(px + m * 0.8, y + m * 0.1);
      ctx.lineTo(px + m * 0.8, y + m * 0.7);
      ctx.lineTo(px + m * 0.3, y + m * 0.7);
      ctx.lineTo(px + m * 0.3, y + m * 0.4);
      ctx.lineTo(px + m * 0.55, y + m * 0.4);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Piccole macchie di colore: la grana dell'affresco, della carta, della pietra
  function macchiette(ctx, r, x, y, w, h, colore, quante, alpha, misura) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = colore;
    for (let i = 0; i < quante; i++) {
      ctx.globalAlpha = alpha * (0.3 + r());
      ctx.beginPath();
      ctx.ellipse(x + r() * w, y + r() * h, misura * (0.4 + r()), misura * (0.3 + r() * 0.8), r() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Foglia d'oro: quadratini di foglia appena sfalsati, con le giunture visibili
  function fogliaOro(ctx, r, x, y, w, h) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, "#C99A3A");
    g.addColorStop(0.45, "#F1D58A");
    g.addColorStop(0.62, "#D7AE52");
    g.addColorStop(1, "#9E7322");
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    const lato = Math.max(w, h) / 6;
    for (let yy = y; yy < y + h; yy += lato) {
      for (let xx = x - r() * lato; xx < x + w; xx += lato) {
        ctx.globalAlpha = 0.07 + r() * 0.12;
        ctx.fillStyle = r() > 0.5 ? "#FFF3C4" : "#7A5514";
        ctx.fillRect(xx, yy, lato * (0.96 + r() * 0.1), lato);
      }
    }
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = "#6E4C12";
    ctx.lineWidth = 1;
    for (let yy = y + lato; yy < y + h; yy += lato) {
      ctx.beginPath();
      ctx.moveTo(x, yy + (r() - 0.5) * 2);
      ctx.lineTo(x + w, yy + (r() - 0.5) * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Un ramo d'alloro lungo un arco di cerchio (da un angolo all'altro)
  function ramoAlloro(ctx, r, cx, cy, raggio, da, a, colore, foglia) {
    ctx.save();
    ctx.strokeStyle = colore;
    ctx.fillStyle = colore;
    ctx.lineWidth = Math.max(1, foglia * 0.1);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, cy, raggio, da, a, a < da);
    ctx.stroke();
    const passi = Math.max(4, Math.round((Math.abs(a - da) * raggio) / (foglia * 0.75)));
    const verso = a > da ? 1 : -1;
    for (let i = 1; i <= passi; i++) {
      const t = da + (a - da) * (i / passi);
      const px = cx + Math.cos(t) * raggio;
      const py = cy + Math.sin(t) * raggio;
      const tangente = t + (verso * Math.PI) / 2;
      const misura = foglia * (1 - (i / passi) * 0.35);
      [-1, 1].forEach((lato) => {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(tangente + lato * 0.6 + (r() - 0.5) * 0.18);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(misura * 0.5, -misura * 0.26, misura, 0);
        ctx.quadraticCurveTo(misura * 0.5, misura * 0.26, 0, 0);
        ctx.fill();
        ctx.restore();
      });
    }
    // la foglia in cima
    const fine = a;
    ctx.save();
    ctx.translate(cx + Math.cos(fine) * raggio, cy + Math.sin(fine) * raggio);
    ctx.rotate(fine + (verso * Math.PI) / 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(foglia * 0.4, -foglia * 0.2, foglia * 0.8, 0);
    ctx.quadraticCurveTo(foglia * 0.4, foglia * 0.2, 0, 0);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  // Numero di tiratura e firma a matita sotto la lastra, come sulle stampe vere
  function firmaMatita(ctx, x, y, larghezza, m, tiratura) {
    ctx.save();
    ctx.fillStyle = "rgba(60, 60, 60, 0.72)";
    ctx.strokeStyle = "rgba(60, 60, 60, 0.7)";
    ctx.font = `italic ${Math.round(m * 0.034)}px Georgia, serif`;
    if (tiratura) ctx.fillText(tiratura, x, y);
    ctx.lineWidth = Math.max(1, m * 0.0028);
    ctx.beginPath();
    let fx = x + larghezza - m * 0.2;
    ctx.moveTo(fx, y);
    for (let i = 0; i < 6; i++) {
      ctx.quadraticCurveTo(fx + m * 0.015, y - m * 0.028 * (i % 2 ? 1 : -1), fx + m * 0.03, y - (i === 2 ? m * 0.01 : 0));
      fx += m * 0.03;
    }
    ctx.stroke();
    ctx.restore();
  }

  // Fondale da studio fotografico per gli oggetti (sculture, ceramiche, accessori)
  function fondale(ctx, w, h, chiaro, scuro) {
    const g = ctx.createRadialGradient(w * 0.5, h * 0.35, 0, w * 0.5, h * 0.45, Math.max(w, h) * 0.8);
    g.addColorStop(0, chiaro);
    g.addColorStop(1, scuro);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  function ombraATerra(ctx, cx, y, larghezza, alpha) {
    ctx.save();
    const g = ctx.createRadialGradient(cx, y, 0, cx, y, larghezza);
    g.addColorStop(0, `rgba(0,0,0,${alpha})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, y, larghezza, larghezza * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const STILI = {
    // Il sole di Apollo: disco in foglia d'oro, raggi e mare al tramonto
    sole(ctx, w, h, c, r) {
      const m = Math.min(w, h);
      const cielo = ctx.createLinearGradient(0, 0, 0, h);
      cielo.addColorStop(0, c[0]);
      cielo.addColorStop(0.78, c[1]);
      ctx.fillStyle = cielo;
      ctx.fillRect(0, 0, w, h);
      macchiette(ctx, r, 0, 0, w, h, "#ffffff", 160, 0.03, m * 0.05);
      const cx = w / 2;
      const cy = h * 0.42;
      const R = m * 0.2;
      // raggi alternati, lunghi e corti
      ctx.save();
      ctx.fillStyle = c[2];
      const n = 24;
      for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.02;
        const lungo = i % 2 ? m * 0.4 : m * 0.62;
        const largo = (Math.PI / n) * (i % 2 ? 0.32 : 0.5);
        ctx.globalAlpha = i % 2 ? 0.5 : 0.85;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(t - largo) * R * 1.08, cy + Math.sin(t - largo) * R * 1.08);
        ctx.lineTo(cx + Math.cos(t) * lungo, cy + Math.sin(t) * lungo);
        ctx.lineTo(cx + Math.cos(t + largo) * R * 1.08, cy + Math.sin(t + largo) * R * 1.08);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      // il disco in foglia d'oro
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      fogliaOro(ctx, r, cx - R, cy - R, R * 2, R * 2);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = c[2];
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = Math.max(1, m * 0.005);
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      // il mare con il riflesso del sole
      const linea = h * 0.76;
      const mare = ctx.createLinearGradient(0, linea, 0, h);
      mare.addColorStop(0, c[3]);
      mare.addColorStop(1, tinta(c[3], -0.45));
      ctx.fillStyle = mare;
      ctx.fillRect(0, linea, w, h - linea);
      ctx.save();
      ctx.strokeStyle = c[2];
      ctx.lineCap = "round";
      for (let i = 0; i < 46; i++) {
        const k = r();
        const yy = linea + 3 + k * (h - linea - 6);
        const x0 = cx + (r() - 0.5) * w * (0.12 + k * 0.5);
        ctx.globalAlpha = (0.25 + r() * 0.55) * (1 - k * 0.5);
        ctx.lineWidth = Math.max(1, m * 0.006);
        ctx.beginPath();
        ctx.moveTo(x0 - m * 0.035, yy);
        ctx.lineTo(x0 + m * 0.035, yy);
        ctx.stroke();
      }
      ctx.restore();
      meandro(ctx, w * 0.06, h - m * 0.075, w * 0.88, m * 0.042, c[2]);
    },

    // La notte di Artemide: la falce di luna sopra un bosco di cipressi
    luna(ctx, w, h, c, r) {
      const m = Math.min(w, h);
      const cielo = ctx.createLinearGradient(0, 0, 0, h);
      cielo.addColorStop(0, c[0]);
      cielo.addColorStop(1, c[1]);
      ctx.fillStyle = cielo;
      ctx.fillRect(0, 0, w, h);
      const lx = w * 0.66;
      const ly = h * 0.26;
      const R = m * 0.15;
      // stelle
      ctx.save();
      ctx.fillStyle = c[2];
      for (let i = 0; i < 110; i++) {
        ctx.globalAlpha = 0.25 + r() * 0.75;
        ctx.beginPath();
        ctx.arc(r() * w, r() * h * 0.72, m * (0.0018 + r() * 0.0035), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 0.95;
      for (let i = 0; i < 5; i++) {
        stella(ctx, r() * w * 0.55, h * 0.06 + r() * h * 0.4, m * (0.012 + r() * 0.012), 4, 0.3);
        ctx.fill();
      }
      ctx.restore();
      // la falce: un disco d'argento a cui si toglie un disco più piccolo, poi la sua luce
      const falce = document.createElement("canvas");
      falce.width = w;
      falce.height = h;
      const f = falce.getContext("2d");
      f.fillStyle = c[2];
      f.beginPath();
      f.arc(lx, ly, R, 0, Math.PI * 2);
      f.fill();
      f.globalCompositeOperation = "destination-out";
      f.beginPath();
      f.arc(lx - R * 0.42, ly - R * 0.2, R * 0.9, 0, Math.PI * 2);
      f.fill();
      ctx.save();
      ctx.shadowColor = c[2];
      ctx.shadowBlur = m * 0.06;
      ctx.drawImage(falce, 0, 0);
      ctx.restore();
      // l'alone della luna, sopra la falce e il cielo insieme
      const alone = ctx.createRadialGradient(lx, ly, R * 0.5, lx, ly, R * 3.2);
      alone.addColorStop(0, "rgba(220,230,245,0.2)");
      alone.addColorStop(1, "rgba(220,230,245,0)");
      ctx.fillStyle = alone;
      ctx.fillRect(0, 0, w, h);
      // la nebbia d'argento sopra il bosco
      const nebbia = ctx.createLinearGradient(0, h * 0.62, 0, h * 0.85);
      nebbia.addColorStop(0, "rgba(200,212,232,0)");
      nebbia.addColorStop(1, "rgba(200,212,232,0.16)");
      ctx.fillStyle = nebbia;
      ctx.fillRect(0, h * 0.6, w, h * 0.4);
      // i cipressi, due file
      const base = h * 0.99;
      [0, 1].forEach((fila) => {
        const quanti = fila ? 7 : 10;
        for (let i = 0; i < quanti; i++) {
          const x = ((i + 0.5 + (fila ? 0.3 : 0)) / quanti) * w + (r() - 0.5) * w * 0.05;
          const alto = h * (fila ? 0.3 + r() * 0.26 : 0.18 + r() * 0.14);
          const largo = w * (0.03 + r() * 0.022) * (fila ? 1.15 : 0.85);
          ctx.fillStyle = fila ? c[3] : tinta(c[3], 0.12);
          ctx.beginPath();
          ctx.moveTo(x, base - alto);
          ctx.bezierCurveTo(x + largo, base - alto * 0.72, x + largo * 1.1, base - alto * 0.22, x + largo * 0.35, base);
          ctx.lineTo(x - largo * 0.35, base);
          ctx.bezierCurveTo(x - largo * 1.1, base - alto * 0.22, x - largo, base - alto * 0.72, x, base - alto);
          ctx.fill();
        }
      });
      ctx.fillStyle = c[3];
      ctx.fillRect(0, base - 1, w, h - base + 1);
    },

    // Affresco pompeiano: fondo rosso, pannello chiaro, corona d'alloro e sole d'oro
    affresco(ctx, w, h, c, r) {
      const m = Math.min(w, h);
      ctx.fillStyle = c[0];
      ctx.fillRect(0, 0, w, h);
      macchiette(ctx, r, 0, 0, w, h, "#000000", 180, 0.05, m * 0.04);
      macchiette(ctx, r, 0, 0, w, h, "#ffffff", 120, 0.04, m * 0.03);
      const bx = w * 0.13;
      const by = h * 0.17;
      const bw = w * 0.74;
      const bh = h * 0.7;
      ctx.fillStyle = c[3];
      ctx.fillRect(bx - m * 0.022, by - m * 0.022, bw + m * 0.044, bh + m * 0.044);
      ctx.fillStyle = c[1];
      ctx.fillRect(bx, by, bw, bh);
      macchiette(ctx, r, bx, by, bw, bh, "#8a6a40", 120, 0.05, m * 0.035);
      meandro(ctx, bx, h * 0.045, bw, m * 0.055, c[1], m * 0.008);
      const cx = w / 2;
      const cy = by + bh * 0.52;
      const R = Math.min(bw, bh) * 0.3;
      ramoAlloro(ctx, r, cx, cy, R, Math.PI * 0.6, Math.PI * 1.42, c[2], m * 0.065);
      ramoAlloro(ctx, r, cx, cy, R, Math.PI * 0.4, -Math.PI * 0.42, c[2], m * 0.065);
      // il nastro che lega i rami
      ctx.save();
      ctx.strokeStyle = c[0];
      ctx.lineWidth = m * 0.012;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx - m * 0.05, cy + R + m * 0.06);
      ctx.quadraticCurveTo(cx, cy + R - m * 0.01, cx + m * 0.05, cy + R + m * 0.06);
      ctx.stroke();
      ctx.restore();
      // il sole d'oro al centro
      const rs = R * 0.34;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, rs, 0, Math.PI * 2);
      ctx.clip();
      fogliaOro(ctx, r, cx - rs, cy - rs, rs * 2, rs * 2);
      ctx.restore();
      // crepe dell'intonaco
      ctx.save();
      ctx.strokeStyle = "rgba(40, 20, 10, 0.22)";
      ctx.lineWidth = 1;
      for (let k = 0; k < 4; k++) {
        let x = r() * w;
        let y = r() * h * 0.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let s = 0; s < 9; s++) {
          x += (r() - 0.5) * m * 0.12;
          y += r() * m * 0.07;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
      // un angolo dove l'intonaco è caduto
      ctx.save();
      ctx.fillStyle = "#E6DCCB";
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(w, h * 0.74);
      let x = w;
      let y = h * 0.74;
      while (y < h) {
        x -= r() * m * 0.05;
        y += r() * m * 0.05;
        ctx.lineTo(x - m * 0.04, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },

    // Carta celeste incisa: la lastra blu con il reticolo e una costellazione
    costellazione(ctx, w, h, c, r, seg) {
      const m = Math.min(w, h);
      ctx.fillStyle = c[0];
      ctx.fillRect(0, 0, w, h);
      macchiette(ctx, r, 0, 0, w, h, "#8a7a5a", 70, 0.035, m * 0.01);
      const mx = w * 0.12;
      const my = h * 0.1;
      const iw = w - mx * 2;
      const ih = h * 0.68;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
      ctx.lineWidth = 1;
      ctx.strokeRect(mx - m * 0.022, my - m * 0.022, iw + m * 0.044, ih + m * 0.044);
      ctx.fillStyle = c[1];
      ctx.fillRect(mx, my, iw, ih);
      macchiette(ctx, r, mx, my, iw, ih, "#000000", 90, 0.06, m * 0.03);
      const cx = mx + iw / 2;
      const cy = my + ih / 2;
      const R = Math.min(iw, ih) * 0.45;
      ctx.save();
      ctx.beginPath();
      ctx.rect(mx, my, iw, ih);
      ctx.clip();
      ctx.strokeStyle = c[2];
      ctx.globalAlpha = 0.32;
      ctx.lineWidth = Math.max(1, m * 0.002);
      [1, 0.75, 0.5, 0.25].forEach((k) => {
        ctx.beginPath();
        ctx.arc(cx, cy, R * k, 0, Math.PI * 2);
        ctx.stroke();
      });
      for (let i = 0; i < 12; i++) {
        const t = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(t) * R * 1.3, cy + Math.sin(t) * R * 1.3);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = c[0];
      for (let i = 0; i < 90; i++) {
        ctx.globalAlpha = 0.2 + r() * 0.6;
        ctx.beginPath();
        ctx.arc(mx + r() * iw, my + r() * ih, m * (0.0015 + r() * 0.003), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      const FIGURE = {
        lira: {
          stelle: [[0.44, 0.14, 1.5], [0.6, 0.2, 0.8], [0.42, 0.36, 0.9], [0.62, 0.42, 0.9], [0.58, 0.82, 1], [0.34, 0.76, 1]],
          linee: [[0, 1], [0, 2], [1, 2], [2, 3], [3, 4], [4, 5], [5, 2]],
        },
        orione: {
          stelle: [[0.5, 0.12, 0.8], [0.36, 0.24, 1.4], [0.64, 0.27, 1.1], [0.45, 0.5, 0.9], [0.5, 0.48, 0.9], [0.55, 0.46, 0.9], [0.4, 0.8, 1], [0.66, 0.76, 1.4]],
          linee: [[0, 1], [0, 2], [1, 3], [2, 5], [3, 4], [4, 5], [3, 6], [5, 7]],
        },
      };
      const f = FIGURE[seg.figura] || FIGURE.lira;
      const P = (p) => [mx + iw * p[0], my + ih * p[1]];
      ctx.save();
      ctx.strokeStyle = c[2];
      ctx.lineWidth = Math.max(1, m * 0.0035);
      ctx.setLineDash([m * 0.012, m * 0.008]);
      f.linee.forEach(([a, b]) => {
        const A = P(f.stelle[a]);
        const B = P(f.stelle[b]);
        ctx.beginPath();
        ctx.moveTo(A[0], A[1]);
        ctx.lineTo(B[0], B[1]);
        ctx.stroke();
      });
      ctx.restore();
      ctx.save();
      ctx.fillStyle = c[0];
      f.stelle.forEach((p) => {
        const [x, y] = P(p);
        const s = m * 0.011 * (p[2] || 1);
        stella(ctx, x, y, s * 2.4, 4, 0.26);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, s * 0.75, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
      ctx.save();
      ctx.fillStyle = c[1];
      ctx.globalAlpha = 0.8;
      ctx.font = `${Math.round(m * 0.03)}px Georgia, serif`;
      ctx.textAlign = "center";
      ctx.fillText(String(seg.nome || "").toUpperCase().split("").join(" "), w / 2, my + ih + m * 0.075);
      ctx.restore();
      firmaMatita(ctx, mx, my + ih + m * 0.15, iw, m, seg.tiratura);
    },

    // Serigrafia: il sole che sorge dal mare a raggi, tre colori appena fuori registro
    raggi(ctx, w, h, c, r, seg) {
      const m = Math.min(w, h);
      ctx.fillStyle = c[0];
      ctx.fillRect(0, 0, w, h);
      const mx = w * 0.1;
      const my = h * 0.08;
      const iw = w - mx * 2;
      const ih = h * 0.74;
      ctx.save();
      ctx.beginPath();
      ctx.rect(mx, my, iw, ih);
      ctx.clip();
      ctx.fillStyle = c[3];
      ctx.fillRect(mx, my, iw, ih);
      const cx = w / 2;
      const cy = my + ih * 0.66;
      const n = 18;
      ctx.fillStyle = c[2];
      for (let i = 0; i < n; i++) {
        const t0 = Math.PI + (i / n) * Math.PI;
        const t1 = Math.PI + ((i + 0.5) / n) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(cx + m * 0.004, cy + m * 0.003);
        ctx.arc(cx + m * 0.004, cy + m * 0.003, m * 1.3, t0, t1);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = c[1];
      ctx.beginPath();
      ctx.arc(cx - m * 0.005, cy, m * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = c[0];
      ctx.lineWidth = m * 0.007;
      [0.35, 0.6, 0.85].forEach((k) => {
        ctx.beginPath();
        ctx.arc(cx - m * 0.005, cy, m * 0.2 * k, Math.PI, Math.PI * 2);
        ctx.stroke();
      });
      ctx.fillStyle = c[3];
      ctx.fillRect(mx, cy, iw, ih);
      ctx.strokeStyle = c[1];
      ctx.lineWidth = m * 0.008;
      ctx.lineCap = "round";
      for (let k = 0; k < 6; k++) {
        const yy = cy + m * 0.04 + k * m * 0.045;
        const largo = m * (0.2 - k * 0.022);
        ctx.beginPath();
        ctx.moveTo(cx - largo, yy);
        ctx.lineTo(cx + largo, yy);
        ctx.stroke();
      }
      ctx.restore();
      firmaMatita(ctx, mx, my + ih + m * 0.08, iw, m, seg.tiratura);
    },

    // Sculture fotografate in studio: colonna ionica, disco di bronzo, frammento di fregio
    scultura(ctx, w, h, c, r, seg) {
      const m = Math.min(w, h);
      fondale(ctx, w, h, c[0], c[1]);
      const cx = w / 2;
      const terra = h * 0.86;
      if (seg.forma === "disco") {
        // il disco di bronzo con il sole a sedici raggi in rilievo
        const R = m * 0.3;
        const cy = h * 0.47;
        ombraATerra(ctx, cx, terra, R * 1.1, 0.35);
        ctx.save();
        ctx.fillStyle = "#3A2A18";
        ctx.fillRect(cx - R * 0.08, cy + R * 0.9, R * 0.16, terra - cy - R * 0.9);
        ctx.fillRect(cx - R * 0.5, terra - m * 0.02, R, m * 0.02);
        ctx.restore();
        let g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
        g.addColorStop(0, tinta(c[3], 0.45));
        g.addColorStop(0.55, c[3]);
        g.addColorStop(1, tinta(c[3], -0.45));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = tinta(c[3], 0.35);
        ctx.lineWidth = m * 0.006;
        ctx.beginPath();
        ctx.arc(cx, cy, R * 0.9, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 16; i++) {
          const t = (i / 16) * Math.PI * 2 - Math.PI / 2;
          const largo = 0.08;
          [[tinta(c[3], -0.4), 0.012], [tinta(c[3], 0.5), 0]].forEach(([colore, scarto]) => {
            ctx.fillStyle = colore;
            ctx.beginPath();
            ctx.moveTo(cx + scarto * m + Math.cos(t - largo) * R * 0.22, cy + scarto * m + Math.sin(t - largo) * R * 0.22);
            ctx.lineTo(cx + scarto * m + Math.cos(t) * R * 0.78, cy + scarto * m + Math.sin(t) * R * 0.78);
            ctx.lineTo(cx + scarto * m + Math.cos(t + largo) * R * 0.22, cy + scarto * m + Math.sin(t + largo) * R * 0.22);
            ctx.closePath();
            ctx.fill();
          });
        }
        g = ctx.createRadialGradient(cx - R * 0.05, cy - R * 0.05, 0, cx, cy, R * 0.2);
        g.addColorStop(0, tinta(c[3], 0.6));
        g.addColorStop(1, tinta(c[3], -0.1));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, R * 0.18, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      if (seg.forma === "frammento") {
        // una lastra di marmo spezzata con il meandro e un ramo d'alloro in rilievo
        const fw = m * 0.66;
        const fh = m * 0.5;
        const fx = cx - fw / 2;
        const fy = terra - fh - m * 0.06;
        ombraATerra(ctx, cx, terra - m * 0.05, fw * 0.62, 0.3);
        ctx.save();
        ctx.fillStyle = "#2E2B28";
        ctx.fillRect(cx - fw * 0.36, fy + fh, fw * 0.72, m * 0.06);
        ctx.restore();
        const bordo = [];
        bordo.push([fx, fy + fh * 0.1]);
        for (let i = 1; i < 7; i++) bordo.push([fx + (fw * i) / 7, fy + (r() - 0.3) * fh * 0.12]);
        bordo.push([fx + fw, fy + fh * 0.18]);
        bordo.push([fx + fw - fw * 0.06, fy + fh * 0.5]);
        bordo.push([fx + fw, fy + fh]);
        bordo.push([fx, fy + fh]);
        bordo.push([fx + fw * 0.04, fy + fh * 0.55]);
        ctx.save();
        ctx.beginPath();
        bordo.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        const g = ctx.createLinearGradient(fx, fy, fx + fw, fy + fh);
        g.addColorStop(0, tinta(c[2], 0.2));
        g.addColorStop(1, tinta(c[2], -0.18));
        ctx.fillStyle = g;
        ctx.fill();
        ctx.clip();
        macchiette(ctx, r, fx, fy, fw, fh, "#7d7a72", 60, 0.08, m * 0.012);
        meandro(ctx, fx - m * 0.01, fy + fh * 0.12, fw * 1.05, m * 0.06, tinta(c[2], -0.3), m * 0.008);
        meandro(ctx, fx + m * 0.003, fy + fh * 0.12 - m * 0.003, fw * 1.05, m * 0.06, tinta(c[2], 0.35), m * 0.004);
        ramoAlloro(ctx, r, cx + fw * 0.1, fy + fh * 1.5, fw * 0.75, Math.PI * 1.15, Math.PI * 1.75, tinta(c[2], -0.22), m * 0.05);
        ctx.restore();
        return;
      }
      // colonna ionica su un piedistallo
      const cw = m * 0.2;
      const top = h * 0.14;
      const capH = m * 0.08;
      const baseH = m * 0.06;
      const fusto0 = top + capH;
      const fusto1 = terra - baseH - m * 0.05;
      ombraATerra(ctx, cx, terra, cw * 1.8, 0.35);
      ctx.fillStyle = tinta(c[2], -0.2);
      ctx.fillRect(cx - cw * 0.85, terra - m * 0.05, cw * 1.7, m * 0.05);
      const g = ctx.createLinearGradient(cx - cw / 2, 0, cx + cw / 2, 0);
      g.addColorStop(0, tinta(c[2], -0.28));
      g.addColorStop(0.35, tinta(c[2], 0.25));
      g.addColorStop(0.7, c[2]);
      g.addColorStop(1, tinta(c[2], -0.35));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx - cw * 0.46, fusto0);
      ctx.lineTo(cx + cw * 0.46, fusto0);
      ctx.lineTo(cx + cw * 0.5, fusto1);
      ctx.lineTo(cx - cw * 0.5, fusto1);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.lineWidth = Math.max(1, cw * 0.025);
      for (let i = 1; i < 8; i++) {
        const k = i / 8 - 0.5;
        ctx.strokeStyle = `rgba(0,0,0,${0.12 + Math.abs(k) * 0.2})`;
        ctx.beginPath();
        ctx.moveTo(cx + k * cw * 0.92, fusto0);
        ctx.lineTo(cx + k * cw, fusto1);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = g;
      ctx.fillRect(cx - cw * 0.62, fusto1, cw * 1.24, baseH * 0.5);
      ctx.fillRect(cx - cw * 0.7, fusto1 + baseH * 0.5, cw * 1.4, baseH * 0.5 + m * 0.05);
      // capitello con le volute
      ctx.fillStyle = g;
      ctx.fillRect(cx - cw * 0.85, top, cw * 1.7, capH * 0.28);
      ctx.fillRect(cx - cw * 0.7, top + capH * 0.28, cw * 1.4, capH * 0.45);
      [-1, 1].forEach((lato) => {
        const vx = cx + lato * cw * 0.66;
        const vy = top + capH * 0.6;
        ctx.fillStyle = tinta(c[2], 0.15);
        ctx.beginPath();
        ctx.arc(vx, vy, capH * 0.42, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = tinta(c[2], -0.4);
        ctx.lineWidth = Math.max(1, capH * 0.06);
        ctx.beginPath();
        for (let t = 0; t < Math.PI * 5; t += 0.2) {
          const rr = capH * 0.38 * (1 - t / (Math.PI * 5.4));
          const px = vx + Math.cos(t * lato) * rr;
          const py = vy + Math.sin(t) * rr;
          if (t === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      });
    },

    // Foulard di seta: bordo a meandro, al centro il sole e la luna, pieghe lucide
    foulard(ctx, w, h, c, r) {
      const m = Math.min(w, h);
      ctx.fillStyle = c[0];
      ctx.fillRect(0, 0, w, h);
      const fascia = m * 0.11;
      ctx.fillStyle = c[1];
      ctx.fillRect(0, 0, w, fascia);
      ctx.fillRect(0, h - fascia, w, fascia);
      ctx.fillRect(0, 0, fascia, h);
      ctx.fillRect(w - fascia, 0, fascia, h);
      const mod = fascia * 0.62;
      meandro(ctx, fascia * 0.2, fascia * 0.19, w - fascia * 0.4, mod, c[2], mod * 0.12);
      meandro(ctx, fascia * 0.2, h - fascia * 0.81, w - fascia * 0.4, mod, c[2], mod * 0.12);
      [[fascia / 2, fascia / 2], [w - fascia / 2, fascia / 2], [fascia / 2, h - fascia / 2], [w - fascia / 2, h - fascia / 2]].forEach(([x, y]) => {
        ctx.fillStyle = c[0];
        ctx.fillRect(x - fascia / 2, y - fascia / 2, fascia, fascia);
        ctx.fillStyle = c[2];
        stella(ctx, x, y, fascia * 0.34, 8, 0.45);
        ctx.fill();
      });
      const cx = w / 2;
      const cy = h / 2;
      const R = m * 0.17;
      ctx.save();
      ctx.strokeStyle = c[2];
      ctx.lineWidth = m * 0.006;
      for (let i = 0; i < 32; i++) {
        const t = (i / 32) * Math.PI * 2;
        const l = i % 2 ? R * 1.5 : R * 1.85;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(t) * R * 1.15, cy + Math.sin(t) * R * 1.15);
        ctx.lineTo(cx + Math.cos(t) * l, cy + Math.sin(t) * l);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = c[2];
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c[3];
      ctx.beginPath();
      ctx.arc(cx + R * 0.25, cy, R * 0.82, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c[2];
      ctx.beginPath();
      ctx.arc(cx + R * 0.5, cy, R * 0.66, 0, Math.PI * 2);
      ctx.fill();
      // pieghe della seta
      ctx.save();
      for (let i = 0; i < 5; i++) {
        const x0 = r() * w;
        const g = ctx.createLinearGradient(x0 - m * 0.15, 0, x0 + m * 0.15, m * 0.08);
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(0.5, `rgba(255,255,255,${0.1 + r() * 0.12})`);
        g.addColorStop(1, "rgba(0,0,0,0.06)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();
    },

    // Taccuino in lino con la corona d'alloro impressa in oro
    taccuino(ctx, w, h, c, r) {
      const m = Math.min(w, h);
      fondale(ctx, w, h, tinta(c[0], 0.2), c[0]);
      const tw = m * 0.56;
      const th = m * 0.76;
      const tx = (w - tw) / 2;
      const ty = (h - th) / 2;
      ombra(ctx, () => {
        rettangoloArrotondato(ctx, tx + m * 0.015, ty + m * 0.03, tw, th, m * 0.02);
        ctx.fill();
      }, m * 0.05, 0.4);
      ctx.fillStyle = "#EDE7D8";
      rettangoloArrotondato(ctx, tx + m * 0.008, ty + m * 0.008, tw, th, m * 0.02);
      ctx.fill();
      ctx.fillStyle = c[1];
      rettangoloArrotondato(ctx, tx, ty, tw, th, m * 0.02);
      ctx.fill();
      macchiette(ctx, r, tx, ty, tw, th, "#000000", 140, 0.05, m * 0.006);
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = "#ffffff";
      for (let y = ty; y < ty + th; y += m * 0.008) {
        ctx.beginPath();
        ctx.moveTo(tx, y);
        ctx.lineTo(tx + tw, y);
        ctx.stroke();
      }
      ctx.restore();
      const cx = tx + tw / 2;
      const cy = ty + th * 0.44;
      const R = tw * 0.26;
      ramoAlloro(ctx, r, cx, cy, R, Math.PI * 0.62, Math.PI * 1.4, c[2], m * 0.045);
      ramoAlloro(ctx, r, cx, cy, R, Math.PI * 0.38, -Math.PI * 0.4, c[2], m * 0.045);
      ctx.fillStyle = c[2];
      stella(ctx, cx, cy, R * 0.28, 8, 0.42);
      ctx.fill();
      ctx.fillStyle = c[3];
      ctx.fillRect(tx + tw * 0.86, ty - m * 0.004, tw * 0.035, th + m * 0.008);
    },

    // Anfora a figure nere: collo e piede smaltati di nero, sulla pancia la luna e le stelle
    anfora(ctx, w, h, c, r) {
      const m = Math.min(w, h);
      fondale(ctx, w, h, tinta(c[0], 0.15), c[0]);
      const cx = w / 2;
      const terra = h * 0.9;
      const H = m * 0.74;
      const top = terra - H;
      ombraATerra(ctx, cx, terra, m * 0.2, 0.4);
      const sagoma = () => {
        ctx.beginPath();
        ctx.moveTo(cx - m * 0.09, top);
        ctx.lineTo(cx + m * 0.09, top);
        ctx.lineTo(cx + m * 0.075, top + H * 0.05);
        ctx.bezierCurveTo(cx + m * 0.06, top + H * 0.16, cx + m * 0.065, top + H * 0.2, cx + m * 0.12, top + H * 0.28);
        ctx.bezierCurveTo(cx + m * 0.24, top + H * 0.36, cx + m * 0.25, top + H * 0.62, cx + m * 0.12, top + H * 0.86);
        ctx.lineTo(cx + m * 0.06, top + H * 0.9);
        ctx.lineTo(cx + m * 0.11, top + H);
        ctx.lineTo(cx - m * 0.11, top + H);
        ctx.lineTo(cx - m * 0.06, top + H * 0.9);
        ctx.lineTo(cx - m * 0.12, top + H * 0.86);
        ctx.bezierCurveTo(cx - m * 0.25, top + H * 0.62, cx - m * 0.24, top + H * 0.36, cx - m * 0.12, top + H * 0.28);
        ctx.bezierCurveTo(cx - m * 0.065, top + H * 0.2, cx - m * 0.06, top + H * 0.16, cx - m * 0.075, top + H * 0.05);
        ctx.closePath();
      };
      // le anse
      ctx.save();
      ctx.strokeStyle = c[2];
      ctx.lineWidth = m * 0.022;
      [-1, 1].forEach((lato) => {
        ctx.beginPath();
        ctx.moveTo(cx + lato * m * 0.065, top + H * 0.09);
        ctx.bezierCurveTo(cx + lato * m * 0.2, top + H * 0.06, cx + lato * m * 0.2, top + H * 0.26, cx + lato * m * 0.15, top + H * 0.32);
        ctx.stroke();
      });
      ctx.restore();
      ctx.save();
      sagoma();
      ctx.fillStyle = c[1];
      ctx.fill();
      ctx.clip();
      // nero sul collo, sul piede e sotto la pancia
      ctx.fillStyle = c[2];
      ctx.fillRect(0, top, w, H * 0.27);
      ctx.fillRect(0, top + H * 0.72, w, H * 0.3);
      // fascia di linguette sulla spalla
      ctx.fillStyle = c[2];
      for (let x = cx - m * 0.25; x < cx + m * 0.25; x += m * 0.03) {
        ctx.beginPath();
        ctx.ellipse(x, top + H * 0.3, m * 0.011, m * 0.02, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      meandro(ctx, cx - m * 0.26, top + H * 0.62, m * 0.52, m * 0.035, c[2], m * 0.005);
      // il pannello con la falce e le stelle (figure nere)
      const py = top + H * 0.46;
      ctx.fillStyle = c[2];
      ctx.beginPath();
      ctx.arc(cx, py, m * 0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c[1];
      ctx.beginPath();
      ctx.arc(cx + m * 0.025, py - m * 0.012, m * 0.052, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c[2];
      [[-0.12, -0.04], [0.11, -0.06], [0.13, 0.05], [-0.1, 0.06]].forEach(([dx, dy]) => {
        stella(ctx, cx + dx * m, py + dy * m, m * 0.018, 4, 0.3);
        ctx.fill();
      });
      // la luce sulla ceramica
      const luce = ctx.createLinearGradient(cx - m * 0.25, 0, cx + m * 0.25, 0);
      luce.addColorStop(0, "rgba(0,0,0,0.35)");
      luce.addColorStop(0.3, "rgba(255,255,255,0.18)");
      luce.addColorStop(0.42, "rgba(255,255,255,0.02)");
      luce.addColorStop(1, "rgba(0,0,0,0.4)");
      ctx.fillStyle = luce;
      ctx.fillRect(0, top, w, H);
      ctx.restore();
    },

    // Kylix vista dall'alto: tondo con il sole a figure nere e bordo a meandro
    kylix(ctx, w, h, c, r) {
      const m = Math.min(w, h);
      fondale(ctx, w, h, tinta(c[0], 0.15), c[0]);
      const cx = w / 2;
      const cy = h / 2;
      const R = m * 0.38;
      ombra(ctx, () => {
        ctx.beginPath();
        ctx.arc(cx + m * 0.015, cy + m * 0.03, R, 0, Math.PI * 2);
        ctx.fill();
      }, m * 0.05, 0.45);
      ctx.fillStyle = c[2];
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c[1];
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.86, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c[2];
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c[1];
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.46, 0, Math.PI * 2);
      ctx.fill();
      // il meandro che gira intorno al tondo
      ctx.save();
      ctx.strokeStyle = c[2];
      ctx.lineWidth = m * 0.006;
      const giri = 22;
      for (let i = 0; i < giri; i++) {
        const t0 = (i / giri) * Math.PI * 2;
        const t1 = ((i + 0.8) / giri) * Math.PI * 2;
        const a = R * 0.58;
        const b = R * 0.78;
        ctx.beginPath();
        ctx.arc(cx, cy, b, t0, t1);
        ctx.lineTo(cx + Math.cos(t1) * a, cy + Math.sin(t1) * a);
        ctx.arc(cx, cy, a, t1, t0 + (t1 - t0) * 0.3, true);
        ctx.lineTo(cx + Math.cos(t0 + (t1 - t0) * 0.3) * (a + b) / 2, cy + Math.sin(t0 + (t1 - t0) * 0.3) * (a + b) / 2);
        ctx.stroke();
      }
      ctx.restore();
      // il sole a figure nere
      ctx.fillStyle = c[2];
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.16, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 12; i++) {
        const t = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(t - 0.12) * R * 0.2, cy + Math.sin(t - 0.12) * R * 0.2);
        ctx.lineTo(cx + Math.cos(t) * R * 0.4, cy + Math.sin(t) * R * 0.4);
        ctx.lineTo(cx + Math.cos(t + 0.12) * R * 0.2, cy + Math.sin(t + 0.12) * R * 0.2);
        ctx.closePath();
        ctx.fill();
      }
      const luce = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.45, 0, cx, cy, R);
      luce.addColorStop(0, "rgba(255,255,255,0.28)");
      luce.addColorStop(0.5, "rgba(255,255,255,0)");
      luce.addColorStop(1, "rgba(0,0,0,0.25)");
      ctx.fillStyle = luce;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
    },
  };

  function dipingi(canvas, opera, lato) {
    const seg = opera.segnaposto || { stile: "affresco", proporzione: [4, 5], colori: ["#9E3B2E", "#E8DCC2", "#56703F", "#1C1814"] };
    const [pw, ph] = seg.proporzione || [4, 5];
    const w = pw >= ph ? lato : Math.round((lato * pw) / ph);
    const h = pw >= ph ? Math.round((lato * ph) / pw) : lato;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    const r = generatore(hashTesto(opera.id || opera.titolo || "opera"));
    (STILI[seg.stile] || STILI.affresco)(ctx, w, h, seg.colori, r, seg);
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = ctx.createPattern(texturaGrana(), "repeat");
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Foto vera se c'è, altrimenti segnaposto dipinto
  function creaMedia(o, lato, subito) {
    if (o.immagine) {
      const img = document.createElement("img");
      img.className = "media";
      img.alt = `${o.titolo}${o.anno ? ", " + o.anno : ""}. ${o.tecnica || ""}`;
      img.loading = subito ? "eager" : "lazy";
      img.decoding = "async";
      // Se la foto non si trova, al suo posto compare un avviso con il percorso cercato
      img.addEventListener("error", () => {
        const avviso = document.createElement("div");
        avviso.className = "media media-mancante";
        avviso.innerHTML = `<strong>Foto non trovata</strong><span>${esc(o.immagine)}</span><span>Ricarica la foto dal pannello o controlla il nome del file</span>`;
        img.replaceWith(avviso);
      }, { once: true });
      img.src = o.immagine;
      return img;
    }
    const c = document.createElement("canvas");
    c.className = "media";
    c.setAttribute("role", "img");
    c.setAttribute("aria-label", `${o.titolo}, ${o.tecnica || ""}`);
    dipingi(c, o, lato);
    return c;
  }

  /* ------------------------------------------------------------------
     2b. Il cielo: alba ed eclissi
     Alla prima visita lo schermo parte di notte: si disegna il logo dello
     studio (la A d'oro e d'argento, il sole, i puntini e la falce di luna),
     poi dal centro si apre un anello di luce che scopre la pagina, come
     un'alba.
     Passando da una sezione all'altra (menu e link interni) un disco di
     notte bordato d'oro si allarga dal punto cliccato e copre lo schermo;
     sotto, la pagina si sposta; poi si apre un foro di luce che rivela
     la nuova sezione, come la fine di un'eclissi.
     ------------------------------------------------------------------ */
  // Il logo è disegnato una volta nella barra (index.html): qui se ne fanno le copie
  function copiaLogo() {
    const originale = document.querySelector(".marchio-logo");
    if (!originale) return null;
    const copia = originale.cloneNode(true);
    copia.classList.remove("marchio-logo");
    return copia;
  }
  function preparaLoghi() {
    document.querySelectorAll("[data-logo]").forEach((box) => {
      const copia = copiaLogo();
      if (copia) box.append(copia);
    });
    // con meno animazioni la luce sul metallo resta ferma
    if (menoMovimento()) document.querySelectorAll(".logo-colori animateTransform").forEach((a) => a.remove());
  }

  const Cielo = (() => {
    let velo = null;
    let corona = null;
    let notte = null;
    let emblema = null;
    let tela = null;
    let occupata = false;
    const attendi = (ms) => new Promise((r) => setTimeout(r, ms));

    // --foro (il raggio del foro di luce) va registrata per poterla animare
    let foroAnimabile = false;
    try {
      if (window.CSS && CSS.registerProperty) {
        foroAnimabile = true;
        CSS.registerProperty({ name: "--foro", syntax: "<length>", inherits: true, initialValue: "0px" });
      }
    } catch (e) {
      /* già registrata: va bene lo stesso */
    }

    function prepara() {
      velo = document.createElement("div");
      velo.className = "velo";
      velo.setAttribute("aria-hidden", "true");
      velo.innerHTML =
        '<div class="velo-corona"></div>' +
        '<div class="velo-notte"><canvas class="velo-stelle"></canvas><div class="velo-logo"></div></div>';
      document.body.append(velo);
      corona = velo.querySelector(".velo-corona");
      notte = velo.querySelector(".velo-notte");
      emblema = velo.querySelector(".velo-logo");
      const logo = copiaLogo();
      if (logo) emblema.append(logo);
      tela = velo.querySelector(".velo-stelle");
    }

    // Il cielo stellato del velo, ridisegnato solo se la finestra cambia misura
    function disegnaStelle() {
      const W = window.innerWidth;
      const H = window.innerHeight;
      if (tela._w === W && tela._h === H) return;
      tela._w = W;
      tela._h = H;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      tela.width = Math.round(W * dpr);
      tela.height = Math.round(H * dpr);
      const ctx = tela.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const r = generatore(42);
      const quante = Math.round((W * H) / 2400);
      for (let i = 0; i < quante; i++) {
        const grande = r() > 0.94;
        ctx.globalAlpha = 0.25 + r() * 0.75;
        ctx.fillStyle = r() < 0.2 ? "#F6E3B0" : "#E6ECF8";
        const x = r() * W;
        const y = r() * H;
        if (grande) {
          stella(ctx, x, y, 2.5 + r() * 2.5, 4, 0.25);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(x, y, 0.4 + r() * 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function pulisci() {
      if (!velo) return;
      [corona, notte, emblema].forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
      velo.classList.remove("is-attiva", "disegna", "is-alba");
      notte.classList.remove("con-foro");
      corona.style.opacity = "";
    }

    // Il foro di luce che si apre dal centro dello schermo (o una dissolvenza, nei browser più vecchi)
    function apriLuce(durata) {
      const W = window.innerWidth;
      const H = window.innerHeight;
      velo.style.setProperty("--bx", `${W / 2}px`);
      velo.style.setProperty("--by", `${H / 2}px`);
      const raggio = Math.hypot(W / 2, H / 2) + 90;
      emblema.animate([{ opacity: 1 }, { opacity: 0, transform: "scale(1.25)" }], { duration: durata * 0.45, easing: "ease-in", fill: "forwards" });
      if (foroAnimabile) {
        notte.classList.add("con-foro");
        return notte.animate([{ "--foro": "0px" }, { "--foro": `${raggio}px` }], {
          duration: durata,
          easing: "cubic-bezier(0.6, 0, 0.2, 1)",
          fill: "forwards",
        }).finished;
      }
      return notte.animate([{ opacity: 1 }, { opacity: 0 }], { duration: durata * 0.6, fill: "forwards" }).finished;
    }

    // alCentro viene eseguita quando lo schermo è tutto coperto dalla notte
    async function transizione(alCentro, x, y) {
      let eseguita = false;
      const centro = () => {
        if (!eseguita) {
          eseguita = true;
          alCentro();
        }
      };
      if (occupata) return;
      if (menoMovimento() || !document.body.animate) {
        centro();
        return;
      }
      occupata = true;
      try {
        if (!velo) prepara();
        pulisci();
        disegnaStelle();
        const W = window.innerWidth;
        const H = window.innerHeight;
        const px = Number.isFinite(x) ? x : W / 2;
        const py = Number.isFinite(y) ? y : H / 2;
        const raggio = Math.hypot(Math.max(px, W - px), Math.max(py, H - py)) + 40;
        const cerchio = (k) => `circle(${k}px at ${px}px ${py}px)`;
        velo.style.setProperty("--bx", `${px}px`);
        velo.style.setProperty("--by", `${py}px`);
        velo.classList.add("is-attiva", "is-alba");
        const opzioni = { duration: 620, easing: "cubic-bezier(0.65, 0, 0.35, 1)", fill: "forwards" };
        // l'orlo d'oro corre un po' avanti al disco di notte: è la corona del sole
        corona.animate([{ clipPath: cerchio(0) }, { clipPath: cerchio(raggio + 70) }], opzioni);
        emblema.animate(
          [{ opacity: 0, transform: "scale(0.6) rotate(-25deg)" }, { opacity: 1, transform: "none" }],
          { duration: 560, delay: 260, easing: "cubic-bezier(0.3, 1.4, 0.5, 1)", fill: "both" }
        );
        await notte.animate([{ clipPath: cerchio(0) }, { clipPath: cerchio(raggio) }], { ...opzioni, delay: 80 }).finished;
        centro();
        corona.style.opacity = "0";
        await attendi(220);
        await apriLuce(760);
      } catch (err) {
        centro();
      } finally {
        pulisci();
        occupata = false;
      }
    }

    // L'alba della prima visita. aMeta viene chiamata quando la luce si apre,
    // per far partire le animazioni dell'apertura.
    async function sipario(aMeta, pronto) {
      const togliCopertura = () => document.documentElement.classList.remove("js-sipario");
      if (occupata || menoMovimento() || !document.body.animate) {
        togliCopertura();
        aMeta();
        return;
      }
      occupata = true;
      let partita = false;
      const via = () => {
        if (!partita) {
          partita = true;
          aMeta();
        }
      };
      try {
        if (!velo) prepara();
        disegnaStelle();
        corona.style.opacity = "0";
        velo.classList.add("is-attiva", "disegna");
        togliCopertura();
        // il logo si disegna mentre si caricano le opere
        await Promise.all([attendi(2250), Promise.race([pronto || Promise.resolve(), attendi(2500)])]);
        velo.classList.add("is-alba");
        await emblema.animate([{ transform: "none" }, { transform: "scale(1.1)" }], { duration: 420, easing: "ease-out", fill: "forwards" }).finished;
        setTimeout(via, 280);
        await apriLuce(1150);
      } catch (err) {
        togliCopertura();
      } finally {
        via();
        pulisci();
        occupata = false;
      }
    }

    return { transizione, sipario };
  })();


  /* ------------------------------------------------------------------
     3. Menu, filtri e griglia delle opere
     ------------------------------------------------------------------ */
  let filtro = "tutte";
  let visibili = OPERE.slice();

  const conta = (id) => (id === "tutte" ? OPERE.length : OPERE.filter((o) => o.categoria === id).length);

  function statoHTML(o) {
    if (!STATI[o.stato]) return "";
    return `<p class="stato stato--${esc(o.stato)}">${STATI[o.stato]}</p>`;
  }

  function didascaliaHTML(o) {
    return `<div class="reazioni">${visteHTML(o)}${bottonePiace(o)}</div>
      <p class="didascalia-titolo"><em>${esc(o.titolo)}</em>${o.anno ? `, ${esc(o.anno)}` : ""}</p>
      ${o.tecnica ? `<p>${esc(o.tecnica)}</p>` : ""}
      ${o.misure ? `<p>${esc(o.misure)}</p>` : ""}
      ${o.edizione ? `<p>${esc(o.edizione)}</p>` : ""}
      ${statoHTML(o)}`;
  }

  // Il sottomenu delle opere: ogni categoria ha il suo campione di colore,
  // a turno i colori del mito; "Tutte le opere" li ha tutti
  function costruisciSottomenu() {
    const pigmenti = PIGMENTI;
    const voci = [{ id: "tutte", nome: "Tutte le opere" }, ...CATEGORIE];
    $("#sottomenu-opere").innerHTML = voci
      .map((v, n) => {
        const tutte = v.id === "tutte";
        const colore = tutte ? "" : ` style="--pigmento: ${pigmenti[(n - 1) % pigmenti.length]}"`;
        return `<li><a href="#opere" data-categoria="${esc(v.id)}"${colore}><span class="campione${tutte ? " campione--tutti" : ""}" aria-hidden="true"></span><span class="sottomenu-nome">${esc(v.nome)}</span><span class="conta">${conta(v.id)}</span></a></li>`;
      })
      .join("");
  }

  function costruisciFiltri() {
    const voci = [{ id: "tutte", nome: "Tutte" }, ...CATEGORIE];
    const box = $("#filtri");
    box.innerHTML = voci
      .map((v) => `<li><button type="button" class="filtro" data-categoria="${esc(v.id)}" aria-pressed="${v.id === filtro}">${esc(v.nome)}<span class="conta">${conta(v.id)}</span></button></li>`)
      .join("");
    box.addEventListener("click", (e) => {
      const b = e.target.closest("[data-categoria]");
      if (b) impostaFiltro(b.dataset.categoria);
    });
  }

  /* modo:
     "sfuma"   le opere vecchie svaniscono, le nuove compaiono dipinte (clic sui filtri)
     "rivela"  le nuove compaiono dipinte subito (dopo la transizione dal menu)
     "nessuno" nessuna animazione (apertura della pagina) */
  function impostaFiltro(id, modo = "sfuma") {
    filtro = id === "tutte" || NOMI_CATEGORIE[id] ? id : "tutte";
    document.querySelectorAll(".filtro").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.categoria === filtro)));
    const griglia = $("#opere-griglia");
    clearTimeout(griglia._attesa);
    if (modo === "sfuma" && !menoMovimento()) {
      griglia.classList.add("is-cambiando");
      griglia._attesa = setTimeout(() => {
        disegnaGriglia(true, 0);
        griglia.classList.remove("is-cambiando");
      }, 200);
    } else {
      // con "rivela" si aspetta che il velo di pittura si ritiri
      disegnaGriglia(modo !== "nessuno", 0.3);
    }
  }

  function schedaOpera(o, i, anima, ritardoBase) {
    const art = document.createElement("article");
    art.className = "opera";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "opera-apri";
    btn.setAttribute("aria-label", `Guarda ${o.titolo} a schermo intero`);
    const media = creaMedia(o, 760);
    btn.append(media);
    btn.addEventListener("click", () => apriScheda(visibili, i, btn));
    const cap = document.createElement("div");
    cap.className = "didascalia";
    cap.innerHTML = didascaliaHTML(o);
    if (anima) {
      // Le opere si dipingono una dopo l'altra, la didascalia arriva poco dopo
      const ritardo = ritardoBase + Math.min(i, 8) * 0.07;
      media.classList.add("rivela");
      media.style.setProperty("--ritardo", `${ritardo}s`);
      cap.classList.add("appare");
      cap.style.setProperty("--ritardo", `${ritardo + 0.35}s`);
    } else if (!menoMovimento()) {
      // Primo caricamento: ogni opera si dipinge quando entra nello schermo
      art.setAttribute("data-rivela", "");
      media.classList.add("rivela");
      media.style.setProperty("--ritardo", `${(i % 3) * 0.12}s`);
      media.style.setProperty("--durata", "1s");
    }
    art.append(btn, cap);
    return art;
  }

  function disegnaGriglia(anima = false, ritardoBase = 0) {
    const griglia = $("#opere-griglia");
    visibili = filtro === "tutte" ? OPERE.slice() : OPERE.filter((o) => o.categoria === filtro);
    griglia.replaceChildren();
    if (!visibili.length) {
      griglia.innerHTML =
        filtro === "tutte"
          ? `<p class="vuoto">Le opere saranno pubblicate a breve.</p>`
          : `<p class="vuoto">Nessuna opera in questa categoria per ora. <button type="button" class="link-bottone" data-categoria="tutte">Mostra tutte le opere</button></p>`;
    } else {
      visibili.forEach((o, i) => griglia.append(schedaOpera(o, i, anima, ritardoBase)));
    }
    const n = visibili.length;
    $("#stato-filtro").textContent =
      filtro === "tutte" ? `${n} opere` : `${NOMI_CATEGORIE[filtro]}: ${n} ${n === 1 ? "opera" : "opere"}`;
  }

  function costruisciEvidenza() {
    const fig = $("#evidenza");
    const o = OPERE.find((x) => x.inEvidenza) || OPERE[0];
    if (!o) {
      fig.hidden = true;
      return;
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "evidenza-apri";
    btn.setAttribute("aria-label", `Guarda ${o.titolo} a schermo intero`);
    const cornice = document.createElement("span");
    cornice.className = "cornice";
    const media = creaMedia(o, 1100, true);
    media.classList.add("rivela"); // scoperta dalla luce all'apertura
    cornice.append(media);
    btn.append(cornice);
    btn.addEventListener("click", () => apriScheda(OPERE, OPERE.indexOf(o), btn));
    const cap = document.createElement("figcaption");
    cap.className = "didascalia";
    cap.innerHTML = didascaliaHTML(o);
    fig.append(btn, cap);
  }

  /* ------------------------------------------------------------------
     4. Scheda dell'opera a tutto schermo
     ------------------------------------------------------------------ */
  const scheda = $("#scheda");
  let elenco = [];
  let indice = 0;
  let origine = null;

  function apriScheda(lista, i, daDove) {
    elenco = lista;
    indice = Math.max(0, i);
    origine = daDove || null;
    riempiScheda(1);
    if (!scheda.open) {
      if (typeof scheda.showModal === "function") scheda.showModal();
      else scheda.setAttribute("open", "");
      document.documentElement.classList.add("no-scroll");
      $("#scheda-chiudi").focus();
    }
  }

  // verso: 1 = opera successiva (luce da sinistra), -1 = precedente (da destra)
  function riempiScheda(verso = 1) {
    const o = elenco[indice];
    if (!o) return;
    const media = creaMedia(o, 1600, true);
    media.classList.add("rivela");
    if (verso < 0) media.classList.add("rivela--indietro");
    media.style.setProperty("--durata", "0.75s");
    $("#scheda-media").replaceChildren(media);
    collegaLente(media);
    const info = $(".scheda-info");
    info.classList.remove("is-nuova");
    void info.offsetWidth; // fa ripartire l'animazione dei testi
    info.classList.add("is-nuova");
    $("#scheda-titolo").innerHTML = `<em>${esc(o.titolo)}</em>`;
    $("#scheda-meta").innerHTML = [o.anno, o.tecnica, o.misure, o.edizione]
      .filter(Boolean)
      .map((x) => `<span>${esc(x)}</span>`)
      .join("");
    $("#scheda-descrizione").textContent = o.descrizione || "";
    $("#scheda-descrizione").hidden = !o.descrizione;

    let prezzo = "";
    if (o.stato !== "venduta") prezzo = `<span>${o.prezzo ? esc(o.prezzo) : "Prezzo su richiesta"}</span>`;
    $("#scheda-stato").innerHTML = statoHTML(o) + prezzo + visteHTML(o, true);

    const richiesta = $("#scheda-richiesta");
    if (CONTATTI.email) {
      const oggetto = `Informazioni su "${o.titolo}"${o.anno ? ` (${o.anno})` : ""}`;
      richiesta.href = `mailto:${CONTATTI.email}?subject=${encodeURIComponent(oggetto)}`;
      richiesta.textContent = o.stato === "venduta" ? "Chiedi di opere simili" : "Chiedi informazioni";
      $("#scheda-email").textContent = CONTATTI.email;
    }
    richiesta.hidden = !CONTATTI.email;
    $("#scheda-email-riga").hidden = !CONTATTI.email;
    // "Provalo nella tua stanza" solo per le opere da appendere
    $("#scheda-stanza").hidden = !daParete(o);

    $("#scheda-piace").innerHTML = bottonePiace(o, true);
    Visite.conta(o.id);
    $("#scheda-pos").textContent = `${indice + 1} di ${elenco.length}`;
    $("#scheda-nav").hidden = elenco.length < 2;
  }

  function sposta(passo) {
    if (elenco.length < 2) return;
    indice = (indice + passo + elenco.length) % elenco.length;
    riempiScheda(passo);
  }

  function chiudiScheda() {
    if (typeof scheda.close === "function") scheda.close();
    else {
      scheda.removeAttribute("open");
      scheda.dispatchEvent(new Event("close"));
    }
  }

  /* Lente d'ingrandimento: con il mouse sopra l'opera, un cerchio mostra
     i dettagli dell'opera ingranditi due volte e mezzo */
  const conMouse = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  let lente = null;

  function collegaLente(media) {
    if (!lente) return;
    lente.classList.remove("is-attiva");
    lente.style.backgroundImage = "";
    const adatto = conMouse() && (media.tagName === "IMG" || media.tagName === "CANVAS");
    $("#scheda-nota-lente").hidden = !adatto;
    if (!adatto) return;
    media.classList.add("con-lente");
    const ZOOM = 2.5;
    const RAGGIO = 105;
    let sorgente = null;
    const prendiSorgente = () => {
      if (sorgente !== null) return sorgente;
      try {
        sorgente = media.tagName === "IMG" ? media.currentSrc || media.src : media.toDataURL("image/jpeg", 0.92);
      } catch (e) {
        sorgente = "";
      }
      if (sorgente) lente.style.backgroundImage = `url("${sorgente}")`;
      return sorgente;
    };
    media.addEventListener("pointermove", (e) => {
      if (!prendiSorgente()) return;
      const r = media.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      lente.style.backgroundSize = `${r.width * ZOOM}px ${r.height * ZOOM}px`;
      lente.style.backgroundPosition = `${-(x * ZOOM - RAGGIO)}px ${-(y * ZOOM - RAGGIO)}px`;
      lente.style.left = `${e.clientX - RAGGIO}px`;
      lente.style.top = `${e.clientY - RAGGIO}px`;
      lente.classList.add("is-attiva");
    });
    media.addEventListener("pointerleave", () => lente.classList.remove("is-attiva"));
  }

  function preparaScheda() {
    lente = document.createElement("div");
    lente.className = "lente";
    lente.setAttribute("aria-hidden", "true");
    scheda.append(lente);
    $("#scheda-chiudi").addEventListener("click", chiudiScheda);
    $("#scheda-prec").addEventListener("click", () => sposta(-1));
    $("#scheda-succ").addEventListener("click", () => sposta(1));
    scheda.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") sposta(1);
      if (e.key === "ArrowLeft") sposta(-1);
    });
    scheda.addEventListener("close", () => {
      document.documentElement.classList.remove("no-scroll");
      if (origine && document.contains(origine)) origine.focus();
    });
    // Scorrimento col dito sull'immagine
    let x0 = null;
    const media = $("#scheda-media");
    media.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    media.addEventListener("touchend", (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) sposta(dx < 0 ? 1 : -1);
      x0 = null;
    });
  }

  /* ------------------------------------------------------------------
     5. Eventi
     ------------------------------------------------------------------ */
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);

  function leggiData(s) {
    const [a, m, g] = String(s).split("-").map(Number);
    return new Date(a, m - 1, g);
  }
  const giorno = (d) => (d.getDate() === 1 ? "1°" : String(d.getDate()));
  const giornoMese = (d) => `${giorno(d)} ${MESI[d.getMonth()]}`;

  function periodo(a, b) {
    if (!b || +a === +b) return `${giornoMese(a)} ${a.getFullYear()}`;
    if (a.getFullYear() === b.getFullYear()) {
      if (a.getMonth() === b.getMonth()) return `${giorno(a)}–${giorno(b)} ${MESI[a.getMonth()]} ${a.getFullYear()}`;
      return `${giornoMese(a)} – ${giornoMese(b)} ${a.getFullYear()}`;
    }
    return `${giornoMese(a)} ${a.getFullYear()} – ${giornoMese(b)} ${b.getFullYear()}`;
  }

  function statoEvento(ev) {
    const a = leggiData(ev.inizio);
    const b = leggiData(ev.fine || ev.inizio);
    if (b < oggi) return { tipo: "passato" };
    if (a <= oggi) return { tipo: "ora", testo: "In corso" };
    const giorni = Math.round((a - oggi) / 864e5);
    if (giorni === 1) return { tipo: "presto", testo: "Domani" };
    if (giorni <= 21) return { tipo: "presto", testo: `Tra ${giorni} giorni` };
    return { tipo: "futuro" };
  }

  function eventoHTML(ev, n = 0) {
    const a = leggiData(ev.inizio);
    const b = leggiData(ev.fine || ev.inizio);
    const st = statoEvento(ev);
    const pill = st.testo ? `<span class="pill${st.tipo === "ora" ? " pill--ora" : ""}">${st.testo}</span>` : "";
    const luogo = [ev.luogo, ev.citta].filter(Boolean).map(esc).join(", ");
    const mappa = ev.indirizzo
      ? `<a class="evento-link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.indirizzo)}" target="_blank" rel="noopener">Apri in Google Maps</a>`
      : "";
    const sito = ev.link ? `<a class="evento-link" href="${esc(ev.link)}" target="_blank" rel="noopener">Pagina dell'evento</a>` : "";
    return `
      <li class="evento" data-rivela style="--i: ${Math.min(n, 6)}">
        <p class="evento-data">
          <span class="evento-giorno">${giorno(a)}</span>
          <span class="evento-mese">${MESI_BREVI[a.getMonth()]} ${a.getFullYear()}</span>
        </p>
        <div class="evento-corpo">
          <h3 class="evento-titolo">${esc(ev.titolo)}</h3>
          ${ev.tipo ? `<p class="evento-tipo">${esc(ev.tipo)}</p>` : ""}
          <p class="evento-righe">
            ${luogo ? `<span>${luogo}</span>` : ""}
            <span>${periodo(a, b)}</span>
            ${ev.indirizzo ? `<span>${esc(ev.indirizzo)}</span>` : ""}
            ${ev.note ? `<span>${esc(ev.note)}</span>` : ""}
          </p>
          ${mappa}${sito}
        </div>
        ${pill ? `<p class="evento-stato">${pill}</p>` : ""}
      </li>`;
  }

  function costruisciEventi() {
    const prossimi = EVENTI.filter((e) => statoEvento(e).tipo !== "passato")
      .sort((x, y) => leggiData(x.inizio) - leggiData(y.inizio));
    const passati = EVENTI.filter((e) => statoEvento(e).tipo === "passato")
      .sort((x, y) => leggiData(y.fine || y.inizio) - leggiData(x.fine || x.inizio));

    $("#eventi-lista").innerHTML = prossimi.length
      ? prossimi.map((ev, n) => eventoHTML(ev, n)).join("")
      : `<li class="nessun-evento">Al momento non ci sono eventi in programma. Le nuove date escono prima su Instagram.</li>`;

    if (passati.length) {
      $("#eventi-passati").innerHTML = passati.map((ev, n) => eventoHTML(ev, n)).join("");
      $("#archivio").hidden = false;
    }

    // Riga sotto la presentazione: mostra in corso o prossimo appuntamento
    const primo = prossimi[0];
    const box = $("#adesso");
    if (!primo) return;
    const ora = statoEvento(primo).tipo === "ora";
    const dove = [primo.luogo, primo.citta].filter(Boolean).map(esc).join(", ");
    const quando = ora
      ? `fino al ${giornoMese(leggiData(primo.fine || primo.inizio))}`
      : `dal ${giornoMese(leggiData(primo.inizio))}`;
    box.innerHTML = `<span>${ora ? "In corso" : "Prossimo appuntamento"}: <a href="#eventi">${esc(primo.titolo)}</a>, ${dove}, ${quando}</span>`;
    box.classList.toggle("is-futuro", !ora);
    box.hidden = false;
  }

  /* ------------------------------------------------------------------
     5b. Processo creativo
     Ogni video può essere un file caricato dal pannello (cartella video/)
     oppure un link a YouTube, Instagram o TikTok.
     - file:      lettore del browser, senza uscire dal sito
     - YouTube:   copertina con "Guarda"; al clic parte il video nel sito
     - Instagram, TikTok: copertina che apre il video sul social
     I video con la data più recente compaiono per primi.
     ------------------------------------------------------------------ */
  const ICONA_PLAY =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg>';

  function analizzaLink(indirizzo) {
    let u;
    try {
      u = new URL(indirizzo);
    } catch (e) {
      return null;
    }
    const host = u.hostname.replace(/^(www|m)\./, "");
    const idValido = (id) => (/^[\w-]{6,20}$/.test(id || "") ? id : null);
    if (host === "youtu.be") {
      const id = idValido(u.pathname.split("/")[1]);
      return id ? { tipo: "youtube", id, verticale: false } : null;
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const parti = u.pathname.split("/");
      if (parti[1] === "shorts" || parti[1] === "embed" || parti[1] === "live") {
        const id = idValido(parti[2]);
        return id ? { tipo: "youtube", id, verticale: parti[1] === "shorts" } : null;
      }
      const id = idValido(u.searchParams.get("v"));
      return id ? { tipo: "youtube", id, verticale: false } : null;
    }
    if (host.endsWith("instagram.com")) return { tipo: "instagram", url: u.href, verticale: true };
    if (host.endsWith("tiktok.com")) return { tipo: "tiktok", url: u.href, verticale: true };
    return { tipo: "altro", url: u.href, verticale: false };
  }

  function avvisoVideoMancante(percorso) {
    const avviso = document.createElement("div");
    avviso.className = "media-mancante";
    avviso.innerHTML = `<strong>Video non trovato</strong><span>${esc(percorso)}</span><span>Ricaricalo dal pannello</span>`;
    return avviso;
  }

  // Restituisce il riquadro del video e il suo orientamento
  function mediaVideo(v, scheda) {
    // 1. File caricato
    if (v.video) {
      const box = document.createElement("div");
      box.className = "video-media";
      const el = document.createElement("video");
      el.controls = true;
      el.playsInline = true;
      el.preload = "metadata";
      if (v.copertina) el.poster = v.copertina;
      // senza copertina, "#t=0.1" mostra il primo fotogramma anche su iPhone
      el.src = v.copertina ? v.video : `${v.video}#t=0.1`;
      el.setAttribute("aria-label", v.titolo);
      el.addEventListener("loadedmetadata", () => {
        const r = el.videoWidth / el.videoHeight;
        scheda.classList.remove("video--verticale", "video--orizzontale", "video--quadrato");
        scheda.classList.add(r > 1.15 ? "video--orizzontale" : r > 0.87 ? "video--quadrato" : "video--verticale");
        aggiornaFrecce();
      });
      el.addEventListener("error", () => box.replaceChildren(avvisoVideoMancante(v.video)), { once: true });
      box.append(el);
      return { box, orientamento: "verticale" };
    }

    // 2. Link
    const info = analizzaLink(v.link);
    if (!info) return null;
    const orientamento = info.verticale ? "verticale" : "orizzontale";
    const copertina = v.copertina || (info.tipo === "youtube" ? `https://i.ytimg.com/vi/${info.id}/hqdefault.jpg` : "");
    const nomi = { youtube: "YouTube", instagram: "Instagram", tiktok: "TikTok", altro: "il sito" };
    const icone = { instagram: ICONE.instagram, tiktok: ICONE.tiktok };

    const fondo = `<span class="video-fondo">${icone[info.tipo] ? `<span class="icona">${icone[info.tipo]}</span>` : ""}</span>`;
    const immagine = copertina ? `<img src="${esc(copertina)}" alt="" loading="lazy">` : "";

    if (info.tipo === "youtube") {
      const box = document.createElement("button");
      box.type = "button";
      box.className = "video-media video-facciata";
      box.setAttribute("aria-label", `Guarda il video ${v.titolo}`);
      box.innerHTML = `${fondo}${immagine}<span class="video-gioca">${ICONA_PLAY}Guarda</span>`;
      const img = box.querySelector("img");
      if (img) img.addEventListener("error", () => img.remove(), { once: true });
      box.addEventListener("click", () => {
        const contenitore = document.createElement("div");
        contenitore.className = "video-media";
        contenitore.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${info.id}?autoplay=1&rel=0&playsinline=1" title="${esc(v.titolo)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
        box.replaceWith(contenitore);
      });
      return { box, orientamento };
    }

    const box = document.createElement("a");
    box.className = "video-media video-facciata";
    box.href = info.url;
    box.target = "_blank";
    box.rel = "noopener";
    box.setAttribute("aria-label", `Guarda ${v.titolo} su ${nomi[info.tipo]}`);
    const etichetta = icone[info.tipo] ? `<span class="icona">${icone[info.tipo]}</span>` : ICONA_PLAY;
    box.innerHTML = `${fondo}${immagine}<span class="video-gioca">${etichetta}Guarda su ${nomi[info.tipo]}</span>`;
    const img = box.querySelector("img");
    if (img) img.addEventListener("error", () => img.remove(), { once: true });
    return { box, orientamento };
  }

  function schedaVideo(v) {
    const scheda = document.createElement("article");
    scheda.className = "video";
    scheda.setAttribute("data-rivela", "");
    const media = mediaVideo(v, scheda);
    if (!media) return null;
    scheda.classList.add(`video--${media.orientamento}`);

    const testo = document.createElement("div");
    testo.className = "video-testo";
    const data = v.data ? leggiData(v.data) : null;
    testo.innerHTML = `
      ${data && !isNaN(data) ? `<p class="video-data">${giornoMese(data)} ${data.getFullYear()}</p>` : ""}
      <h3 class="video-titolo">${esc(v.titolo)}</h3>
      ${v.descrizione ? `<p class="video-descrizione">${esc(v.descrizione)}</p>` : ""}`;

    // Collegamento all'opera finita, se il titolo corrisponde a un'opera
    const cercato = String(v.opera || "").trim().toLowerCase();
    const indiceOpera = cercato ? OPERE.findIndex((o) => o.titolo.trim().toLowerCase() === cercato) : -1;
    if (indiceOpera >= 0) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "link-bottone video-opera";
      btn.textContent = "Guarda l'opera finita";
      btn.addEventListener("click", () => apriScheda(OPERE, indiceOpera, btn));
      testo.append(btn);
    }

    scheda.append(media.box, testo);
    return scheda;
  }

  function aggiornaFrecce() {
    const striscia = $("#processo-striscia");
    const comandi = $("#processo-comandi");
    if (!striscia || !comandi) return;
    const scorre = striscia.scrollWidth > striscia.clientWidth + 4;
    comandi.hidden = !scorre;
    $("#processo-prec").disabled = striscia.scrollLeft <= 4;
    $("#processo-succ").disabled = striscia.scrollLeft + striscia.clientWidth >= striscia.scrollWidth - 4;
  }

  function costruisciProcesso() {
    const striscia = $("#processo-striscia");
    const ordinati = PROCESSO.map((v, i) => ({ v, i })).sort((a, b) => {
      if (a.v.data && b.v.data && a.v.data !== b.v.data) return a.v.data < b.v.data ? 1 : -1;
      if (a.v.data && !b.v.data) return -1;
      if (!a.v.data && b.v.data) return 1;
      return a.i - b.i;
    });
    const schede = ordinati.map(({ v }) => schedaVideo(v)).filter(Boolean);
    if (!schede.length) {
      striscia.innerHTML = `<p class="vuoto">Presto qui i video dallo studio.</p>`;
      striscia.removeAttribute("tabindex");
      return;
    }
    schede.forEach((s, n) => s.style.setProperty("--i", Math.min(n, 5)));
    striscia.replaceChildren(...schede);

    const passo = (verso) =>
      striscia.scrollBy({ left: verso * striscia.clientWidth * 0.8, behavior: menoMovimento() ? "auto" : "smooth" });
    $("#processo-prec").addEventListener("click", () => passo(-1));
    $("#processo-succ").addEventListener("click", () => passo(1));
    striscia.addEventListener("scroll", aggiornaFrecce, { passive: true });
    window.addEventListener("resize", aggiornaFrecce);
    striscia.querySelectorAll("img").forEach((img) => img.addEventListener("load", aggiornaFrecce, { once: true }));
    aggiornaFrecce();
  }

  // Un solo video alla volta: quando ne parte uno, gli altri si fermano
  document.addEventListener(
    "play",
    (e) => {
      document.querySelectorAll("video").forEach((v) => {
        if (v !== e.target) v.pause();
      });
    },
    true
  );

  /* ------------------------------------------------------------------
     6. Contatti
     ------------------------------------------------------------------ */
  // Busta per l'email, disegnata qui; Instagram e TikTok usano le icone di Font Awesome
  const ICONE = {
    email:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="1.5"/><path d="M3.5 6.5 12 13l8.5-6.5"/></svg>',
    instagram: '<i class="fa-brands fa-instagram" aria-hidden="true"></i>',
    tiktok: '<i class="fa-brands fa-tiktok" aria-hidden="true"></i>',
  };

  function costruisciContatti() {
    const pulisci = (s) => String(s || "").trim().replace(/^@/, "");
    const elenco = (v) => [].concat(v || []).map(pulisci).filter(Boolean);

    const voci = [];
    if (CONTATTI.email) {
      voci.push({ tipo: "email", etichetta: "Email", testo: CONTATTI.email, href: `mailto:${CONTATTI.email}`, copia: true });
    }
    elenco(CONTATTI.instagram).forEach((u) => {
      voci.push({ tipo: "instagram", etichetta: "Instagram", testo: `@${u}`, href: `https://www.instagram.com/${encodeURIComponent(u)}/`, esterno: true });
    });
    elenco(CONTATTI.tiktok).forEach((u) => {
      voci.push({ tipo: "tiktok", etichetta: "TikTok", testo: `@${u}`, href: `https://www.tiktok.com/@${encodeURIComponent(u)}`, esterno: true });
    });

    const attributiLink = (v) => `href="${esc(v.href)}"${v.esterno ? ' target="_blank" rel="noopener"' : ""}`;

    const lista = $("#contatti-lista");
    lista.innerHTML = voci
      .map(
        (v, n) => `
        <li class="contatto" data-rivela style="--i: ${n}">
          <span class="contatto-etichetta">${v.etichetta}</span>
          <a class="contatto-valore" ${attributiLink(v)}>
            <span class="icona">${ICONE[v.tipo]}</span>
            <span class="contatto-testo">${esc(v.testo)}</span>
          </a>
          ${v.copia ? `<button type="button" class="copia" data-testo="${esc(v.testo)}">Copia</button>` : "<span></span>"}
        </li>`
      )
      .join("");

    // Gli stessi social, piccoli, nel piè di pagina
    $("#piede-social").innerHTML = voci
      .filter((v) => v.tipo !== "email")
      .map(
        (v) => `
        <li><a ${attributiLink(v)} aria-label="${v.etichetta} ${esc(v.testo)}">
          <span class="icona">${ICONE[v.tipo]}</span><span>${esc(v.testo.slice(1))}</span>
        </a></li>`
      )
      .join("");

    // Nel menu del telefono: l'email e tutti i social, in fondo
    const social = voci.filter((v) => v.tipo !== "email");
    const piedeMenu = $("#menu-piede");
    if (piedeMenu) {
      piedeMenu.innerHTML =
        (CONTATTI.email ? `<a class="menu-email" href="mailto:${esc(CONTATTI.email)}">${esc(CONTATTI.email)}</a>` : "") +
        (social.length
          ? `<ul class="menu-social" aria-label="Social">${social
              .map((v) => `<li><a ${attributiLink(v)}><span class="icona">${ICONE[v.tipo]}</span><span>${esc(v.testo)}</span></a></li>`)
              .join("")}</ul>`
          : "");
    }

    // Nella barra su schermi larghi: un'icona per ogni social (il primo profilo di ciascuno)
    const barra = $("#testata-social");
    if (barra) {
      const visti = new Set();
      barra.innerHTML = social
        .filter((v) => !visti.has(v.tipo) && visti.add(v.tipo))
        .map((v) => `<li><a ${attributiLink(v)} aria-label="${v.etichetta} ${esc(v.testo)}" title="${esc(v.testo)}">${ICONE[v.tipo]}</a></li>`)
        .join("");
    }

    lista.addEventListener("click", (e) => {
      const b = e.target.closest(".copia");
      if (!b) return;
      const fatto = (msg) => {
        b.textContent = msg;
        clearTimeout(b._timer);
        b._timer = setTimeout(() => { b.textContent = "Copia"; }, 2200);
      };
      const seleziona = () => {
        const t = b.parentElement.querySelector(".contatto-testo");
        const range = document.createRange();
        range.selectNodeContents(t);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        fatto("Selezionato");
      };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(b.dataset.testo).then(() => fatto("Copiato"), seleziona);
        } else {
          seleziona();
        }
      } catch (err) {
        seleziona();
      }
    });
  }

  /* ------------------------------------------------------------------
     7. Testata e menu
     ------------------------------------------------------------------ */
  // Riporta la macchia di colore del menu sulla sezione che stai guardando
  // (la imposta preparaMenu, la chiama anche preparaSezioneCorrente)
  let segnoTorna = () => {};

  // Il ghirigoro sotto il nome si disegna come una firma
  function disegnaFirma(ritardo = 0) {
    const firma = $(".marchio-firma path");
    if (!firma || !firma.animate || menoMovimento()) return;
    firma.animate([{ strokeDashoffset: "1" }, { strokeDashoffset: "0" }], {
      duration: 1100,
      delay: ritardo,
      easing: "cubic-bezier(0.6, 0.05, 0.3, 1)",
      fill: "backwards",
    });
  }

  function preparaMenu() {
    const radice = document.documentElement;
    const btn = $("#menu-btn");
    const testoBtn = btn.querySelector(".menu-btn-testo");
    const menu = $("#menu");
    const telefono = window.matchMedia("(max-width: 760px)");
    const sotto = [$("main"), $(".piede")].filter(Boolean);

    // Sul telefono il menu copre lo schermo: un cielo notturno che si apre dal pulsante
    // e in chiusura resta visibile finché il colore non si è ritirato (is-closing)
    const chiudiDelTutto = () => {
      menu.classList.remove("is-open", "is-closing");
      radice.classList.remove("menu-aperto");
    };
    const imposta = (aperto) => {
      btn.setAttribute("aria-expanded", String(aperto));
      testoBtn.textContent = aperto ? "Chiudi" : "Menu";
      // la pagina sotto non si raggiunge col tasto Tab mentre il menu la copre
      sotto.forEach((el) => {
        el.inert = aperto && telefono.matches;
      });
      clearTimeout(menu._chiusura);
      if (aperto) {
        menu.classList.remove("is-closing");
        menu.classList.add("is-open");
        radice.classList.add("menu-aperto");
        menu.scrollTop = 0;
      } else if (menu.classList.contains("is-open")) {
        if (!telefono.matches || menoMovimento()) {
          chiudiDelTutto();
          return;
        }
        menu.classList.add("is-closing");
        menu._chiusura = setTimeout(chiudiDelTutto, 420);
      }
    };
    btn.addEventListener("click", () => imposta(btn.getAttribute("aria-expanded") !== "true"));

    // Un clic su una voce chiude il menu; il passaggio di sezione lo fa preparaNavigazione
    menu.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      imposta(false);
      a.blur();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.classList.contains("is-open")) {
        imposta(false);
        btn.focus();
      }
    });

    // Il fondo della barra scende quando scorri e si ritira in cima
    const testata = $(".testata");
    const aggiorna = () => testata.classList.toggle("is-scrolled", window.scrollY > 24);
    window.addEventListener("scroll", aggiorna, { passive: true });
    aggiorna();

    // Il nome si ridisegna come una firma al passaggio del mouse
    $(".marchio").addEventListener("mouseenter", () => disegnaFirma());

    // La macchia di colore sotto le voci (solo su schermi larghi)
    const segno = $(".menu-segno");
    const voci = Array.from(document.querySelectorAll(".menu-lista > .menu-voce > .menu-link"));
    let suSegno = null; // la voce su cui sta la macchia
    let indicata = null; // la voce sotto il mouse o con il focus

    const sposta = (a, forza) => {
      if (!segno || telefono.matches) return;
      if (a === suSegno && !forza) return;
      const prima = suSegno;
      if (prima) prima.classList.remove("sotto-segno");
      suSegno = a;
      if (!a) {
        segno.classList.remove("visibile");
        return;
      }
      // se la macchia era nascosta (o la finestra è cambiata) compare lì, senza scivolare
      const salta = forza || !prima || !segno.classList.contains("visibile");
      if (salta) segno.classList.add("senza-scivolo");
      const r = a.getBoundingClientRect();
      const n = menu.getBoundingClientRect();
      const h = Math.round(r.height * 0.7);
      segno.style.setProperty("--x", `${(r.left - n.left - 14).toFixed(1)}px`);
      segno.style.setProperty("--y", `${(r.top - n.top + (r.height - h) / 2 + 1).toFixed(1)}px`);
      segno.style.setProperty("--w", `${(r.width + 28).toFixed(1)}px`);
      segno.style.setProperty("--h", `${h}px`);
      segno.style.setProperty("--segno-colore", a.parentElement.style.getPropertyValue("--pigmento") || "var(--oro)");
      if (salta) {
        void segno.offsetWidth;
        segno.classList.remove("senza-scivolo");
      }
      segno.classList.add("visibile");
      a.classList.add("sotto-segno");
      // mentre scivola la foglia d'oro si allunga e si piega, come tirata dal vento
      if (!salta && segno.animate && !menoMovimento()) {
        const verso = voci.indexOf(a) > voci.indexOf(prima) ? -1 : 1;
        segno.animate(
          [{ transform: "none" }, { transform: `scaleY(0.5) skewX(${verso * 14}deg)`, offset: 0.4 }, { transform: "none" }],
          { duration: 560, easing: "ease-out" }
        );
      }
    };
    const corrente = () => voci.find((a) => a.hasAttribute("aria-current")) || null;
    segnoTorna = (forza) => sposta(indicata || corrente(), forza === true);

    voci.forEach((a) => {
      a.addEventListener("mouseenter", () => {
        indicata = a;
        sposta(a);
      });
      a.addEventListener("focus", () => {
        indicata = a;
        sposta(a);
      });
    });
    $(".menu-lista").addEventListener("mouseleave", () => {
      indicata = null;
      segnoTorna();
    });
    menu.addEventListener("focusout", (e) => {
      if (menu.contains(e.relatedTarget)) return;
      indicata = null;
      segnoTorna();
    });
    window.addEventListener("resize", () => segnoTorna(true));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => segnoTorna(true));

    // Passando da telefono a schermo largo (o viceversa) il menu si chiude
    const cambiaSchermo = () => {
      imposta(false);
      segnoTorna(true);
    };
    if (telefono.addEventListener) telefono.addEventListener("change", cambiaSchermo);
    else if (telefono.addListener) telefono.addListener(cambiaSchermo);
  }

  /* ------------------------------------------------------------------
     7b. Passaggio tra le sezioni con l'eclissi
     Ogni link interno (#opere, #eventi, #contatti, #inizio e le categorie
     del sottomenu) fa partire dal punto cliccato un disco di notte che
     copre lo schermo; sotto, la pagina si sposta; poi la luce torna.
     ------------------------------------------------------------------ */
  function vaiA(id, categoria, x, y) {
    const meta = document.getElementById(id);
    if (!meta) return;
    Cielo.transizione(() => {
      if (categoria) impostaFiltro(categoria, "rivela");
      const radice = document.documentElement;
      radice.style.scrollBehavior = "auto"; // salto istantaneo, tanto è coperto
      if (id === "inizio") window.scrollTo(0, 0);
      else meta.scrollIntoView();
      radice.style.scrollBehavior = "";
      const ancora = categoria && categoria !== "tutte" ? categoria : id;
      try {
        history.replaceState(null, "", `#${ancora}`);
      } catch (err) {
        /* alcune anteprime non permettono di cambiare l'indirizzo */
      }
      const titolo = meta.querySelector("h1, h2");
      if (titolo) {
        titolo.setAttribute("tabindex", "-1");
        titolo.focus({ preventScroll: true });
      }
    }, x, y);
  }

  function preparaNavigazione() {
    document.addEventListener("click", (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest('a[href^="#"]');
      if (!a || a.classList.contains("salta")) return;
      const id = a.getAttribute("href").slice(1);
      if (!id || !document.getElementById(id)) return;
      e.preventDefault();
      if (a.closest("#scheda")) chiudiScheda();
      // l'eclissi parte dal punto cliccato (con la tastiera, dal centro del link)
      let x = e.clientX;
      let y = e.clientY;
      if (!x && !y) {
        const r = a.getBoundingClientRect();
        x = r.left + r.width / 2;
        y = r.top + r.height / 2;
      }
      vaiA(id, a.dataset.categoria, x, y);
    });
  }

  // La voce del menu della sezione che stai guardando resta segnata dalla foglia d'oro
  // La sezione corrente è l'ultima il cui inizio ha superato quasi metà schermo:
  // anche sopra le fasce del tramonto e della luna resta segnata quella appena letta
  function preparaSezioneCorrente() {
    const link = {};
    document.querySelectorAll(".menu-lista > .menu-voce > .menu-link").forEach((a) => {
      link[a.getAttribute("href").slice(1)] = a;
    });
    const sezioni = Object.keys(link).map((id) => document.getElementById(id)).filter(Boolean);
    if (!sezioni.length) return;
    let attuale;
    let inAttesa = false;
    const aggiorna = () => {
      inAttesa = false;
      const soglia = window.innerHeight * 0.45;
      let trovata = null;
      sezioni.forEach((s) => {
        if (s.getBoundingClientRect().top <= soglia) trovata = s;
      });
      // in fondo alla pagina vale l'ultima sezione, anche se è corta
      const radice = document.documentElement;
      if (trovata && window.scrollY + window.innerHeight >= radice.scrollHeight - 4) trovata = sezioni[sezioni.length - 1];
      const id = trovata ? trovata.id : null;
      if (id === attuale) return;
      attuale = id;
      Object.values(link).forEach((a) => a.removeAttribute("aria-current"));
      if (id) link[id].setAttribute("aria-current", "location");
      segnoTorna();
    };
    const chiedi = () => {
      if (!inAttesa) {
        inAttesa = true;
        requestAnimationFrame(aggiorna);
      }
    };
    window.addEventListener("scroll", chiedi, { passive: true });
    window.addEventListener("resize", chiedi);
    aggiorna();
  }

  /* ------------------------------------------------------------------
     9. Effetti a tema pittura
     ------------------------------------------------------------------ */

  // Divide il nome in lettere, per farle comparire una alla volta
  function preparaNome() {
    const nome = $(".nome");
    if (!nome || nome.dataset.diviso) return;
    nome.dataset.diviso = "1";
    nome.setAttribute("aria-label", nome.textContent.replace(/\s+/g, " ").trim());
    let i = 0;
    nome.querySelectorAll(":scope > span").forEach((riga) => {
      const testo = riga.textContent;
      riga.textContent = "";
      riga.setAttribute("aria-hidden", "true");
      for (const ch of testo) {
        const lettera = document.createElement("span");
        lettera.className = "lettera";
        lettera.textContent = ch === " " ? " " : ch;
        lettera.style.setProperty("--i", i++);
        riga.append(lettera);
      }
    });
  }

  function leggiColore(nome, riserva) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
    return /^#[0-9a-f]{6}$/i.test(v) ? v : riserva;
  }
  const inRgb = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };

  // Polvere d'oro: il mouse lascia nell'apertura scintille che salgono piano e si spengono
  function preparaPolvere() {
    if (!conMouse() || menoMovimento()) return;
    const sezione = $(".apertura");
    if (!sezione) return;
    const tela = document.createElement("canvas");
    tela.className = "polvere";
    tela.setAttribute("aria-hidden", "true");
    sezione.prepend(tela);
    const ctx = tela.getContext("2d");
    const colori = [
      leggiColore("--oro", "#B8841F"),
      leggiColore("--oro-chiaro", "#E6C46C"),
      "#D9A93F",
      "#F3DA94",
    ];
    let W = 0;
    let H = 0;
    const dimensiona = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = sezione.clientWidth;
      H = sezione.clientHeight;
      tela.width = Math.round(W * dpr);
      tela.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    dimensiona();
    if ("ResizeObserver" in window) new ResizeObserver(dimensiona).observe(sezione);
    else window.addEventListener("resize", dimensiona);

    const granelli = [];
    let gira = false;
    let ultimo = null;
    let tempo = 0;

    const fotogramma = (ora) => {
      const dt = tempo ? Math.min(0.05, (ora - tempo) / 1000) : 1 / 60;
      tempo = ora;
      ctx.clearRect(0, 0, W, H);
      for (let i = granelli.length - 1; i >= 0; i--) {
        const g = granelli[i];
        g.vita -= dt / g.durata;
        if (g.vita <= 0) {
          granelli.splice(i, 1);
          continue;
        }
        g.x += g.vx * dt * 60;
        g.y += g.vy * dt * 60;
        g.vy -= 0.01 * dt * 60; // salgono, come scintille sopra una fiamma
        g.vx *= 0.985;
        g.giro += g.vg;
        // brillano: la luce va e viene mentre si spengono
        ctx.globalAlpha = Math.min(1, g.vita * 1.8) * (0.65 + 0.35 * Math.sin(ora / 90 + g.fase));
        ctx.fillStyle = g.colore;
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.rotate(g.giro);
        if (g.stella) {
          stella(ctx, 0, 0, g.s * 2.6, 4, 0.26);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, g.s, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (granelli.length) {
        requestAnimationFrame(fotogramma);
      } else {
        gira = false;
        tempo = 0;
      }
    };

    sezione.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const r = sezione.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const d = ultimo ? Math.hypot(x - ultimo.x, y - ultimo.y) : 0;
      const quanti = Math.min(5, 1 + Math.floor(d / 14));
      for (let k = 1; k <= quanti && granelli.length < 240; k++) {
        const t = k / quanti;
        granelli.push({
          x: ultimo ? ultimo.x + (x - ultimo.x) * t : x,
          y: ultimo ? ultimo.y + (y - ultimo.y) * t : y,
          vx: (Math.random() - 0.5) * 0.7 + (ultimo ? (x - ultimo.x) * 0.015 : 0),
          vy: (Math.random() - 0.5) * 0.6 - 0.2,
          s: 0.7 + Math.random() * 1.7,
          stella: Math.random() < 0.2,
          giro: Math.random() * Math.PI,
          vg: (Math.random() - 0.5) * 0.08,
          fase: Math.random() * 6,
          colore: colori[(Math.random() * colori.length) | 0],
          vita: 1,
          durata: 0.9 + Math.random() * 1.2,
        });
      }
      ultimo = { x, y };
      if (!gira) {
        gira = true;
        requestAnimationFrame(fotogramma);
      }
    });
    sezione.addEventListener("pointerleave", () => {
      ultimo = null;
    });
  }

  // Cursore da galleria: un cerchio che segue il mouse, "Guarda" sulle opere
  function preparaCursore() {
    if (!conMouse()) return;
    const cursore = document.createElement("div");
    cursore.className = "cursore";
    cursore.setAttribute("aria-hidden", "true");
    cursore.innerHTML = '<span class="cursore-testo">Guarda</span>';
    document.body.append(cursore);
    document.documentElement.classList.add("cursore-attivo");

    let x = -200;
    let y = -200;
    let cx = x;
    let cy = y;
    const morbidezza = menoMovimento() ? 1 : 0.2;
    window.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType !== "mouse") return;
        x = e.clientX;
        y = e.clientY;
        if (!cursore.classList.contains("is-visibile")) {
          cx = x;
          cy = y;
          cursore.classList.add("is-visibile");
        }
      },
      { passive: true }
    );
    document.addEventListener("mouseout", (e) => {
      if (!e.relatedTarget) cursore.classList.remove("is-visibile");
    });
    document.addEventListener("pointerover", (e) => {
      const guarda = e.target.closest(".opera-apri, .evidenza-apri, .video-facciata");
      const link = !guarda && e.target.closest("a, button, summary, label, input, [tabindex='0']");
      cursore.classList.toggle("is-guarda", !!guarda);
      cursore.classList.toggle("is-link", !!link);
    });
    const muovi = () => {
      cx += (x - cx) * morbidezza;
      cy += (y - cy) * morbidezza;
      cursore.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
      requestAnimationFrame(muovi);
    };
    requestAnimationFrame(muovi);
  }

  // Le opere si inclinano appena verso il mouse, con un riflesso di luce
  function preparaInclinazione() {
    if (!conMouse() || menoMovimento()) return;
    let attiva = null;
    const lascia = (el) => {
      el.classList.remove("is-inclinato");
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    };
    document.addEventListener(
      "pointermove",
      (e) => {
        const el = e.target.closest(".opera-apri, .evidenza-apri");
        if (el !== attiva) {
          if (attiva) lascia(attiva);
          attiva = el;
        }
        if (!el) return;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.style.setProperty("--rx", `${((0.5 - py) * 6).toFixed(2)}deg`);
        el.style.setProperty("--ry", `${((px - 0.5) * 8).toFixed(2)}deg`);
        el.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
        el.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
        el.classList.add("is-inclinato");
      },
      { passive: true }
    );
  }

  // Il meandro d'oro sotto la testata si allunga mentre si scorre la pagina
  function preparaProgresso() {
    const testata = $(".testata");
    let inAttesa = false;
    const aggiorna = () => {
      inAttesa = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      testata.style.setProperty("--progresso", `${(p * 100).toFixed(2)}%`);
    };
    window.addEventListener(
      "scroll",
      () => {
        if (!inAttesa) {
          inAttesa = true;
          requestAnimationFrame(aggiorna);
        }
      },
      { passive: true }
    );
    window.addEventListener("resize", aggiorna);
    aggiorna();
  }

  // Comparse allo scorrimento: gli elementi con data-rivela entrano quando diventano visibili
  let osservatoreRivela = null;
  function osservaRivelazioni(radice = document) {
    const elementi = radice.querySelectorAll("[data-rivela]:not(.visibile)");
    if (!("IntersectionObserver" in window) || menoMovimento()) {
      elementi.forEach((el) => el.classList.add("visibile"));
      return;
    }
    if (!osservatoreRivela) {
      osservatoreRivela = new IntersectionObserver(
        (voci) => {
          voci.forEach((v) => {
            if (v.isIntersecting) {
              v.target.classList.add("visibile");
              osservatoreRivela.unobserve(v.target);
            }
          });
        },
        { rootMargin: "0px 0px -6% 0px", threshold: 0.06 }
      );
    }
    elementi.forEach((el) => osservatoreRivela.observe(el));
  }

  // Nastro delle categorie: tutte quelle del menu, ripetute quanto basta a riempire lo schermo
  function costruisciNastro() {
    const voci = CATEGORIE.map((c, n) => ({ ...c, quante: conta(c.id), pigmento: PIGMENTI[n % PIGMENTI.length] }));
    if (!voci.length) return;

    // Davanti: le categorie, ripetute finché la fascia è piena
    const giro = [];
    while (giro.length < 10) giro.push(...voci);
    const gruppo = (copia) =>
      `<div class="nastro-gruppo"${copia ? ' aria-hidden="true"' : ""}>` +
      giro
        .map((c, i) => {
          const fuoriTab = copia || i >= voci.length;
          return (
            `<a class="nastro-voce${i % 2 ? " nastro-voce--contorno" : ""}" href="#opere" data-categoria="${esc(c.id)}" style="--pigmento: ${c.pigmento}"${fuoriTab ? ' tabindex="-1"' : ""}>` +
            `${esc(c.nome)}${c.quante ? `<sup class="nastro-conta">${c.quante}</sup>` : ""}</a>` +
            `<span class="macchia macchia--${i % 4}" aria-hidden="true"></span>`
          );
        })
        .join("") +
      "</div>";
    // due metà identiche: spostandosi di metà larghezza il giro si chiude senza salti
    $("#nastro-traccia").innerHTML = gruppo(false) + gruppo(true);

    // Sopra: le miniature delle opere, come metope di un fregio
    const miniature = $("#nastro-miniature");
    const opere = OPERE.slice(0, 16);
    if (opere.length) {
      const fila = [];
      while (fila.length < 10) fila.push(...opere);
      const inclinazioni = [-2.5, 1.5, -1, 2.5, -1.8, 1];
      [0, 1].forEach(() => {
        const g = document.createElement("div");
        g.className = "nastro-gruppo";
        fila.forEach((o, i) => {
          const mini = document.createElement("span");
          mini.className = "nastro-mini";
          mini.style.setProperty("--inclina", `${inclinazioni[i % inclinazioni.length]}deg`);
          mini.append(creaMedia(o, 240));
          g.append(mini);
        });
        miniature.append(g);
      });
    } else {
      $(".nastro-fascia--opere").hidden = true;
    }

    $("#nastro").hidden = false;
    animaNastro();
    preparaAnteprimaNastro();
  }

  // Le due fasce scorrono in versi opposti. Lo scorrimento della pagina le spinge
  // (più veloce scorri, più corrono), ne cambia il verso e le piega un po'.
  function animaNastro() {
    const nastro = $("#nastro");
    const fasce = [
      { traccia: $("#nastro-traccia"), verso: -1, base: 52 },
      { traccia: $("#nastro-miniature"), verso: 1, base: 34 },
    ].filter((f) => f.traccia && f.traccia.children.length);
    if (!fasce.length || menoMovimento()) return;

    const misura = () => fasce.forEach((f) => {
      f.meta = f.traccia.scrollWidth / 2;
    });
    misura();
    fasce.forEach((f, n) => {
      f.x = n ? -f.meta * 0.4 : 0;
    });
    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver(misura);
      fasce.forEach((f) => ro.observe(f.traccia));
    } else {
      window.addEventListener("resize", misura);
    }

    let visibile = false;
    let ultimo = 0;
    let ultimoScroll = window.scrollY;
    let spinta = 0; // px al secondo che si aggiungono, dallo scorrimento
    let direzione = 1; // 1 scorrendo in giù, -1 in su
    let freno = 1;
    let frenoVoluto = 1;

    const fotogramma = (ora) => {
      if (!visibile) {
        ultimo = 0;
        return;
      }
      const dt = ultimo ? Math.min(0.05, (ora - ultimo) / 1000) : 0;
      ultimo = ora;
      const dy = window.scrollY - ultimoScroll;
      ultimoScroll = window.scrollY;
      if (dy) direzione = dy > 0 ? 1 : -1;
      spinta += (Math.max(-80, Math.min(80, dy)) * 14 - spinta) * 0.1;
      freno += (frenoVoluto - freno) * 0.08;
      const piega = Math.max(-8, Math.min(8, spinta / 110));
      fasce.forEach((f) => {
        const v = f.verso * (f.base * freno * direzione + spinta);
        f.x += v * dt;
        if (f.meta > 0) {
          while (f.x <= -f.meta) f.x += f.meta;
          while (f.x > 0) f.x -= f.meta;
        }
        f.traccia.style.transform = `translate3d(${f.x.toFixed(2)}px, 0, 0) skewX(${(piega * -f.verso).toFixed(2)}deg)`;
      });
      requestAnimationFrame(fotogramma);
    };

    // Gira solo quando il nastro è sullo schermo
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((voci) => {
        const ora = voci[voci.length - 1].isIntersecting;
        if (ora && !visibile) {
          visibile = true;
          ultimoScroll = window.scrollY;
          requestAnimationFrame(fotogramma);
        }
        visibile = ora;
      }).observe(nastro);
    } else {
      visibile = true;
      requestAnimationFrame(fotogramma);
    }

    // Col mouse sopra le categorie la fascia rallenta; col tasto Tab si ferma
    // e porta in vista la categoria scelta
    const davanti = fasce.find((f) => f.verso === -1);
    if (!davanti) return;
    davanti.traccia.addEventListener("mouseenter", () => { frenoVoluto = 0.12; });
    davanti.traccia.addEventListener("mouseleave", () => { frenoVoluto = 1; });
    davanti.traccia.addEventListener("focusin", (e) => {
      frenoVoluto = 0;
      freno = 0;
      const a = e.target.closest(".nastro-voce");
      if (a) davanti.x = -Math.max(0, a.offsetLeft - nastro.clientWidth * 0.2);
    });
    davanti.traccia.addEventListener("focusout", () => { frenoVoluto = 1; });
  }

  // Passando col mouse su una categoria compare una piccola tela con le sue opere,
  // che segue il puntatore e si inclina mentre si sposta
  function preparaAnteprimaNastro() {
    if (!conMouse()) return;
    const anteprima = $("#nastro-anteprima");
    const traccia = $("#nastro-traccia");
    if (!anteprima || !traccia) return;
    let attiva = null;
    let timer = null;
    let giro = false;
    let mx = -999, my = -999, x = -999, y = -999;

    const mostra = (o, quante, n) => {
      const media = creaMedia(o, 420, true);
      if (!menoMovimento()) {
        media.classList.add("rivela");
        media.style.setProperty("--durata", "0.6s");
      }
      const quadro = document.createElement("span");
      quadro.className = "nastro-anteprima-quadro";
      const titolo = document.createElement("span");
      titolo.className = "nastro-anteprima-titolo";
      titolo.innerHTML = `<em>${esc(o.titolo)}</em>${quante > 1 ? ` · ${n + 1}/${quante}` : ""}`;
      quadro.append(media, titolo);
      anteprima.replaceChildren(quadro);
    };
    const nascondi = () => {
      attiva = null;
      clearInterval(timer);
      anteprima.classList.remove("visibile");
    };
    const segui = () => {
      if (!anteprima.classList.contains("visibile")) {
        giro = false;
        return;
      }
      const px = x;
      x += (mx - x) * 0.16;
      y += (my - y) * 0.16;
      const inclina = Math.max(-12, Math.min(12, (x - px) * 0.6));
      anteprima.style.setProperty("--ax", `${(x + 28).toFixed(1)}px`);
      anteprima.style.setProperty("--ay", `${(y - anteprima.offsetHeight * 0.55).toFixed(1)}px`);
      anteprima.style.setProperty("--ar", `${inclina.toFixed(2)}deg`);
      requestAnimationFrame(segui);
    };

    traccia.addEventListener("pointermove", (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (x === -999) {
        x = mx;
        y = my;
      }
    }, { passive: true });
    traccia.addEventListener("mouseover", (e) => {
      const a = e.target.closest(".nastro-voce");
      if (!a || a === attiva) return;
      attiva = a;
      const lista = OPERE.filter((o) => o.categoria === a.dataset.categoria).slice(0, 6);
      clearInterval(timer);
      if (!lista.length) {
        anteprima.classList.remove("visibile");
        return;
      }
      let k = 0;
      mostra(lista[0], lista.length, 0);
      if (lista.length > 1) {
        timer = setInterval(() => {
          k = (k + 1) % lista.length;
          mostra(lista[k], lista.length, k);
        }, 1300);
      }
      anteprima.classList.add("visibile");
      if (!giro) {
        giro = true;
        requestAnimationFrame(segui);
      }
    });
    traccia.addEventListener("mouseleave", () => {
      nascondi();
      x = y = -999;
    });
    // cliccando si va alle opere: l'anteprima sparisce subito
    traccia.addEventListener("click", nascondi);
  }

  /* ------------------------------------------------------------------
     10. Provalo nella tua stanza
     Il visitatore carica la foto di una parete (o usa la stanza di
     esempio), sposta e ridimensiona l'opera, sceglie la cornice e può
     metterla in scala con un righello. Tutto avviene nel browser:
     la foto non viene mai inviata da nessuna parte.
     ------------------------------------------------------------------ */
  // Le categorie di opere da appendere: solo queste hanno il pulsante
  const CATEGORIE_DA_PARETE = ["quadri", "stampe"];
  function daParete(o) {
    return !!o && CATEGORIE_DA_PARETE.includes(o.categoria);
  }

  // "90 × 120 cm" vuol dire altezza × base, come nelle didascalie dei musei
  function misureReali(testo) {
    const m = String(testo || "")
      .replace(/,/g, ".")
      .match(/(\d+(?:\.\d+)?)\s*[x×X*]\s*(\d+(?:\.\d+)?)/);
    if (!m) return null;
    const altezza = parseFloat(m[1]);
    const base = parseFloat(m[2]);
    return altezza > 0 && base > 0 ? { altezza, base } : null;
  }
  const cm = (n) => String(Math.round(n * 10) / 10).replace(".", ",");
  const limita = (v, min, max) => Math.min(max, Math.max(min, v));

  const finestraStanza = $("#stanza");
  const statoStanza = {
    opera: null,
    misura: null,
    inScala: false,
    notaScala: "",
    cx: 0.5,
    cy: 0.38,
    larghezza: 0.28, // larghezza dell'opera rispetto alla foto
    cornice: "nera",
    urlCreato: null,
    haFoto: false,
    esempio: false,
    righello: { ax: 0.3, ay: 0.72, bx: 0.7, by: 0.72 },
    origine: null,
  };

  function messaggioStanza(testo) {
    $("#stanza-messaggio").textContent = testo || "";
  }

  function faseStanza(conFoto) {
    $("#stanza-inizio").hidden = conFoto;
    $("#stanza-foto").hidden = !conFoto;
    $("#stanza-comandi").hidden = !conFoto;
    if (!conFoto) mostraRighello(false);
  }

  // Stanza di esempio disegnata qui: parete a calce, pavimento in cotto, divano blu egeo, ulivo e lampada.
  // Il divano è largo 220 cm, così l'opera si mette subito in scala.
  const ESEMPIO = { larghezza: 1600, altezza: 1100, divanoPx: 880, divanoCm: 220 };
  let urlEsempio = "";
  function stanzaDiEsempio() {
    if (urlEsempio) return urlEsempio;
    const c = document.createElement("canvas");
    c.width = ESEMPIO.larghezza;
    c.height = ESEMPIO.altezza;
    const x = c.getContext("2d");
    const rett = (px, py, w, h, r, colore) => {
      x.fillStyle = colore;
      x.beginPath();
      if (x.roundRect) x.roundRect(px, py, w, h, r);
      else x.rect(px, py, w, h);
      x.fill();
    };
    // parete, con la luce di una finestra fuori campo
    let g = x.createLinearGradient(0, 0, 0, 830);
    g.addColorStop(0, "#F0EEE8");
    g.addColorStop(1, "#E0DCD2");
    x.fillStyle = g;
    x.fillRect(0, 0, 1600, 830);
    g = x.createRadialGradient(1300, 120, 40, 1300, 120, 1000);
    g.addColorStop(0, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 1600, 830);
    // battiscopa e pavimento in cotto, con le fughe in prospettiva
    x.fillStyle = "#F7F5F0";
    x.fillRect(0, 810, 1600, 24);
    g = x.createLinearGradient(0, 834, 0, 1100);
    g.addColorStop(0, "#C27A55");
    g.addColorStop(1, "#9E5838");
    x.fillStyle = g;
    x.fillRect(0, 834, 1600, 266);
    x.strokeStyle = "rgba(70,30,15,0.22)";
    x.lineWidth = 2;
    for (let i = 0, y = 852; y < 1100; i++, y += 16 + i * 6) {
      x.beginPath();
      x.moveTo(0, y);
      x.lineTo(1600, y);
      x.stroke();
    }
    for (let i = -14; i <= 14; i++) {
      x.beginPath();
      x.moveTo(800 + i * 70, 834);
      x.lineTo(800 + i * 150, 1100);
      x.stroke();
    }
    // ombra a terra e divano
    x.fillStyle = "rgba(0,0,0,0.16)";
    x.beginPath();
    x.ellipse(800, 846, 480, 24, 0, 0, Math.PI * 2);
    x.fill();
    const sx = 370;
    rett(sx + 30, 590, 800, 200, 30, "#2F5676");
    rett(sx, 700, 860, 140, 28, "#386585");
    rett(sx - 10, 640, 100, 200, 34, "#284B66");
    rett(sx + 770, 640, 100, 200, 34, "#284B66");
    rett(sx + 140, 640, 230, 120, 22, "#D9B25A");
    rett(sx + 490, 640, 230, 120, 22, "#EDE6D6");
    x.fillStyle = "#2E2A26";
    x.fillRect(sx + 40, 838, 16, 22);
    x.fillRect(sx + 804, 838, 16, 22);
    // lampada da terra
    g = x.createRadialGradient(1390, 470, 10, 1390, 520, 280);
    g.addColorStop(0, "rgba(255,238,200,0.4)");
    g.addColorStop(1, "rgba(255,238,200,0)");
    x.fillStyle = g;
    x.fillRect(1100, 300, 580, 540);
    x.strokeStyle = "#2B2B2B";
    x.lineWidth = 6;
    x.beginPath();
    x.moveTo(1390, 834);
    x.lineTo(1390, 470);
    x.stroke();
    x.fillStyle = "#2B2B2B";
    x.beginPath();
    x.ellipse(1390, 836, 60, 10, 0, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = "#F3EEE3";
    x.beginPath();
    x.moveTo(1322, 472);
    x.lineTo(1458, 472);
    x.lineTo(1430, 378);
    x.lineTo(1350, 378);
    x.closePath();
    x.fill();
    // ulivo in un vaso di terracotta
    x.strokeStyle = "#5B4A36";
    x.lineWidth = 9;
    x.beginPath();
    x.moveTo(210, 730);
    x.bezierCurveTo(200, 640, 236, 600, 214, 520);
    x.stroke();
    for (let i = 0; i < 90; i++) {
      const a = i * 2.39996; // l'angolo aureo: le foglie si distribuiscono come in una chioma
      const d = 6 + Math.sqrt(i) * 8.5;
      x.fillStyle = i % 3 ? "#7E8F62" : "#A7B48C";
      x.beginPath();
      x.ellipse(214 + Math.cos(a) * d * 1.35, 540 + Math.sin(a) * d * 0.85, 6, 17, i * 1.7, 0, Math.PI * 2);
      x.fill();
    }
    rett(150, 720, 120, 115, 12, "#B5633C");
    x.fillStyle = "rgba(255,255,255,0.18)";
    x.fillRect(150, 736, 120, 8);
    urlEsempio = c.toDataURL("image/jpeg", 0.9);
    return urlEsempio;
  }

  // Sulla stanza di esempio la scala è nota: l'opera prende subito le sue misure reali
  function scalaEsempio() {
    if (!statoStanza.esempio || !statoStanza.misura) return;
    const pxPerCm = ESEMPIO.divanoPx / ESEMPIO.divanoCm;
    statoStanza.larghezza = limita((statoStanza.misura.base * pxPerCm) / ESEMPIO.larghezza, 0.02, 1.5);
    statoStanza.inScala = true;
    statoStanza.notaScala = "accanto a un divano di 220 cm";
  }

  function impostaSfondoStanza(url, esempio) {
    const sfondo = $("#stanza-sfondo");
    messaggioStanza("");
    const pronta = () => {
      statoStanza.haFoto = true;
      statoStanza.esempio = esempio;
      statoStanza.cx = 0.5;
      statoStanza.cy = esempio ? 0.33 : 0.4;
      statoStanza.larghezza = 0.28;
      statoStanza.inScala = false;
      statoStanza.notaScala = "";
      scalaEsempio();
      faseStanza(true);
      requestAnimationFrame(aggiornaOperaStanza);
    };
    sfondo.onerror = () => messaggioStanza("Questa foto non si può aprire. Prova con una foto JPG o PNG.");
    if (sfondo.getAttribute("src") === url && sfondo.complete && sfondo.naturalWidth) {
      pronta();
    } else {
      sfondo.onload = pronta;
      sfondo.src = url;
    }
  }

  function caricaFotoStanza(file) {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      messaggioStanza("Scegli una foto (JPG o PNG).");
      return;
    }
    if (statoStanza.urlCreato) URL.revokeObjectURL(statoStanza.urlCreato);
    statoStanza.urlCreato = URL.createObjectURL(file);
    impostaSfondoStanza(statoStanza.urlCreato, false);
  }

  function aggiornaOperaStanza() {
    const foto = $("#stanza-foto");
    const opera = $("#stanza-opera");
    const W = foto.clientWidth;
    if (!W) return;
    // la larghezza riguarda il dipinto; la cornice si aggiunge intorno
    const contenuto = statoStanza.larghezza * W;
    const s = statoStanza.cornice === "nessuna" ? 0 : Math.max(2, contenuto * 0.035);
    const p = statoStanza.cornice === "bianca" ? s * 2.2 : 0;
    opera.className = `stanza-opera cornice--${statoStanza.cornice}`;
    opera.style.setProperty("--spessore", `${s}px`);
    opera.style.width = `${contenuto + 2 * (s + p)}px`;
    opera.style.left = `${statoStanza.cx * 100}%`;
    opera.style.top = `${statoStanza.cy * 100}%`;
    $("#stanza-dimensione").value = String(Math.round(statoStanza.larghezza * 100));

    const m = statoStanza.misura;
    const info = $("#stanza-scala-info");
    $("#stanza-scala-btn").hidden = !m;
    if (!m) {
      info.textContent = "Per quest'opera non ci sono misure: regola la dimensione a occhio.";
    } else if (statoStanza.inScala) {
      info.textContent = `In scala: ${cm(m.altezza)} × ${cm(m.base)} cm${statoStanza.notaScala ? `, ${statoStanza.notaScala}` : ""}.`;
    } else {
      info.textContent = `Misure reali ${cm(m.altezza)} × ${cm(m.base)} cm. Ora la dimensione è a occhio.`;
    }
    if (!$("#righello").hidden) disegnaRighello();
  }

  function mostraRighello(attivo) {
    $("#righello").hidden = !attivo;
    $("#stanza-scala-form").hidden = !attivo;
    $("#stanza-scala-btn").textContent = attivo ? "Annulla" : "Metti in scala";
    if (attivo) disegnaRighello();
  }

  function disegnaRighello() {
    const foto = $("#stanza-foto");
    const W = foto.clientWidth;
    const H = foto.clientHeight;
    const g = statoStanza.righello;
    const ax = g.ax * W;
    const ay = g.ay * H;
    const bx = g.bx * W;
    const by = g.by * H;
    const posa = (el, x, y) => {
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    };
    posa($("#righello-a"), ax, ay);
    posa($("#righello-b"), bx, by);
    const linea = $("#righello-linea");
    posa(linea, ax, ay);
    linea.style.width = `${Math.hypot(bx - ax, by - ay)}px`;
    linea.style.transform = `rotate(${Math.atan2(by - ay, bx - ax)}rad)`;
    const etichetta = $("#righello-etichetta");
    posa(etichetta, (ax + bx) / 2, (ay + by) / 2);
    etichetta.textContent = `${$("#stanza-cm").value || "?"} cm`;
  }

  // Rende trascinabile un elemento con mouse o dito
  function trascinabile(el, alMovimento) {
    let attivo = false;
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      attivo = true;
      el.setPointerCapture(e.pointerId);
      alMovimento(e, true);
    });
    el.addEventListener("pointermove", (e) => {
      if (attivo) alMovimento(e, false);
    });
    const fine = () => {
      attivo = false;
    };
    el.addEventListener("pointerup", fine);
    el.addEventListener("pointercancel", fine);
  }

  function apriStanza(o, origine) {
    if (!o) return;
    statoStanza.opera = o;
    statoStanza.origine = origine || null;
    statoStanza.misura = misureReali(o.misure);
    statoStanza.inScala = false;
    statoStanza.notaScala = "";
    messaggioStanza("");
    $("#stanza-nome-opera").innerHTML = `<em>${esc(o.titolo)}</em>${o.misure ? `, ${esc(o.misure)}` : ""}`;
    const img = $("#stanza-opera-img");
    img.alt = o.titolo;
    img.onload = () => aggiornaOperaStanza();
    if (o.immagine) {
      img.src = o.immagine;
    } else {
      const tela = document.createElement("canvas");
      dipingi(tela, o, 900);
      img.src = tela.toDataURL("image/jpeg", 0.9);
    }
    $("#stanza-opera").setAttribute(
      "aria-label",
      `${o.titolo} sulla parete. Trascinala per spostarla; con la tastiera usa le frecce per spostarla e i tasti più e meno per la dimensione.`
    );
    mostraRighello(false);
    faseStanza(statoStanza.haFoto);
    if (statoStanza.haFoto) scalaEsempio();
    if (typeof finestraStanza.showModal === "function") finestraStanza.showModal();
    else finestraStanza.setAttribute("open", "");
    requestAnimationFrame(aggiornaOperaStanza);
  }

  // Unisce foto della stanza, cornice e opera in un'unica immagine da scaricare
  function salvaImmagineStanza() {
    const sfondo = $("#stanza-sfondo");
    const operaImg = $("#stanza-opera-img");
    const opera = $("#stanza-opera");
    const foto = $("#stanza-foto");
    const W = sfondo.naturalWidth;
    const H = sfondo.naturalHeight;
    if (!W || !operaImg.naturalWidth || !foto.clientWidth) return;
    const k = W / foto.clientWidth;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const x = c.getContext("2d");
    x.drawImage(sfondo, 0, 0, W, H);
    const tw = opera.offsetWidth * k;
    const th = opera.offsetHeight * k;
    const px = statoStanza.cx * W - tw / 2;
    const py = statoStanza.cy * H - th / 2;
    const sMostrato = parseFloat(opera.style.getPropertyValue("--spessore")) || 0;
    const s = sMostrato * k;
    const pad = statoStanza.cornice === "bianca" ? s * 2.2 : 0;
    // ombra sul muro
    x.save();
    x.shadowColor = "rgba(0,0,0,0.32)";
    x.shadowBlur = (sMostrato * 4 + 10) * k;
    x.shadowOffsetY = (sMostrato * 1.4 + 3) * k;
    x.fillStyle = "#151515";
    x.fillRect(px, py, tw, th);
    x.restore();
    // cornice
    if (statoStanza.cornice === "oro") {
      const g = x.createLinearGradient(px, py, px + tw, py + th);
      g.addColorStop(0, "#F3D98A");
      g.addColorStop(0.3, "#A8741A");
      g.addColorStop(0.55, "#E6C46C");
      g.addColorStop(0.8, "#8C5F12");
      g.addColorStop(1, "#D9B25A");
      x.fillStyle = g;
      x.fillRect(px, py, tw, th);
    } else if (statoStanza.cornice === "legno") {
      const g = x.createLinearGradient(px, py, px + tw, py + th);
      g.addColorStop(0, "#B08455");
      g.addColorStop(0.35, "#6E4A28");
      g.addColorStop(0.65, "#A27648");
      g.addColorStop(1, "#5C3D21");
      x.fillStyle = g;
      x.fillRect(px, py, tw, th);
    } else if (statoStanza.cornice !== "nessuna") {
      x.fillStyle = statoStanza.cornice === "bianca" ? "#1A1A1A" : "#151515";
      x.fillRect(px, py, tw, th);
    }
    if (statoStanza.cornice === "bianca") {
      x.fillStyle = "#FBFAF6";
      x.fillRect(px + s, py + s, tw - 2 * s, th - 2 * s);
    }
    x.drawImage(operaImg, px + s + pad, py + s + pad, tw - 2 * (s + pad), th - 2 * (s + pad));
    c.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${slug(statoStanza.opera.titolo) || "opera"}-nella-mia-stanza.jpg`;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      },
      "image/jpeg",
      0.92
    );
  }

  function preparaStanza() {
    const foto = $("#stanza-foto");
    $("#scheda-stanza").addEventListener("click", (e) => apriStanza(elenco[indice], e.currentTarget));
    $("#stanza-chiudi").addEventListener("click", () => {
      if (typeof finestraStanza.close === "function") finestraStanza.close();
      else finestraStanza.removeAttribute("open");
    });
    finestraStanza.addEventListener("close", () => {
      if (statoStanza.origine) statoStanza.origine.focus();
    });

    // scelta della foto: dal file, trascinandola o con la stanza di esempio
    $("#stanza-file").addEventListener("change", (e) => {
      caricaFotoStanza(e.target.files[0]);
      e.target.value = "";
    });
    $("#stanza-esempio").addEventListener("click", () => impostaSfondoStanza(stanzaDiEsempio(), true));
    $("#stanza-cambia").addEventListener("click", () => faseStanza(false));
    const area = $("#stanza-area");
    area.addEventListener("dragover", (e) => {
      e.preventDefault();
      area.classList.add("is-sopra");
    });
    area.addEventListener("dragleave", () => area.classList.remove("is-sopra"));
    area.addEventListener("drop", (e) => {
      e.preventDefault();
      area.classList.remove("is-sopra");
      caricaFotoStanza(e.dataTransfer && e.dataTransfer.files[0]);
    });

    // spostare l'opera
    const opera = $("#stanza-opera");
    let inizio = null;
    trascinabile(opera, (e, primo) => {
      const r = foto.getBoundingClientRect();
      if (primo) {
        inizio = { x: e.clientX, y: e.clientY, cx: statoStanza.cx, cy: statoStanza.cy, w: r.width, h: r.height };
        return;
      }
      statoStanza.cx = limita(inizio.cx + (e.clientX - inizio.x) / inizio.w, 0, 1);
      statoStanza.cy = limita(inizio.cy + (e.clientY - inizio.y) / inizio.h, 0, 1);
      aggiornaOperaStanza();
    });
    // ridimensionare dal cerchio nell'angolo
    trascinabile($("#stanza-maniglia"), (e) => {
      const r = foto.getBoundingClientRect();
      const centroX = r.left + statoStanza.cx * r.width;
      const meta = Math.max(8, e.clientX - centroX);
      statoStanza.larghezza = limita((meta * 2 * 0.93) / r.width, 0.03, 1.5);
      statoStanza.inScala = false;
      aggiornaOperaStanza();
    });
    // tastiera: frecce per spostare, + e - per la dimensione
    opera.addEventListener("keydown", (e) => {
      const passo = e.shiftKey ? 0.05 : 0.01;
      let usato = true;
      if (e.key === "ArrowLeft") statoStanza.cx = limita(statoStanza.cx - passo, 0, 1);
      else if (e.key === "ArrowRight") statoStanza.cx = limita(statoStanza.cx + passo, 0, 1);
      else if (e.key === "ArrowUp") statoStanza.cy = limita(statoStanza.cy - passo, 0, 1);
      else if (e.key === "ArrowDown") statoStanza.cy = limita(statoStanza.cy + passo, 0, 1);
      else if (e.key === "+" || e.key === "=") {
        statoStanza.larghezza = limita(statoStanza.larghezza + passo, 0.03, 1.5);
        statoStanza.inScala = false;
      } else if (e.key === "-") {
        statoStanza.larghezza = limita(statoStanza.larghezza - passo, 0.03, 1.5);
        statoStanza.inScala = false;
      } else usato = false;
      if (usato) {
        e.preventDefault();
        aggiornaOperaStanza();
      }
    });
    $("#stanza-dimensione").addEventListener("input", (e) => {
      statoStanza.larghezza = Number(e.target.value) / 100;
      statoStanza.inScala = false;
      aggiornaOperaStanza();
    });
    finestraStanza.querySelectorAll('input[name="cornice"]').forEach((r) =>
      r.addEventListener("change", () => {
        statoStanza.cornice = r.value;
        aggiornaOperaStanza();
      })
    );

    // righello per mettere in scala
    $("#stanza-scala-btn").addEventListener("click", () => mostraRighello($("#righello").hidden));
    const spostaPunto = (lettera) => (e) => {
      const r = foto.getBoundingClientRect();
      statoStanza.righello[`${lettera}x`] = limita((e.clientX - r.left) / r.width, 0, 1);
      statoStanza.righello[`${lettera}y`] = limita((e.clientY - r.top) / r.height, 0, 1);
      disegnaRighello();
    };
    trascinabile($("#righello-a"), spostaPunto("a"));
    trascinabile($("#righello-b"), spostaPunto("b"));
    $("#stanza-cm").addEventListener("input", disegnaRighello);
    $("#stanza-scala-applica").addEventListener("click", () => {
      const lunghezzaCm = parseFloat(String($("#stanza-cm").value).replace(",", "."));
      if (!(lunghezzaCm > 0)) {
        messaggioStanza("Scrivi la lunghezza reale in centimetri.");
        return;
      }
      const W = foto.clientWidth;
      const H = foto.clientHeight;
      const g = statoStanza.righello;
      const lunghezzaPx = Math.hypot((g.bx - g.ax) * W, (g.by - g.ay) * H);
      if (lunghezzaPx < 10) {
        messaggioStanza("Allontana i due pallini del righello.");
        return;
      }
      statoStanza.larghezza = limita((statoStanza.misura.base * (lunghezzaPx / lunghezzaCm)) / W, 0.02, 1.5);
      statoStanza.inScala = true;
      statoStanza.notaScala = "";
      messaggioStanza("");
      mostraRighello(false);
      aggiornaOperaStanza();
    });

    $("#stanza-salva").addEventListener("click", salvaImmagineStanza);
    // dentro un'anteprima incorniciata (come quella di Claude) il browser non lascia scaricare file
    if (window.self !== window.top) $("#stanza-salva").hidden = true;
    window.addEventListener("resize", () => {
      if (finestraStanza.open) aggiornaOperaStanza();
    });
  }

  /* ------------------------------------------------------------------
     9b. Titoli d'oro, alone delle opere, simboli di fondo, orizzonti e stelle
     (gli stili sono nel blocco "EFFETTI A TEMA MITO" di css/style.css).
     ------------------------------------------------------------------ */

  // Il titolo si copre di foglia d'oro: il testo da dorare lo copia il CSS da data-testo
  function preparaTitoliDipinti() {
    document.querySelectorAll(".titolo-sezione").forEach((t) => {
      t.dataset.testo = t.textContent.trim();
    });
  }

  // Il colore dell'alone: la media dei colori più vivi della foto, appena ravvivata
  function coloreOpera(media) {
    try {
      const lato = 20;
      const c = document.createElement("canvas");
      c.width = c.height = lato;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(media, 0, 0, lato, lato);
      const d = ctx.getImageData(0, 0, lato, lato).data;
      let r = 0, g = 0, b = 0, somma = 0;
      for (let k = 0; k < d.length; k += 4) {
        const max = Math.max(d[k], d[k + 1], d[k + 2]);
        const min = Math.min(d[k], d[k + 1], d[k + 2]);
        const vivezza = max ? (max - min) / max : 0;
        const luce = (max + min) / 510;
        const peso = vivezza * vivezza * (1 - Math.abs(luce - 0.55)) + 0.01;
        r += d[k] * peso; g += d[k + 1] * peso; b += d[k + 2] * peso; somma += peso;
      }
      // in tinta-saturazione-luce: il colore resta quello dell'opera, ma acceso come una luce
      const [R, G, B] = [r / somma / 255, g / somma / 255, b / somma / 255];
      const max = Math.max(R, G, B), min = Math.min(R, G, B);
      const s0 = max ? (max - min) / max : 0;
      if (s0 < 0.12) return ""; // opera quasi senza colore (bianco e nero, bronzo, marmo): alone d'oro
      let tintaGradi = 0;
      if (max === R) tintaGradi = ((G - B) / (max - min)) % 6;
      else if (max === G) tintaGradi = (B - R) / (max - min) + 2;
      else tintaGradi = (R - G) / (max - min) + 4;
      tintaGradi = Math.round(((tintaGradi * 60) + 360) % 360);
      const sat = Math.round(Math.min(90, Math.max(62, s0 * 100 + 20)));
      return `hsla(${tintaGradi}, ${sat}%, 58%, 0.42)`;
    } catch (err) {
      return ""; // foto da un altro sito: resta l'alone d'oro
    }
  }

  function preparaAloni() {
    const griglia = $("#opere-griglia");
    if (!griglia) return;
    const accendi = (btn, acceso) => {
      if (acceso && !btn.dataset.alone) {
        const media = btn.querySelector(".media");
        const pronta = media && (media.tagName === "CANVAS" || (media.complete && media.naturalWidth));
        if (pronta) {
          btn.dataset.alone = coloreOpera(media) || "nessuno";
          if (btn.dataset.alone !== "nessuno") btn.style.setProperty("--alone-opera", btn.dataset.alone);
        }
      }
      btn.classList.toggle("is-illuminata", acceso);
    };

    if (conMouse()) {
      griglia.addEventListener("pointerover", (e) => {
        const btn = e.target.closest(".opera-apri");
        if (btn) accendi(btn, true);
      });
      griglia.addEventListener("pointerout", (e) => {
        const btn = e.target.closest(".opera-apri");
        if (btn && !btn.contains(e.relatedTarget)) accendi(btn, false);
      });
      griglia.addEventListener("focusin", (e) => {
        const btn = e.target.closest(".opera-apri");
        if (btn) accendi(btn, true);
      });
      griglia.addEventListener("focusout", (e) => {
        const btn = e.target.closest(".opera-apri");
        if (btn) accendi(btn, false);
      });
      return;
    }

    // Sul telefono si accende l'opera che passa al centro dello schermo
    if (!("IntersectionObserver" in window)) return;
    const osservatore = new IntersectionObserver(
      (voci) => voci.forEach((v) => accendi(v.target, v.isIntersecting)),
      { rootMargin: "-38% 0px -38% 0px" }
    );
    const osservaTutte = () => {
      osservatore.disconnect();
      griglia.querySelectorAll(".opera-apri").forEach((b) => osservatore.observe(b));
    };
    new MutationObserver(osservaTutte).observe(griglia, { childList: true });
    osservaTutte();
  }

  // I simboli di fondo, uno per sezione: il sole di Apollo, l'alloro, l'arco di Artemide, la luna.
  // Si disegnano a filo d'oro quando entrano nello schermo.
  const SIMBOLI = [
    { sezione: "opere", forma: "sole", lato: "destra", rotazione: -8, velocita: 0.16 },
    { sezione: "processo", forma: "alloro", lato: "sinistra", rotazione: 4, velocita: 0.2 },
    { sezione: "eventi", forma: "arco", lato: "destra", rotazione: -16, velocita: 0.14 },
    { sezione: "contatti", forma: "luna", lato: "sinistra", rotazione: 8, velocita: 0.18 },
  ];

  const n2 = (v) => v.toFixed(1);
  // Una foglia appuntita in SVG: dalla base, lunga l, nella direzione t
  function fogliaSvg(x, y, t, l) {
    const fx = x + Math.cos(t) * l;
    const fy = y + Math.sin(t) * l;
    const mx = x + Math.cos(t) * l * 0.5;
    const my = y + Math.sin(t) * l * 0.5;
    const px = -Math.sin(t) * l * 0.24;
    const py = Math.cos(t) * l * 0.24;
    return `<path d="M${n2(x)} ${n2(y)}Q${n2(mx + px)} ${n2(my + py)} ${n2(fx)} ${n2(fy)}Q${n2(mx - px)} ${n2(my - py)} ${n2(x)} ${n2(y)}Z"/>`;
  }

  function disegnoSimbolo(forma) {
    let d = "";
    if (forma === "sole") {
      d += '<circle cx="100" cy="100" r="30"/><circle cx="100" cy="100" r="40"/>';
      for (let i = 0; i < 24; i++) {
        const t = (i / 24) * Math.PI * 2;
        const lungo = i % 2 ? 74 : 96;
        d += `<path d="M${n2(100 + Math.cos(t) * 48)} ${n2(100 + Math.sin(t) * 48)}L${n2(100 + Math.cos(t) * lungo)} ${n2(100 + Math.sin(t) * lungo)}"/>`;
      }
      return d;
    }
    if (forma === "alloro") {
      // due rami che formano una corona aperta in alto
      [-1, 1].forEach((lato) => {
        const da = lato < 0 ? Math.PI * 0.58 : Math.PI * 0.42;
        const a = lato < 0 ? Math.PI * 1.36 : -Math.PI * 0.36;
        const punti = [];
        for (let k = 0; k <= 30; k++) {
          const t = da + ((a - da) * k) / 30;
          punti.push([100 + Math.cos(t) * 72, 104 + Math.sin(t) * 72]);
        }
        d += `<path d="M${punti.map((p) => `${n2(p[0])} ${n2(p[1])}`).join("L")}"/>`;
        for (let k = 2; k <= 30; k += 3) {
          const t = da + ((a - da) * k) / 30;
          const x = 100 + Math.cos(t) * 72;
          const y = 104 + Math.sin(t) * 72;
          const tangente = t + (a > da ? Math.PI / 2 : -Math.PI / 2);
          const l = 22 - k * 0.3;
          d += fogliaSvg(x, y, tangente + 0.55, l) + fogliaSvg(x, y, tangente - 0.55, l);
        }
      });
      return d;
    }
    if (forma === "arco") {
      // l'arco teso con la freccia incoccata
      d += '<path d="M64 16C136 52 136 148 64 184"/>';
      d += '<path d="M64 16L30 100L64 184"/>';
      d += '<path d="M30 100H176"/>';
      d += '<path d="M176 100L160 92L164 100L160 108Z"/>';
      d += '<path d="M42 100L30 90M50 100L38 90M42 100L30 110M50 100L38 110"/>';
      return d;
    }
    // la falce di luna con tre stelle
    d += '<path stroke-width="0.33" transform="translate(-6 -18) scale(3.4)" d="M21.75 16.19A20 20 0 1 1 21.75 47.81A17 17 0 1 0 21.75 16.19Z"/>';
    [[52, 40, 9], [30, 92, 6], [64, 150, 7]].forEach(([x, y, s]) => {
      d += `<path d="M${x} ${y - s}L${x + s * 0.26} ${y - s * 0.26}L${x + s} ${y}L${x + s * 0.26} ${y + s * 0.26}L${x} ${y + s}L${x - s * 0.26} ${y + s * 0.26}L${x - s} ${y}L${x - s * 0.26} ${y - s * 0.26}Z"/>`;
    });
    return d;
  }

  function creaSimboli() {
    SIMBOLI.forEach((c) => {
      const sezione = document.getElementById(c.sezione);
      if (!sezione) return;
      const el = document.createElement("span");
      el.className = `simbolo simbolo--${c.lato}`;
      el.setAttribute("aria-hidden", "true");
      el.setAttribute("data-rivela", "");
      el.style.setProperty("--rot", `${c.rotazione}deg`);
      el.dataset.velocita = String(c.velocita);
      el.innerHTML = `<svg viewBox="0 0 200 200">${disegnoSimbolo(c.forma)}</svg>`;
      el.querySelectorAll("svg > *").forEach((p) => p.setAttribute("pathLength", "1"));
      sezione.append(el);
    });
  }

  // Tutto quello che si muove con lo scorrimento, calcolato una volta per fotogramma
  let aggiornaScorrimento = () => {};

  function preparaScorrimento() {
    const titoli = Array.from(document.querySelectorAll(".titolo-sezione"));
    const simboli = Array.from(document.querySelectorAll(".simbolo"));
    const orizzonti = Array.from(document.querySelectorAll(".orizzonte"));
    const apertura = $(".apertura");
    const testata = $(".testata");
    // le parti della pagina in ordine, ognuna con il suo cielo
    const parti = Array.from(document.querySelectorAll("main > *, .piede")).filter((el) => el.offsetParent !== null || el.tagName === "FOOTER");
    const ridotto = menoMovimento();
    const vicino = (r, h) => r.bottom > -h * 0.5 && r.top < h * 1.5;
    const limita01 = (v) => Math.min(1, Math.max(0, v));

    // La barra prende i colori del cielo che le passa sotto
    const cieloSotto = () => {
      const y = testata.offsetHeight * 0.55;
      for (const el of parti) {
        const r = el.getBoundingClientRect();
        if (r.top > y || r.bottom <= y) continue;
        if (el.classList.contains("orizzonte--tramonto")) return (y - r.top) / r.height < 0.6 ? "giorno" : "tramonto";
        if (el.classList.contains("orizzonte--luna")) return (y - r.top) / r.height < 0.45 ? "tramonto" : "notte";
        return el.dataset.cielo || "giorno";
      }
      return "giorno";
    };
    const coloriBarra = { giorno: "#F1F0EB", tramonto: "#2B1C34", notte: "#0A1023" };
    const metaColore = document.querySelector('meta[name="theme-color"]');

    if (ridotto) {
      titoli.forEach((t) => t.style.setProperty("--luce-titolo", "1"));
      orizzonti.forEach((o) => o.style.setProperty("--p", "0.55"));
    }
    let inAttesa = false;

    aggiornaScorrimento = () => {
      inAttesa = false;
      const cielo = cieloSotto();
      if (testata.dataset.cielo !== cielo) {
        testata.dataset.cielo = cielo;
        if (metaColore) metaColore.setAttribute("content", coloriBarra[cielo]);
      }
      if (ridotto) return;
      const h = window.innerHeight;

      // Il titolo si copre d'oro mentre sale verso il centro
      titoli.forEach((t) => {
        const r = t.getBoundingClientRect();
        if (!vicino(r, h)) return;
        t.style.setProperty("--luce-titolo", limita01((h * 0.95 - r.top) / (h * 0.5)).toFixed(3));
      });

      // I simboli di fondo scorrono più piano della pagina e girano appena
      simboli.forEach((el) => {
        const s = el.parentElement.getBoundingClientRect();
        const centro = s.top + el.offsetTop + el.offsetHeight / 2;
        if (centro < -h || centro > 2 * h) return;
        const deriva = Math.max(-140, Math.min(140, (centro - h / 2) * Number(el.dataset.velocita)));
        el.style.setProperty("--deriva", deriva.toFixed(1));
      });

      // Il sole tramonta e la luna sorge mentre le fasce dell'orizzonte attraversano lo schermo
      orizzonti.forEach((o) => {
        const r = o.getBoundingClientRect();
        if (!vicino(r, h)) return;
        o.style.setProperty("--p", limita01((h - r.top) / (h + r.height)).toFixed(3));
      });

      // Apertura: il sole scende e il nome e l'opera si separano su piani diversi
      if (apertura) {
        const salita = Math.min(window.scrollY, apertura.offsetHeight);
        apertura.style.setProperty("--salita", salita.toFixed(1));
      }
    };

    const chiedi = () => {
      if (!inAttesa) {
        inAttesa = true;
        requestAnimationFrame(aggiornaScorrimento);
      }
    };
    window.addEventListener("scroll", chiedi, { passive: true });
    window.addEventListener("resize", chiedi);
    aggiornaScorrimento();
  }

  // Il cielo del piè di pagina: stelle che brillano, la Lira di Apollo e l'Orsa
  // Maggiore di Artemide che si disegnano quando il piè di pagina entra nello
  // schermo, e ogni tanto una stella cadente
  const COSTELLAZIONI = [
    {
      nome: "Lira · Apollo",
      x: 0.58, y: 0.12, larghezza: 0.08, altezza: 0.42,
      stelle: [[0.45, 0, 1.6], [0.66, 0.1, 0.8], [0.4, 0.3, 0.9], [0.68, 0.36, 0.9], [0.62, 0.86, 1], [0.32, 0.8, 1]],
      linee: [[0, 1], [0, 2], [1, 2], [2, 3], [3, 4], [4, 5], [5, 2]],
    },
    {
      nome: "Orsa Maggiore · Artemide",
      x: 0.72, y: 0.08, larghezza: 0.23, altezza: 0.34,
      stelle: [[0, 0.16, 1], [0.18, 0.04, 1], [0.34, 0.12, 0.9], [0.48, 0.24, 0.8], [0.52, 0.62, 0.9], [0.86, 0.68, 1], [0.9, 0.3, 1.2]],
      linee: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]],
    },
  ];

  function preparaStelle() {
    const tela = $("#piede-cielo");
    if (!tela) return;
    const piede = tela.parentElement;
    const ctx = tela.getContext("2d");
    const ridotto = menoMovimento();
    let W = 0;
    let H = 0;
    let stelle = [];
    let visibile = false;
    let inizio = 0;
    let cadente = null;
    let prossima = 0;
    let gira = false;
    const font = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "Georgia, serif";

    const dimensiona = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = piede.clientWidth;
      H = piede.clientHeight;
      tela.width = Math.round(W * dpr);
      tela.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const r = generatore(77);
      stelle = [];
      const quante = Math.round((W * H) / 3200);
      for (let i = 0; i < quante; i++) {
        stelle.push({ x: r() * W, y: r() * H, s: 0.4 + r() * (r() > 0.9 ? 1.6 : 0.8), a: 0.3 + r() * 0.6, v: 0.6 + r() * 2, f: r() * 6, oro: r() < 0.15 });
      }
      if (ridotto || !gira) disegna(performance.now());
    };

    const posizione = (c, p) => [
      (c.x + c.larghezza * p[0]) * W,
      (c.y + c.altezza * p[1]) * Math.min(H, W * 0.6),
    ];

    function disegna(ora) {
      ctx.clearRect(0, 0, W, H);
      const t = ora / 1000;
      // le stelle di fondo
      stelle.forEach((s) => {
        ctx.globalAlpha = ridotto ? s.a : s.a * (0.55 + 0.45 * Math.sin(t * s.v + s.f));
        ctx.fillStyle = s.oro ? "#F6E3B0" : "#E6ECF8";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2);
        ctx.fill();
      });
      // le costellazioni: le linee si tracciano una dopo l'altra
      const p = ridotto ? 1 : inizio ? Math.min(1, (ora - inizio) / 2600) : 0;
      COSTELLAZIONI.forEach((c, ci) => {
        const quota = Math.min(1, Math.max(0, p * 1.4 - ci * 0.3));
        ctx.save();
        ctx.strokeStyle = "rgba(230, 196, 108, 0.55)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        c.linee.forEach(([a, b], i) => {
          const k = Math.min(1, Math.max(0, quota * c.linee.length - i));
          if (!k) return;
          const A = posizione(c, c.stelle[a]);
          const B = posizione(c, c.stelle[b]);
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.moveTo(A[0], A[1]);
          ctx.lineTo(A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k);
          ctx.stroke();
        });
        ctx.restore();
        c.stelle.forEach((s) => {
          const [x, y] = posizione(c, s);
          const luce = quota > 0 ? 1 : 0.5;
          const alone = ctx.createRadialGradient(x, y, 0, x, y, 9 * s[2]);
          alone.addColorStop(0, `rgba(246, 227, 176, ${0.5 * luce})`);
          alone.addColorStop(1, "rgba(246, 227, 176, 0)");
          ctx.globalAlpha = 1;
          ctx.fillStyle = alone;
          ctx.beginPath();
          ctx.arc(x, y, 9 * s[2], 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#FFF6DA";
          stella(ctx, x, y, 3.2 * s[2] * (ridotto ? 1 : 0.85 + 0.15 * Math.sin(t * 2 + x)), 4, 0.24);
          ctx.fill();
        });
        if (quota > 0.6) {
          const [x, y] = posizione(c, [0, 1.05]);
          ctx.globalAlpha = Math.min(1, (quota - 0.6) * 2.5) * 0.75;
          ctx.fillStyle = "#C3CEDF";
          ctx.font = `0.72rem ${font}`;
          ctx.fillText(c.nome.toUpperCase(), x, y + 22);
        }
      });
      // la stella cadente
      if (!ridotto) {
        if (!cadente && ora > prossima && inizio) {
          cadente = { x: W * (0.2 + Math.random() * 0.6), y: H * (0.05 + Math.random() * 0.3), inizio: ora, ang: Math.PI * (0.12 + Math.random() * 0.1) };
        }
        if (cadente) {
          const k = (ora - cadente.inizio) / 900;
          if (k >= 1) {
            cadente = null;
            prossima = ora + 4000 + Math.random() * 6000;
          } else {
            const l = 160;
            const x = cadente.x + Math.cos(cadente.ang) * l * 2 * k;
            const y = cadente.y + Math.sin(cadente.ang) * l * 2 * k;
            const g = ctx.createLinearGradient(x, y, x - Math.cos(cadente.ang) * l, y - Math.sin(cadente.ang) * l);
            g.addColorStop(0, "rgba(255, 246, 218, 0.95)");
            g.addColorStop(1, "rgba(255, 246, 218, 0)");
            ctx.globalAlpha = Math.sin(k * Math.PI);
            ctx.strokeStyle = g;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - Math.cos(cadente.ang) * l, y - Math.sin(cadente.ang) * l);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    const fotogramma = (ora) => {
      if (!visibile) {
        gira = false;
        return;
      }
      disegna(ora);
      requestAnimationFrame(fotogramma);
    };

    dimensiona();
    if ("ResizeObserver" in window) new ResizeObserver(dimensiona).observe(piede);
    else window.addEventListener("resize", dimensiona);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => disegna(performance.now()));
    if (ridotto) return;

    if ("IntersectionObserver" in window) {
      new IntersectionObserver((voci) => {
        visibile = voci[voci.length - 1].isIntersecting;
        if (visibile) {
          if (!inizio) {
            inizio = performance.now();
            prossima = inizio + 2500;
          }
          if (!gira) {
            gira = true;
            requestAnimationFrame(fotogramma);
          }
        }
      }).observe(piede);
    } else {
      visibile = true;
      inizio = performance.now();
      gira = true;
      requestAnimationFrame(fotogramma);
    }
  }

  /* ------------------------------------------------------------------
     11. Mi piace e visualizzazioni
     Ogni visitatore può mettere "mi piace" alle opere: il suo cuore resta
     pieno anche quando torna (lo ricorda il suo browser). Se nel pannello
     sono compilati i due campi Firebase (Presentazione e contatti), i "mi
     piace" di tutti vengono contati e il numero compare accanto al cuore;
     in più si contano le visualizzazioni: ogni volta che qualcuno apre la
     scheda di un'opera (una sola volta per visita), con un occhio accanto.
     ------------------------------------------------------------------ */
  const CUORE =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.3C6.9 16.5 3.2 13.3 3.2 9.1c0-2.7 2.1-4.8 4.7-4.8 1.7 0 3.2.9 4.1 2.3.9-1.4 2.4-2.3 4.1-2.3 2.6 0 4.7 2.1 4.7 4.8 0 4.2-3.7 7.4-8.8 11.2z"/></svg>';
  const OCCHIO =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3.2"/></svg>';

  // Il nome dell'opera come lo salva Firebase: lettere minuscole, numeri e trattini
  const chiaveOpera = (id) => String(id || "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 80) || "opera";

  // Il collegamento con il database Firestore di Firebase, comune a mi piace e visualizzazioni
  const Firebase = (() => {
    let db = null; // { progetto, chiave }
    // toglie spazi e virgolette incollati per sbaglio nel pannello
    const pulito = (v) => String(v || "").trim().replace(/^["'\s]+|["'\s,;]+$/g, "");
    const radice = () =>
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(db.progetto)}/databases/(default)/documents`;
    const numero = (campo) => Math.max(0, Number(campo && (campo.integerValue ?? campo.doubleValue)) || 0);

    // Un errore con il codice e il messaggio di Firebase, per capire cosa non va dalla console
    async function errore(r, cosa) {
      let messaggio = "";
      try {
        const j = await r.json();
        messaggio = (j && j.error && (j.error.message || j.error.status)) || "";
      } catch (e) {
        /* risposta senza testo */
      }
      const err = new Error(`${cosa}: errore ${r.status}${messaggio ? ` – ${messaggio}` : ""}`);
      err.stato = r.status;
      return err;
    }

    function configura(config) {
      const progetto = pulito(config && config.progetto);
      const chiave = pulito(config && config.chiave);
      db = progetto && chiave ? { progetto, chiave } : null;
      return !!db;
    }

    // Tutti i contatori di una raccolta ("like" o "visite"): { opera: numero }
    async function leggi(raccolta) {
      const conti = {};
      let pagina = "";
      do {
        const url = `${radice()}/${raccolta}?pageSize=300&key=${encodeURIComponent(db.chiave)}${pagina ? `&pageToken=${encodeURIComponent(pagina)}` : ""}`;
        const r = await fetch(url);
        if (!r.ok) throw await errore(r, `lettura di "${raccolta}"`);
        const dati = await r.json();
        (dati.documents || []).forEach((d) => {
          conti[decodeURIComponent(d.name.split("/").pop())] = numero(d.fields && d.fields.n);
        });
        pagina = dati.nextPageToken || "";
      } while (pagina);
      return conti;
    }

    // Aggiunge (passo 1) o toglie (passo -1) uno al contatore e restituisce il totale aggiornato
    async function incrementa(raccolta, id, passo) {
      const r = await fetch(`${radice()}:commit?key=${encodeURIComponent(db.chiave)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          writes: [
            {
              update: { name: `projects/${db.progetto}/databases/(default)/documents/${raccolta}/${id}`, fields: {} },
              updateMask: { fieldPaths: [] },
              updateTransforms: [{ fieldPath: "n", increment: { integerValue: String(passo) } }],
            },
          ],
        }),
      });
      if (!r.ok) throw await errore(r, `invio a "${raccolta}"`);
      const dati = await r.json();
      const ris = dati.writeResults && dati.writeResults[0] && dati.writeResults[0].transformResults;
      return ris && ris[0] ? numero(ris[0]) : null;
    }

    return { configura, attivo: () => !!db, leggi, incrementa };
  })();

  const leggiLocale = (k, riserva, archivio) => {
    try {
      const v = JSON.parse((archivio || window.localStorage).getItem(k));
      return v == null ? riserva : v;
    } catch (e) {
      return riserva;
    }
  };
  const scriviLocale = (k, v, archivio) => {
    try {
      (archivio || window.localStorage).setItem(k, JSON.stringify(v));
    } catch (e) {
      /* browser in incognito o con i dati bloccati: vale solo per questa visita */
    }
  };
  const elencoChiavi = (v) => (Array.isArray(v) ? v.map(chiaveOpera) : []);

  const Piace = (() => {
    const CHIAVE = "mi-piace"; // le opere a cui questo visitatore ha messo il cuore
    const CHIAVE_CONTATE = "mi-piace-contati"; // quelle già contate su Firebase da questo browser
    const mie = new Set(elencoChiavi(leggiLocale(CHIAVE, [])));
    const contate = new Set(elencoChiavi(leggiLocale(CHIAVE_CONTATE, [])));
    try {
      localStorage.removeItem("mi-piace-da-inviare"); // usato dalla prima versione
    } catch (e) {
      /* niente */
    }
    let conteggi = {};
    let acceso = false; // il conteggio condiviso funziona
    let timer = null;
    let inCorso = false;
    let ancora = false;

    // +1 se il cuore c'è ma Firebase non lo sa ancora, -1 se è stato tolto, 0 se è tutto in pari
    const differenza = (k) => (mie.has(k) ? 1 : 0) - (contate.has(k) ? 1 : 0);
    const daInviare = () => Array.from(new Set([...mie, ...contate])).filter((k) => differenza(k) !== 0);

    // Mette in pari Firebase con i cuori di questo browser
    // (anche quelli messi senza rete o prima che il conteggio fosse attivo)
    async function svuota() {
      if (!acceso) return;
      if (inCorso) {
        ancora = true;
        return;
      }
      inCorso = true;
      try {
        for (const k of daInviare()) {
          const passo = differenza(k);
          if (!passo) continue;
          try {
            const n = await Firebase.incrementa("like", k, passo);
            if (n !== null) conteggi[k] = n;
            if (passo > 0) contate.add(k);
            else contate.delete(k);
          } catch (e) {
            const definitivo = e.stato >= 400 && e.stato < 500 && e.stato !== 408 && e.stato !== 429;
            console.warn(`Mi piace: "${k}" non inviato.`, e.message);
            if (!definitivo) break; // niente rete: si riprova alla prossima occasione
            // Firebase ha detto di no (per esempio togliere un cuore mai contato): non insistere
            if (passo > 0) contate.add(k);
            else contate.delete(k);
          }
        }
      } finally {
        inCorso = false;
        scriviLocale(CHIAVE_CONTATE, Array.from(contate));
        aggiornaTutti();
        if (ancora) {
          ancora = false;
          clearTimeout(timer);
          timer = setTimeout(svuota, 300);
        }
      }
    }

    const quanti = (id) => {
      if (!acceso) return 0;
      const k = chiaveOpera(id);
      return Math.max(0, (conteggi[k] || 0) + differenza(k));
    };

    function aggiornaBottone(b) {
      const k = chiaveOpera(b.dataset.piace);
      const n = quanti(k);
      b.setAttribute("aria-pressed", String(mie.has(k)));
      const c = b.querySelector(".piace-conta");
      if (c) c.textContent = n ? String(n) : "";
      b.setAttribute("aria-label", etichettaPiace(b.dataset.titolo, n));
    }
    function aggiornaTutti() {
      document.querySelectorAll(".piace[data-piace]").forEach(aggiornaBottone);
    }

    function cambia(id) {
      const k = chiaveOpera(id);
      const piace = !mie.has(k);
      if (piace) mie.add(k);
      else mie.delete(k);
      scriviLocale(CHIAVE, Array.from(mie));
      if (acceso) {
        clearTimeout(timer);
        timer = setTimeout(svuota, 700); // chi cambia idea in fretta non manda niente
      }
      aggiornaTutti();
      return piace;
    }

    async function avvia() {
      aggiornaTutti();
      if (!Firebase.attivo()) return;
      try {
        conteggi = await Firebase.leggi("like");
        acceso = true;
        aggiornaTutti();
        svuota();
      } catch (e) {
        console.warn("Mi piace: conteggio non disponibile, controlla i campi Firebase nel pannello.", e.message);
      }
    }

    return { avvia, cambia, mia: (id) => mie.has(chiaveOpera(id)), quanti, aggiornaTutti };
  })();

  // Le visualizzazioni: si conta l'apertura della scheda di un'opera, una volta per visita
  const Visite = (() => {
    const CHIAVE_SESSIONE = "opere-viste"; // le opere già contate in questa visita
    const sessione = (() => {
      try {
        return window.sessionStorage;
      } catch (e) {
        return null;
      }
    })();
    const viste = new Set(sessione ? elencoChiavi(leggiLocale(CHIAVE_SESSIONE, [], sessione)) : []);
    let conteggi = {};
    let acceso = false;
    const inAttesa = []; // opere aperte prima che i conteggi fossero letti

    const quante = (id) => (acceso ? conteggi[chiaveOpera(id)] || 0 : 0);

    function aggiornaTutti() {
      document.querySelectorAll(".viste[data-viste]").forEach((el) => {
        const n = quante(el.dataset.viste);
        el.hidden = !n;
        const c = el.querySelector(".viste-n");
        if (c) c.textContent = String(n);
        const t = el.querySelector(".viste-testo");
        if (t) t.textContent = n === 1 ? " visualizzazione" : " visualizzazioni";
      });
    }

    async function conta(id) {
      const k = chiaveOpera(id);
      if (viste.has(k)) return;
      if (!acceso) {
        if (Firebase.attivo() && !inAttesa.includes(k)) inAttesa.push(k);
        return;
      }
      viste.add(k);
      if (sessione) scriviLocale(CHIAVE_SESSIONE, Array.from(viste), sessione);
      conteggi[k] = (conteggi[k] || 0) + 1; // si vede subito, poi arriva il numero vero
      aggiornaTutti();
      try {
        const n = await Firebase.incrementa("visite", k, 1);
        if (n !== null) conteggi[k] = n;
      } catch (e) {
        console.warn(`Visualizzazioni: "${k}" non inviata.`, e.message);
      }
      aggiornaTutti();
    }

    async function avvia() {
      if (!Firebase.attivo()) return;
      try {
        conteggi = await Firebase.leggi("visite");
        acceso = true;
        aggiornaTutti();
        inAttesa.splice(0).forEach(conta);
      } catch (e) {
        console.warn("Visualizzazioni: conteggio non disponibile, controlla le regole di Firebase.", e.message);
      }
    }

    return { avvia, conta, quante, aggiornaTutti };
  })();

  function visteHTML(o, grande) {
    const n = Visite.quante(o.id);
    return (
      `<span class="viste${grande ? " viste--grande" : ""}" data-viste="${esc(o.id)}"${n ? "" : " hidden"}>` +
      `${OCCHIO}<span class="viste-n">${n}</span><span class="viste-testo${grande ? "" : " visually-hidden"}"> ${n === 1 ? "visualizzazione" : "visualizzazioni"}</span></span>`
    );
  }

  function etichettaPiace(titolo, n) {
    return `Mi piace: ${titolo || "opera"}${n ? `, ${n} ${n === 1 ? "persona" : "persone"}` : ""}`;
  }

  function bottonePiace(o, grande) {
    const n = Piace.quanti(o.id);
    return (
      `<button type="button" class="piace${grande ? " piace--grande" : ""}" data-piace="${esc(o.id)}" data-titolo="${esc(o.titolo)}" aria-pressed="${Piace.mia(o.id)}" aria-label="${esc(etichettaPiace(o.titolo, n))}">` +
      `<span class="piace-cuore"><span class="piace-vuoto">${CUORE}</span><span class="piace-pieno">${CUORE}</span></span>` +
      (grande ? '<span class="piace-testo">Mi piace</span>' : "") +
      `<span class="piace-conta">${n || ""}</span></button>`
    );
  }

  // Scintille d'oro e d'argento che saltano via dal cuore
  function schizzi(contenitore, quanti, distanza) {
    if (menoMovimento()) return;
    const colori = ["var(--oro-chiaro)", "var(--argento)", "var(--oro)", "#FFF2C8"];
    for (let i = 0; i < quanti; i++) {
      const g = document.createElement("i");
      g.className = "goccia";
      g.style.setProperty("--a", `${(360 / quanti) * i + Math.random() * 24 - 12}deg`);
      g.style.setProperty("--d", `${distanza * (0.75 + Math.random() * 0.6)}px`);
      g.style.setProperty("--s", `${(distanza / 6) * (0.6 + Math.random() * 0.8)}px`);
      g.style.setProperty("--c", colori[i % colori.length]);
      g.addEventListener("animationend", () => g.remove());
      contenitore.append(g);
    }
  }

  function sboccia(b) {
    if (menoMovimento()) return;
    b.classList.remove("sboccia");
    void b.offsetWidth;
    b.classList.add("sboccia");
    schizzi(b.querySelector(".piace-cuore"), 9, b.classList.contains("piace--grande") ? 26 : 22);
  }

  function preparaPiace() {
    document.addEventListener("click", (e) => {
      const b = e.target.closest(".piace[data-piace]");
      if (!b) return;
      if (Piace.cambia(b.dataset.piace)) sboccia(b);
    });

    // Nella scheda: doppio clic (o doppio tocco) sull'opera per mettere mi piace
    const area = $("#scheda-media");
    if (!area) return;
    area.addEventListener("dblclick", (e) => {
      const b = $("#scheda-piace .piace");
      if (!b || !e.target.closest(".media")) return;
      e.preventDefault();
      if (!Piace.mia(b.dataset.piace)) {
        Piace.cambia(b.dataset.piace);
        sboccia(b);
      }
      if (menoMovimento()) return;
      // la lente si fa da parte mentre compare il cuore
      if (lente) {
        lente.classList.add("in-pausa");
        clearTimeout(lente._pausa);
        lente._pausa = setTimeout(() => lente.classList.remove("in-pausa"), 1100);
      }
      const r = area.getBoundingClientRect();
      const cuore = document.createElement("span");
      cuore.className = "cuore-grande";
      cuore.innerHTML = CUORE;
      cuore.style.left = `${e.clientX - r.left}px`;
      cuore.style.top = `${e.clientY - r.top}px`;
      cuore.addEventListener("animationend", (ev) => {
        if (ev.target === cuore) cuore.remove();
      });
      area.append(cuore);
      schizzi(cuore, 12, 70);
    });
  }

  /* ------------------------------------------------------------------
     8. Avvio
     ------------------------------------------------------------------ */
  async function avvia() {
    const radice = document.documentElement;
    radice.classList.add("js-pronto");

    // Apertura: alla prima visita l'alba, poi il nome inciso lettera per lettera
    preparaLoghi();
    preparaNome();
    const avviaApertura = () => {
      radice.classList.add("apertura-pronta");
      disegnaFirma(900);
    };
    let segnalaPronto = () => {};
    const pronto = new Promise((risolvi) => {
      segnalaPronto = risolvi;
    });
    if (radice.classList.contains("js-sipario")) {
      try {
        sessionStorage.setItem("alba-vista", "1");
      } catch (e) {
        /* nessun problema: l'alba tornerà alla prossima visita */
      }
      Cielo.sipario(avviaApertura, pronto);
    } else {
      avviaApertura();
    }

    // Queste parti non dipendono dai contenuti
    preparaScheda();
    preparaStanza();
    preparaMenu();
    preparaNavigazione();
    preparaSezioneCorrente();
    preparaProgresso();
    preparaCursore();
    preparaInclinazione();
    preparaPiace();
    preparaTitoliDipinti();
    creaSimboli();
    preparaAloni();
    preparaScorrimento();
    preparaStelle();
    $("#anno").textContent = String(new Date().getFullYear());

    try {
      await caricaContenuti();
    } catch (errore) {
      costruisciSottomenu();
      costruisciFiltri();
      mostraErroreContenuti(errore);
      osservaRivelazioni();
      segnalaPronto();
      return;
    }

    if (CONTATTI.presentazione) $(".presentazione").textContent = CONTATTI.presentazione;
    costruisciSottomenu();
    costruisciFiltri();
    costruisciEvidenza();
    costruisciNastro();
    costruisciEventi();
    costruisciContatti();
    costruisciProcesso();
    preparaPolvere();
    requestAnimationFrame(() => aggiornaScorrimento());
    // i mi piace e le visualizzazioni di tutti, se nel pannello è collegato Firebase
    Firebase.configura({ progetto: CONTATTI.firebaseProgetto, chiave: CONTATTI.firebaseChiave });
    Piace.avvia();
    Visite.avvia();

    // Il bottone "Mostra tutte le opere" nella griglia vuota
    $("#opere-griglia").addEventListener("click", (e) => {
      const b = e.target.closest(".link-bottone[data-categoria]");
      if (b) impostaFiltro(b.dataset.categoria);
    });

    // Un indirizzo come pagina.html#ceramica apre già filtrato
    const h = decodeURIComponent(location.hash.slice(1));
    if (NOMI_CATEGORIE[h]) {
      impostaFiltro(h, "nessuno");
      $("#opere").scrollIntoView();
    } else {
      disegnaGriglia();
    }
    osservaRivelazioni();

    // l'alba si apre quando anche la foto dell'opera in apertura è pronta
    const fotoApertura = $("#evidenza img");
    if (fotoApertura && !fotoApertura.complete) {
      fotoApertura.addEventListener("load", segnalaPronto, { once: true });
      fotoApertura.addEventListener("error", segnalaPronto, { once: true });
    } else {
      segnalaPronto();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", avvia);
  else avvia();
})();
