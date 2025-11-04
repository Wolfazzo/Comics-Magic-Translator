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

### 🧭 **Suggerimento operativo**

> 🔧 **Consiglio:** utilizza il *Workflow Automatico* per volumi o capitoli interi, e il *Manuale* per balloon con layout complessi o testi stilisticamente delicati.

