# Apollo Artemis Studio — sito vetrina

Sito statico in HTML, CSS e JavaScript, pubblicato con GitHub Pages e gestito con Pages CMS.
Funziona come il sito di Marco De Chiara: stesse sezioni e stesso pannello, a tema mito greco.
Scorrendo, la pagina passa dal giorno di Apollo (marmo e oro) al tramonto e alla notte di Artemide (blu notte, argento e stelle).

## Cartelle

```
index.html          la pagina
css/style.css       colori, caratteri e animazioni (tutti i colori sono in :root, in cima)
js/categorie.js     le categorie delle opere (menu, filtri, fregio)
js/script.js        il comportamento della pagina: non serve toccarlo
contenuti/          opere, video, eventi e contatti (si modificano dal pannello)
img/                le foto delle opere caricate dal pannello
video/              i video caricati dal pannello
marmo.webp          la trama del marmo di fondo
stelle.webp         il cielo stellato delle sezioni di notte
.pages.yml          la configurazione del pannello Pages CMS
```

## Provarlo sul computer

Apri la cartella in Visual Studio Code, tasto destro su `index.html` → **Open with Live Server**.
Con il doppio clic sul file il browser non legge la cartella `contenuti` e le opere non compaiono.

## Metterlo online (GitHub Pages)

1. Crea un nuovo repository su GitHub (per esempio `apollo-artemis-studio`) e carica tutti i file, compreso `.pages.yml` (è nascosto: su Mac mostralo con Cmd + Maiusc + punto).
2. Nel repository: **Settings → Pages → Build and deployment → Deploy from a branch**, ramo `main`, cartella `/ (root)`.
3. Dopo un paio di minuti il sito è su `https://NOME-UTENTE.github.io/apollo-artemis-studio/`.

## Collegare il pannello (Pages CMS)

1. Vai su app.pagescms.org, entra con GitHub e scegli il repository.
2. A sinistra trovi **Opere**, **Processo creativo (video)**, **Eventi** e **Presentazione e contatti**.
3. Ogni salvataggio aggiorna il sito da solo in un paio di minuti.
4. Per far gestire il sito allo studio, aggiungi il loro account GitHub come collaboratore del repository (Settings → Collaborators).

## Cosa sostituire subito

Tutti i contenuti di adesso sono **esempi**:

- **Presentazione e contatti**: email (`studio@esempio.it`), profili Instagram e TikTok (`profilo.dello.studio`).
- **Opere**: le 16 opere di esempio hanno un segnaposto disegnato al posto della foto. Caricando la foto vera dal pannello, il segnaposto sparisce.
- **Eventi**: date e luoghi inventati.
- **Processo creativo**: un video di prova (`video/esempio.mp4`) e due link generici a Instagram e TikTok.

## Cambiare colori, caratteri e categorie

Quando cambi `css/style.css` o i file in `js/`, aumenta di uno il numero dopo `?v=` nelle tre righe che li caricano in `index.html` (per esempio da `?v=3` a `?v=4`): così i browser che hanno già visto il sito scaricano subito la versione nuova invece di usare quella vecchia salvata.

- Colori e caratteri: in cima a `css/style.css`, nel blocco `:root`. I tre cieli (giorno, tramonto, notte) hanno ciascuno il proprio blocco subito sotto.
- Categorie: `js/categorie.js`. Se ne aggiungi o rinomini una, cambia anche l'elenco del campo "Categoria" in `.pages.yml`.
- Collezioni: dentro **Quadri** c'è il sottogruppo **Collezioni**. Nel pannello, sul quadro, scrivi il nome della collezione nel campo "Collezione" (uguale per tutti i quadri della stessa serie): il quadro resta tra i Quadri e compare anche in Collezioni, raggruppato con gli altri della stessa collezione.
- Quadri e stampe hanno il pulsante **Provalo nella tua stanza** (le categorie sono in `CATEGORIE_DA_PARETE` dentro `js/script.js`).

## "Mi piace" e visualizzazioni di tutti i visitatori (facoltativo)

Senza configurazione ogni visitatore vede solo i propri cuori.
Per contare i "mi piace" e le visualizzazioni di tutti serve un progetto Firebase con Firestore, come per il sito di Marco:

1. Crea un progetto su console.firebase.google.com, attiva **Firestore Database** e usa le stesse regole di sicurezza del sito di Marco (raccolte `like` e `visite`, un campo numerico `n` per ogni opera).
2. In **Impostazioni progetto** copia l'**ID progetto** e la **chiave API web**.
3. Incollali nel pannello, in **Presentazione e contatti**.

## Il logo

Il logo dello studio è ridisegnato in vettoriale dentro `index.html` (nella barra, `<svg class="logo marchio-logo">`): lo script lo copia nell'alba, nell'apertura e nel piè di pagina.
I colori oro e argento sono i gradienti `logo-oro`, `logo-argento` e `logo-luna` in cima a `index.html`.

## Animazioni

- Alla prima visita della sessione: l'alba. Il logo si disegna (i fili della A, l'oro e l'argento, il mirino, la luna che arriva, il sole che sorge, i puntini), poi si apre un anello di luce.
- Il logo: luce che scorre sull'oro e sull'argento, puntini che brillano, la luna che oscilla al passaggio del mouse nella barra.
- Tra una sezione e l'altra: l'eclissi (un disco di notte bordato d'oro parte dal punto cliccato).
- Nell'apertura: il nome inciso lettera per lettera e la polvere d'oro che segue il mouse.
- Scorrendo: i titoli si coprono d'oro, il sole tramonta sul mare, sorge la luna, in fondo si disegnano la Lira e l'Orsa Maggiore.
- Chi nel sistema ha scelto "riduci movimento" vede il sito senza animazioni.
