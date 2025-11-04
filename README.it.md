# 📘 **Comics Magic Translator — Guida Utente**

---

## 🎯 **Scopo dell'applicazione**

**Comics Magic Translator** è uno strumento **semi-automatico** progettato per assistere e velocizzare il processo di traduzione di fumetti, manga e webtoon (*scanlation*).

🔹 **Obiettivo principale:**  
Non sostituire il traduttore o il typesetter, ma automatizzare le fasi più ripetitive e laboriose, offrendo strumenti integrati e intelligenti per migliorare produttività e precisione.

---

### ⚙️ **Funzionalità principali**

| Funzione | Descrizione |
|:--|:--|
| 🧠 **Estrazione del Testo (OCR)** | Riconosce e cattura il testo originale direttamente dalle immagini, anche da balloon o aree irregolari. |
| 🧹 **Pulizia dello Sfondo (Inpainting)** | Rimuove il testo originale ricostruendo automaticamente lo sfondo sottostante. |
| 🌐 **Traduzione AI (Gemini)** | Traduce il testo in modo rapido e contestuale usando l’API di Google Gemini, anche per più lingue contemporaneamente. |
| 🖋️ **Typesetting e Formattazione** | Applica stili personalizzati (font, colore, dimensione, contorno) e posiziona il testo tradotto perfettamente nella vignetta. |
| 🎨 **Ritocco Manuale** | Offre strumenti di disegno, pennelli e gomme per correzioni e rifiniture precise. |

💡 *L’unione di queste funzioni in un’unica interfaccia riduce drasticamente il tempo di lavoro, mantenendo pieno controllo sulla qualità del risultato finale.*

---

## 🔄 **Panoramica del flusso di lavoro**

Il processo di traduzione si articola in **due modalità principali**, pensate per soddisfare esigenze diverse:

1. ⚡ **Workflow Automatico** — traduzioni rapide e sequenziali.  
2. 🧠 **Workflow Manuale** — controllo totale per lavori di alta precisione.

---

## 🚀 **Workflow Automatico — Pulsante “Auto”**

Un flusso pensato per la **massima efficienza**:  
l’applicazione gestisce in sequenza tutte le fasi del processo, dall’OCR alla creazione dei box di testo tradotti.

### 🔹 **Passaggi Principali**

1. **📂 Caricamento**  
   L’utente importa una o più pagine nel pannello **File**.

2. **🪄 Selezione dell’Area**  
   Con la **Bacchetta Magica (Magic Wand)** o la **Selezione Manuale (Manual Selection)**, si selezionano le aree contenenti testo.  
   È possibile selezionare più balloon o riquadri contemporaneamente.

3. **⚡ Esecuzione Automatica**  
   Premendo **Auto**, l’applicazione:  
   - 🔲 Finalizza la selezione creando **Box OCR** vettoriali  
   - 🧠 Esegue l’**OCR** per estrarre il testo  
   - 🧹 Esegue **Inpainting** per pulire lo sfondo  
   - 🌐 Traduce tutto tramite **Gemini API**  
   - 🖋️ Genera **Box di Testo** tradotti con stile predefinito

4. **🧩 Rifinitura**  
   L’utente può selezionare i nuovi box per **correzioni, spostamenti o modifiche di stile**.

💡 **Ideale per:** tradurre intere pagine o capitoli in blocco, con un unico comando, e dedicarsi solo alla revisione finale.

---

## 🛠️ **Workflow Manuale — Controllo Passo-Passo**

Questo approccio garantisce **massimo controllo su ogni fase**: perfetto per lavori professionali, balloon complessi o layout irregolari.

### 🔹 **Passaggi Principali**

1. **📂 Caricamento**  
   Importazione della pagina da elaborare.

2. **🔍 Creazione Box OCR**  
   Selezione del testo con la **Bacchetta Magica** o **Selezione Manuale**.  
   Premendo **OCR**, vengono creati i *Box OCR* e il testo estratto appare nel pannello **Testo Sorgente**.

3. **🧹 Pulizia Manuale**  
   Creazione o richiamo della selezione → pressione del tasto **Riempi (Inpaint)** per rimuovere il testo.  
   Strumenti **Pennello** e **Gomma** per rifiniture precise.

4. **🌍 Traduzione**  
   Quando l’OCR è corretto, clic su **Traduci**.  
   L’app genera i *Box di Testo* tradotti automaticamente.

5. **🖋️ Typesetting**  
   Nel pannello **Formattazione Testo**, l’utente può:  
   - Cambiare **font** e **dimensione**  
   - Regolare **allineamento**, **interlinea**, **spaziatura**  
   - Impostare **colore** e **contorno**  
   - **Spostare, ridimensionare o ruotare** i box

6. **💾 Esportazione**  
   Salvataggio della pagina come **immagine singola**, oppure esportazione multipla in **ZIP** o **PDF**.

---

# 🎨 **Capitolo 2 — Interfaccia Utente (UI)**

L’interfaccia di **Comics Magic Translator** è progettata con un **approccio modulare e intuitivo**.  
Ogni pannello ha una funzione specifica, così da rendere il flusso di lavoro chiaro e fluido.

<img width="1911" height="944" alt="immagine" src="https://github.com/user-attachments/assets/cc17bee2-479a-4965-a9fc-bfb9051822de" />


---

## 🧩 **Struttura Generale dell’Interfaccia**

L’applicazione è suddivisa in **tre aree principali**:

| Area | Posizione | Funzione |
|------|------------|----------|
| **📁 Pannello File** | Sinistra, in alto | Gestione delle pagine e dei progetti |
| **🖼️ Area di Lavoro (Canvas)** | Centro | Modifica visiva e interazione con i box |
| **🧰 Pannello Strumenti** | Destra | Editing, formattazione e operazioni grafiche |
| **🪜 Pannello Livelli** | Sinistra, in basso | Gestione degli elementi sovrapposti |

---

## 📁 **Pannello File (Sinistra, in alto)**

Il punto di partenza di ogni progetto.  
Da qui si caricano, gestiscono e organizzano tutte le **pagine del fumetto**.

### 🔹 **Funzionalità Principali**

#### 📤 **Carica Pagine**
- Consente di caricare una o più immagini (**PNG, JPG, WebP**) dal computer.  
- Le immagini vengono mostrate come **miniature** nell’elenco sottostante.

#### ➕ **Aggiungi Immagine**
- Aggiunge un’immagine come **nuovo livello** sulla pagina selezionata.  
- Utile per inserire loghi, patch o altri elementi grafici.

#### 💾 **Salva / Carica Progetto**
- **Salva Progetto (.cmt.zip)** — Esporta tutto lo stato del lavoro (immagini, box, livelli, cronologia) in un file compresso.  
  Ideale per interrompere e riprendere l’attività.  
- **Carica Progetto (.cmt.zip)** — Importa un progetto salvato, ripristinando l’ambiente completo di lavoro.

#### 🗂️ **Elenco Pagine**
- Mostra miniature di tutte le pagine caricate.  
- Cliccando su una miniatura si apre la pagina nel **canvas centrale**.  
- Un’**icona a cestino** appare al passaggio del mouse per eliminare una pagina.

---

## 🖼️ **Area di Lavoro - Canvas (Centro)**

Il **cuore operativo** dell’app, dove si visualizzano e modificano le pagine.

### 👁️ **Visualizzazione**
- Mostra la pagina attiva selezionata dal Pannello File.  
- Se ci sono modifiche (pulizia, disegno, testi), mostra sempre la versione più aggiornata.

### 🎯 **Interazione con gli Elementi**
- Tutti i box (OCR, testo, immagini) possono essere **spostati, ridimensionati, ruotati** o selezionati.  
- Supporta **selezione multipla** con **Shift**.

### 🧮 **Strumenti di Selezione**
- **🖊️ Selezione Manuale:** Disegna un rettangolo per selezionare aree personalizzate.  
  - `Shift` → aggiunge  
  - `Alt` → sottrae  
- **✨ Bacchetta Magica:** Seleziona aree di colore simile con un clic.  
  - Tolleranza regolabile dal Pannello Strumenti.

### 🎨 **Strumenti di Disegno**
- **Pennello:** Disegna sul fumetto.  
- **Gomma:** Cancella direttamente sull’immagine.

### 🔍 **Navigazione**
- **Zoom:** Rotellina del mouse per ingrandire o ridurre.  
- **Pan (Panoramica):** Tenere premuto `Ctrl` e trascinare per spostare la visuale.

### ✏️ **Modifica Testo Inline**
- Doppio clic su un box di testo → modifica diretta del testo **sulla vignetta**.

---

## 🧰 **Pannello Strumenti (Destra)**

Contiene tutti i **controlli di elaborazione**, **formattazione** e **gestione dell’immagine**.

### 📝 **Testo Sorgente e di Visualizzazione**
- **🔹 Testo Sorgente:** mostra il testo OCR, non modificabile.  
- **🔹 Testo di Visualizzazione:** testo traducibile e modificabile.

### 🪄 **Strumenti di Modifica**
- **➕ Aggiungi Testo / Selezione Manuale**  
- **↩️ Annulla / ↪️ Ripristina (Undo/Redo)**  
- **🎯 Strumenti di Selezione:** Bacchetta Magica, Gomma per selezione, Cancella selezione.  
- **🧽 Riempi (Inpaint):** Rimuove testo e sfondi indesiderati tramite AI.  
- **🖼️ Editor Immagine (Image Editor):** Editor avanzato dell’area selezionata.  
- **✂️ Dividi Box (Split Box):** Divide un box in due.

### 🖋️ **Formattazione Testo**
- **Controlli di stile:** Font, dimensione, allineamento, grassetto, corsivo, colore testo, contorno.  
- **Spaziatura:** Slider per interlinea e spazi tra parole.  
- **Ordine Livelli:**  
  - 🔼 Porta avanti  
  - 🔽 Manda indietro

### 🎨 **Strumenti di Disegno**
- **Selezione Strumento:** Pennello o Gomma.  
- **Proprietà Pennello:** Colore, dimensione, durezza, opacità.

### 📦 **Esporta**
- **🖼️ Salva Immagine Corrente:** esporta la pagina attiva (PNG, JPG, WebP).  
- **📁 Salva Tutto in ZIP:** tutte le pagine modificate in un unico file.  
- **📄 Salva come PDF:** esporta l’intero progetto in un singolo file PDF.

---

## 🪜 **Pannello Livelli (Sinistra, in basso)**

Fornisce una **vista a strati** di tutti gli elementi di testo e immagine sulla pagina.

### 📚 **Funzionalità**
- **Elenco Livelli:** Mostra i box in ordine di sovrapposizione (top → più visibile).  
- **Selezione:** clic su un elemento → selezione nel canvas (Shift per selezione multipla).  
- **Riordinamento:** trascinamento drag-and-drop per modificare la posizione.  
- **Anteprima Testo:** mostra il contenuto di ogni box per identificazione rapida.

---

## 🔖 **Suggerimento**

💡 *Mantieni sempre un ordine logico nei livelli (sfondo → testo → effetti) per un flusso di lavoro più efficiente e ordinato.*
### 🧭 **Suggerimento operativo**

> 🔧 **Consiglio:** utilizza il *Workflow Automatico* per volumi o capitoli interi, e il *Manuale* per balloon con layout complessi o testi stilisticamente delicati.

---

# ⚙️ Capitolo 3 — Flussi di Lavoro Principali

Questa sezione descrive i **processi operativi fondamentali** dell’applicazione, dal caricamento iniziale delle pagine fino alla formattazione finale del testo tradotto.

---

## 📁 Caricamento e Gestione del Progetto

Un flusso di lavoro ordinato inizia con una corretta gestione dei file e dei progetti.

---

### 🖼️ Importazione delle Pagine (Immagini)

Il lavoro parte sempre dal caricamento delle immagini da tradurre.

#### 🔹 Procedura

1. **Avvio:** clicca su **Carica Pagine (Upload Pages)** nel *Pannello File*.  
2. **Selezione:** nella finestra di dialogo del sistema, scegli una o più immagini (formati: **PNG, JPG, WebP**).  
3. **Visualizzazione:** le immagini caricate appariranno come **miniature** nel *Pannello File*.  
   - La **prima** immagine viene caricata automaticamente nel *Canvas centrale*.  
   - Per lavorare su un’altra pagina, clicca semplicemente sulla sua miniatura.

---

### 💾 Salvataggio e Caricamento di un Progetto (.cmt.zip)

Per non perdere il lavoro e poterlo riprendere in un secondo momento, utilizza le funzioni di **salvataggio e caricamento** del progetto.

#### 💾 Salvataggio del Progetto

1. Clicca su **Salva Progetto (Save Project)**.  
2. L’app raccoglierà:
   - 🖼️ Le immagini originali caricate.  
   - ✂️ Le versioni modificate (pulizia, editing).  
   - 🔲 Tutti i box OCR e di testo (posizione, stile, contenuto).  
   - ⏪ La cronologia delle azioni (Undo/Redo).  
   - ⚙️ Le impostazioni del profilo attivo.  
3. Tutto viene compresso in un file **`.cmt.zip`** che puoi salvare sul tuo computer.

#### 📂 Caricamento di un Progetto

1. Clicca su **Carica Progetto (Load Project)**.  
2. Seleziona un file `.cmt.zip` salvato in precedenza.  
3. L’app ripristinerà l’intero ambiente di lavoro:
   - Pagine, box di testo e modifiche.  
   - La pagina attiva al momento del salvataggio verrà riaperta automaticamente nel *Canvas*.

---

## ⚡ Processo di Traduzione Automatica ("Auto Workflow")

Il pulsante **Auto** è pensato per la **massima velocità**, concatenando le operazioni più comuni in un solo clic.  
Può essere utilizzato in **due modalità principali**.

---

### 🎯 Uso di "Auto" su una Selezione

Metodo più veloce per tradurre il testo di una o più vignette.

#### 🔹 Procedura

1. **Selezione:** usa la *Bacchetta Magica* o la *Selezione Manuale* per selezionare il testo originale.  
   - `Shift` → aggiungi aree  
   - `Alt` → rimuovi aree  
2. **Esecuzione:** clicca su **Auto**.  
3. **Processo Automatico:**
   - 🧩 *Finalizzazione:* la selezione diventa uno o più box OCR ottimizzati.  
   - 🔍 *OCR:* il testo viene estratto.  
   - 🧽 *Pulizia:* viene eseguito l’**Inpainting** per rimuovere il testo originale.  
   - 🌐 *Traduzione:* il testo viene inviato al servizio di traduzione.  
   - 📝 *Creazione:* vengono creati nuovi **Box di Testo** con la traduzione.  
4. **Revisione:** correggi o sposta i nuovi box, se necessario.

---

### 🧠 Uso di "Auto" su Tutti i Box OCR

Utile quando i **Box OCR** sono già stati creati manualmente sulla pagina.

#### 🔹 Procedura

1. **Preparazione:** assicurati di avere uno o più Box OCR presenti e nessun elemento selezionato.  
2. **Esecuzione:** clicca su **Auto**.  
3. **Processo Automatico:**
   - 🧽 *Pulizia:* esegue l’inpainting per ogni Box OCR.  
   - 🌐 *Traduzione:* traduce tutti i testi OCR in un’unica richiesta.  
   - 📝 *Creazione:* genera i corrispondenti Box di Testo tradotti.

---

## 🪄 Processo di Traduzione Manuale (Passo Dopo Passo)

Questo flusso di lavoro scompone il processo automatico, dando **pieno controllo** su ogni fase.

---

### 1️⃣ Creazione delle Aree di Selezione

#### 🔹 Bacchetta Magica (Magic Wand)
- Attiva lo strumento dal *Pannello Strumenti*.  
- Clicca sul testo per selezionare i pixel di colore simile.  
- Regola la **Tolleranza** per ampliare o restringere la selezione.

#### 🔹 Selezione Manuale (Manual Selection)
- Attiva lo strumento e trascina per disegnare un rettangolo di selezione.

#### ✏️ Modifica della Selezione
- **Aggiungere:** `Shift`  
- **Sottrarre:** `Alt`  
- **Pulsanti rapidi:**  
  - ❌ *Cancella Selezione (Clear Selection)*  
  - 🔁 *Richiama Selezione (Recall Selection)*

---

### 2️⃣ Esecuzione dell’OCR (Estrazione del Testo)

1. Crea o seleziona un’area che copra il testo originale.  
2. Clicca su **OCR**.  
3. L’app creerà un **Box OCR vettoriale** ed estrarrà il testo.  
4. Il testo estratto apparirà nel campo **Testo Sorgente (Source Text)** del *Pannello Strumenti*.

---

### 3️⃣ Pulizia dello Sfondo (Inpainting)

1. Seleziona l’area da pulire o richiama l’ultima selezione.  
2. Clicca su **Riempi (Inpaint)**.  
3. L’algoritmo riempirà l’area con i colori circostanti, cancellando il testo.  
4. Opzioni disponibili:
   - 🎨 *Colore Automatico*  
   - 🖌️ *Colore Manuale*  
5. Per rifiniture manuali, usa **Pennello (Brush)** e **Gomma (Eraser)**.

---

### 4️⃣ Esecuzione della Traduzione

1. Quando i Box OCR sono pronti, clicca su **Traduci (Translate)**.  
2. L’app invierà il testo sorgente all’API di traduzione.  
3. Verranno creati nuovi **Box di Testo tradotti** per ogni box OCR.

---

### 5️⃣ Formattazione e Rifinitura del Testo

#### ✏️ Modifica e Revisione
- Clicca su un **Box di Testo** per selezionarlo.  
- Modifica il testo nel campo **Testo di Visualizzazione** o direttamente nel *canvas* con doppio clic.

#### 🎨 Formattazione
Utilizza i controlli nel *Pannello Strumenti → Formattazione Testo* per:
- 🅰️ Font e dimensione  
- 🧭 Allineamento (sinistra, centro, destra)  
- 🔠 Grassetto e corsivo  
- 🎨 Colore testo e contorno  
- 📏 Interlinea e spaziatura

#### 🪶 Posizionamento
- Trascina per spostare il box.  
- Usa le maniglie per **ridimensionare** o **ruotare**.  
- Allinea perfettamente il testo all’interno del *balloon* del fumetto.

---

## 💡 Suggerimento Finale

Per ottenere i migliori risultati:
> 🔧 Alterna la modalità automatica (“Auto”) e quella manuale in base al livello di precisione richiesto.  
> Usa “Auto” per velocità e “Manuale” per controllo dettagliato.

---

# 🧩 Capitolo 4 — Funzionalità Dettagliate

Questo capitolo approfondisce le singole funzioni dell’applicazione, spiegando in modo operativo come sfruttare al meglio ogni strumento per ottenere risultati precisi e professionali.

---

## 🎯 Selezione e Pulizia

La creazione di selezioni accurate è il primo passo fondamentale per un buon risultato.  
Questi strumenti permettono di isolare con precisione il testo originale da tutto il resto.

---

### ✨ Uso della Bacchetta Magica e della Tolleranza

La **Bacchetta Magica (Magic Wand)** è lo strumento più rapido per selezionare aree di colore uniforme, come il testo nero su sfondo bianco.

- **Funzionamento:** clicca su un pixel del testo; l’app selezionerà automaticamente tutti i pixel adiacenti di colore simile.  
- **Tolleranza:** controlla la sensibilità tramite il cursore **Tolerance** nel Pannello Strumenti:
  - 🔹 *Valore basso (es. 10):* seleziona solo colori molto simili.  
  - 🔹 *Valore alto (es. 100):* include una gamma più ampia di sfumature.  
  - 💡 *Suggerimento:* aumenta la tolleranza per testo colorato o con gradienti.

---

### 🟩 Creazione di Selezioni Manuali (Aggiungere / Sottrarre Aree)

Lo strumento **Selezione Manuale (Manual Selection)** permette di disegnare selezioni rettangolari.

- **Funzionamento:** trascina il mouse sull’immagine per disegnare il rettangolo.  
- **Tasti Modificatori:**
  - ⬆️ **Shift:** aggiunge la nuova area alla selezione corrente.  
  - ⬇️ **Alt:** sottrae l’area dalla selezione corrente.

---

### 🧽 Rifinire le Selezioni con la Gomma per Selezione

La **Gomma per Selezione (Selection Eraser)** consente di rimuovere parti indesiderate della selezione.

- **Uso:** clicca e trascina per cancellare porzioni di selezione.  
- **Utilità:** perfetta per separare lettere unite o rifinire bordi complessi.  
- **Impostazioni:** la dimensione della gomma è regolabile nel Pannello Strumenti.

---

### 🎨 Funzionamento dell’Inpainting (Automatico e Manuale)

L’**Inpainting (Riempi)** rimuove il testo originale e ricostruisce lo sfondo.

- 🧠 **Modalità Automatica (Auto-Color):** analizza i bordi per ricostruire texture e gradienti realistici.  
- 🎛️ **Modalità Manuale:** riempie la selezione con un colore solido scelto manualmente — perfetto per balloon uniformi.

---

### 🔁 Cancellare e Richiamare l’Ultima Selezione

- ❌ **Cancella Selezione (Clear Selection):** rimuove ogni selezione attiva.  
- ♻️ **Richiama Selezione (Recall Selection):** riattiva l’ultima selezione usata, utile dopo un OCR per eseguire subito l’Inpainting.

---

## 🧱 Gestione dei Box

I “box” sono gli elementi fondamentali su cui si basa l’intero flusso di lavoro.  
Si dividono in due categorie: **Box OCR** (estrazione testo) e **Box di Testo** (testo tradotto).

---

### 📦 Creazione di Box OCR e Box di Testo

- **Box OCR**
  - ✋ Manuale → crea una selezione → premi **OCR**.  
  - ⚙️ Automatico → crea una selezione → premi **Auto**.  
  - 🎨 Aspetto: bordo tratteggiato color ambra.  

- **Box di Testo**
  - ⚙️ Automatico → generati dopo **Traduci** o **Auto**.  
  - ✍️ Manuale → premi **Aggiungi Testo** per crearne uno vuoto.  
  - 🎨 Aspetto: bordo verde alla selezione.

---

### 🖱️ Selezione, Spostamento e Ridimensionamento dei Box

- **Selezione:** clic singolo per selezionare; **Shift** per selezioni multiple.  
- **Spostamento:** trascina il box per riposizionarlo.  
- **Ridimensionamento:** usa le maniglie agli angoli.  
- **Rotazione:** trascina la maniglia circolare superiore.

---

### ✏️ Modifica del Testo in Linea

Doppio click su un **Box di Testo** per modificarlo direttamente nel canvas.  
Premi **Esc** o clicca fuori dal box per terminare la modifica inline.

---

### ✂️ Divisione di un Box di Testo

Utile per dividere una frase in più balloon.

1. Seleziona il box.  
2. Posiziona il cursore nel punto desiderato nel **Testo di Visualizzazione**.  
3. Premi **Dividi Box** → il testo si separa in due box distinti, mantenendo lo stile.

---

## 🅰️ Formattazione Avanzata del Testo

Il **Pannello di Formattazione Testo** consente un controllo totale sull’aspetto del testo tradotto.

---

### 🎨 Applicare Stili (Font, Dimensione, Colore, Contorno)

- **Font e Dimensione:** menu a tendina e campo numerico.  
- **Colore e Contorno:** selettori colore e spessore del bordo.
  - 🖍️ Spessore 0 → nessun contorno.  

---

### 🔠 Stili Tipografici Rapidi

- **B / I:** grassetto e corsivo.  
- **Aa:** alterna maiuscole/minuscole.  
- **A²:** apice per note o effetti sonori.

---

### 🧭 Allineamento e Spaziatura

- 🧍‍♂️ **Allineamento:** sinistra / centro / destra.  
- 📏 **Interlinea (Line Spacing):** regola la distanza verticale tra le righe.  
- ↔️ **Spaziatura Parole (Word Spacing):** modifica la distanza orizzontale tra parole.

---

### ⚡ Stili Rapidi (F1 / F2)

- 💾 **Salvare uno Stile:**  
  Seleziona un box → **Shift + F1/F2** → lo stile viene salvato.  
- 🎯 **Applicare uno Stile:**  
  Seleziona un box → **F1/F2** → applica lo stile salvato.

---

### 🔄 Importazione ed Esportazione del Testo Tradotto (.json)

- ⬇️ **Esporta:** genera un file `.json` con tutti i testi tradotti.  
- ⬆️ **Importa:** aggiorna i box testo caricando un file `.json` con gli stessi ID.

---

## 🎨 Disegno e Ritocco

Per correzioni manuali o ricostruzioni di sfondi, gli strumenti di disegno offrono controllo totale.

---

### 🖌️ Uso del Pennello e della Gomma

- **Pennello (Brush):** disegna direttamente sull’immagine.  
- **Gomma (Eraser):** cancella parti indesiderate rendendole trasparenti.  
- 💡 Ideale per ritocchi dopo l’inpainting.

---

### ⚙️ Opzioni Strumenti

Quando attivi Pennello o Gomma, puoi regolare:

- 🎨 **Colore (solo Pennello)**  
- ⚫ **Dimensione (Size)**  
- 🪶 **Durezza (Hardness)**  
- 🌫️ **Opacità (Opacity)**

---

## 🖼️ Editor di Immagini Modale

L’Editor di Immagini offre strumenti avanzati per modifiche mirate su porzioni o livelli.

---

### 🚪 Come Aprirlo

- **Da Selezione:** crea un’area → premi **Editor Immagine**.  
- **Da Livello Immagine:** seleziona il livello → premi **Editor Immagine**.

---

### 🧰 Strumenti dell’Editor

- 🖌️ **Pennello / Gomma / Contagocce**  
- ✂️ **Lazo (Lasso Erase):** disegna una forma libera da cancellare.  
- 🪄 **Pennello Magico (Magic Brush):** ripristina aree originali dell’immagine.

---

### 🔍 Trasformazioni Immagine

- 🖐️ **Sposta:** trascina per riposizionare.  
- 🧭 **Zoom:** usa la rotellina.  
- 🔄 **Rotazione:** tieni **Shift** e ruota con la rotellina.  
- 🔁 **Resetta Trasformazione:** ripristina lo stato originale.

---

### 🌞 Regolazioni: Luminosità e Contrasto

Nel pannello destro puoi regolare in tempo reale **luminosità** e **contrasto** per uniformare i toni di immagine.

---

### ✅ Applicare o Annullare le Modifiche

- 💾 **Applica (Apply):** conferma e fonde le modifiche nel canvas principale.  
- ❎ **Annulla (Cancel):** chiude l’editor senza salvare i cambiamenti.

---

> 🧭 **Nota Finale:**  
> Le funzionalità illustrate in questo capitolo costituiscono la base operativa per il typesetting e la post-produzione dei fumetti tradotti.  
> L’esperienza e la pratica con gli strumenti di selezione, box e formattazione sono la chiave per risultati professionali.

---
# 📦 Capitolo 5 — Esportazione e Salvataggio

Una volta completata la traduzione e il *typesetting*, **Comics Magic Translator** offre diverse opzioni per esportare il lavoro finito.  
Le modalità di salvataggio coprono tutte le esigenze: dalla semplice condivisione di una singola pagina all’archiviazione di un intero capitolo o progetto.

---

## 🖼️ Salvataggio della pagina corrente come immagine singola (PNG, JPG, WebP)

Questa modalità è perfetta per salvare rapidamente **una sola pagina**, utile per anteprime, revisioni o condivisione veloce.

### 🔧 Come si usa

1. Assicurati che la pagina da salvare sia **attiva nell’Area di Lavoro (Canvas)**.  
2. Apri il **Pannello Strumenti**, nella sezione **Esporta (Export)**.  
3. Clicca su **Salva Immagine Corrente**.  
4. Si aprirà una finestra di dialogo con le opzioni di configurazione.

### ⚙️ Opzioni di Esportazione

- **Formato:**  
  - **PNG** → qualità senza perdita, ideale per la massima fedeltà.  
  - **JPG** → qualità con perdita, file più leggeri.  
  - **WebP** → formato moderno con ottimo bilanciamento tra qualità e dimensioni.

- **Qualità (solo per JPG/WebP):**  
  Uno *slider* regola la qualità da **0 a 100**.  
  Valori più alti = qualità migliore, ma file più pesante.

### 📤 Risultato

Verrà scaricato **un singolo file immagine**, fusione completa di tutti gli elementi visibili:  
l’immagine di base (con eventuali ritocchi o pulizie) e i **box di testo** renderizzati con la loro formattazione finale.

---

## 🗂️ Esportazione di tutte le pagine in un file `.zip`

Funzione ideale per esportare **un intero capitolo o progetto**, raccogliendo tutte le pagine modificate in un unico archivio compresso.

### 🔧 Come si usa

1. Apri il **Pannello Esporta**.  
2. Clicca su **Salva Tutto in ZIP**.  
3. Nella finestra di dialogo, seleziona formato e qualità delle immagini da includere.

### ⚙️ Opzioni di Esportazione

Le stesse del salvataggio singolo:

- **Formato:** PNG, JPG, WebP  
- **Qualità:** regolabile tramite slider (per JPG e WebP)

### 📦 Risultato

Verrà generato un **file `.zip`** contenente tutte le pagine esportate.  
All’interno troverai un file immagine per ogni pagina caricata nel **Pannello File**, con i **nomi originali** mantenuti.

---

## 📄 Esportazione di tutte le pagine come singolo file `.pdf`

Questa opzione è perfetta per creare un **documento pronto alla lettura o condivisione**, impaginando automaticamente tutte le pagine del fumetto.

### 🔧 Come si usa

1. Dal **Pannello Esporta**, clicca su **Salva come PDF**.  
2. L’applicazione renderizzerà ogni pagina come immagine finale.  
3. Verranno quindi assemblate in **un unico file PDF**, seguendo l’ordine visualizzato nel Pannello File.

### ⚙️ Opzioni di Esportazione

Come nelle altre modalità:

- **Formato:** PNG, JPG o WebP  
- **Qualità:** regolabile per i formati con perdita

### 📕 Risultato

Verrà scaricato **un singolo file `.pdf`**, dove ogni pagina del fumetto corrisponde a una pagina del documento.  
L’ordine rispetterà quello mostrato nel **Pannello File**, garantendo una lettura coerente e ordinata.

---

> 💡 **Suggerimento:**  
> Prima di esportare in ZIP o PDF, assicurati che i testi siano corretti e allineati.  
> L’esportazione salverà lo stato visivo attuale, inclusi tutti i livelli e formattazioni.
