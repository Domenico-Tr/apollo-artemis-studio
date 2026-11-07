/* =====================================================================
   CATEGORIE DELLE OPERE
   Opere, eventi e contatti stanno nella cartella "contenuti"
   e si modificano dal pannello di gestione (vedi README).

   Qui ci sono solo le categorie del menu, dei filtri e del fregio, in ordine,
   con i loro eventuali sottogruppi (come "Collezioni" dentro "Quadri").
   Se ne aggiungi o rinomini una, fai la stessa modifica anche
   nel file .pages.yml (campo "categoria"), così il pannello la propone.
   ===================================================================== */
const CATEGORIE = [
  {
    id: "quadri",
    nome: "Quadri",
    // Sottogruppo: i quadri che nel pannello hanno il campo "Collezione" compilato,
    // mostrati raggruppati per collezione
    sottogruppi: [{ id: "collezioni", nome: "Collezioni", etichetta: "Collezione", campo: "collezione" }],
  },
  { id: "stampe", nome: "Stampe" },
  { id: "ceramica", nome: "Ceramica" },
  { id: "accessori", nome: "Accessori artistici" },
  { id: "altro", nome: "Altro" },
];
