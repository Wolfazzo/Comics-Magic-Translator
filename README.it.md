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

