# 📘 **Comics Magic Translator — User Guide**

---

## 🎯 **Purpose of the Application**

**Comics Magic Translator** is a **semi-automatic** tool designed to assist and speed up the translation process of comics, manga, and webtoons (*scanlation*).

🔹 **Main Goal:**  
Not to replace the translator or typesetter, but to automate the most repetitive and time-consuming steps while offering integrated, intelligent tools to enhance productivity and accuracy.

---

### ⚙️ **Main Features**

| Feature | Description |
|:--|:--|
| 🧠 **Text Extraction (OCR)** | Recognizes and captures original text directly from images, including balloons or irregular areas. |
| 🧹 **Background Cleanup (Inpainting)** | Removes the original text and automatically reconstructs the underlying artwork. |
| 🌐 **AI Translation (Gemini)** | Translates text quickly and contextually using Google Gemini’s API, even into multiple languages at once. |
| 🖋️ **Typesetting & Formatting** | Applies custom text styles (font, color, outline) and positions translated text precisely in the panel. |
| 🎨 **Manual Retouching** | Provides drawing tools, brushes, and erasers for precise refinements. |

💡 *Combining these tools in a single interface drastically reduces work time while maintaining full control over quality.*

---

## 🔄 **Workflow Overview**

Two main modes are available to suit different needs:

1. ⚡ **Automatic Workflow** — fast, sequential translation.  
2. 🧠 **Manual Workflow** — complete control for high-precision projects.

---

## 🚀 **Automatic Workflow — “Auto” Button**

A workflow focused on **maximum efficiency**:  
the application manages all steps in sequence, from OCR to translated text box creation.

### 🔹 **Main Steps**

1. **📂 Import**  
   Load one or more pages in the **File** panel.

2. **🪄 Area Selection**  
   Use the **Magic Wand** or **Manual Selection** to mark text regions.  
   Multiple balloons or panels can be selected at once.

3. **⚡ Automatic Execution**  
   When **Auto** is pressed, the app:  
   - 🔲 Finalizes selection and creates **OCR Boxes**  
   - 🧠 Runs **OCR** to extract text  
   - 🧹 Performs **Inpainting** for background cleanup  
   - 🌐 Translates via **Gemini API**  
   - 🖋️ Generates **Translated Text Boxes** with preset style

4. **🧩 Refinement**  
   The user can adjust, move, or restyle the new boxes.

💡 **Best for:** translating entire pages or chapters in bulk with one command, leaving only the final review.

---

## 🛠️ **Manual Workflow — Step-by-Step Control**

For professional-quality results or complex layouts.

### 🔹 **Main Steps**

1. **📂 Import**  
   Load the page to be processed.

2. **🔍 OCR Box Creation**  
   Select text with **Magic Wand** or **Manual Selection**.  
   Press **OCR** to create text boxes and extract source text.

3. **🧹 Manual Cleanup**  
   Use **Inpaint** to erase original text and clean the balloon.  
   Refine with **Brush** and **Eraser** tools.

4. **🌍 Translation**  
   When OCR text is ready, click **Translate**.  
   Translated boxes are generated automatically.

5. **🖋️ Typesetting**  
   In the **Text Formatting Panel**, you can:  
   - Adjust **font**, **size**, and **alignment**  
   - Set **color** and **outline**  
   - Move, resize, or rotate boxes

6. **💾 Export**  
   Save the page as a **single image**, or batch-export as **ZIP** or **PDF**.

---

### 🧭 **Operational Tip**

> 🔧 **Suggestion:** use the *Automatic Workflow* for full volumes or chapters, and *Manual Workflow* for complex or stylistically delicate text balloons.

---

# 🎨 **Chapter 2 — User Interface (UI)**

The interface of **Comics Magic Translator** is designed with a **modular and intuitive layout**.  
Each panel serves a specific purpose, ensuring a clear and fluid workflow.

<img width="1913" height="945" alt="immagine" src="https://github.com/user-attachments/assets/e9ea9e92-73bd-4d0c-bd4a-146c67d2de11" />

---

## 🧩 **General Interface Structure**

The application is divided into **three main areas**:

| Area | Position | Function |
|------|-----------|-----------|
| **📁 File Panel** | Left, top | Manage pages and projects |
| **🖼️ Workspace (Canvas)** | Center | Visual editing and box interaction |
| **🧰 Tools Panel** | Right | Editing, formatting, and graphic operations |
| **🪜 Layers Panel** | Left, bottom | Manage overlapping elements |

---

## 📁 **File Panel (Left, top)**

The starting point of every project.  
Here you can load, manage, and organize all **comic pages**.

### 🔹 **Main Features**

#### 📤 **Upload Pages**
- Load one or more images (**PNG, JPG, WebP**) from your computer.  
- Images appear as **thumbnails** in the list below.

#### ➕ **Add Image**
- Adds an image as a **new layer** on the selected page.  
- Useful for logos, patches, or other graphic elements.

#### 💾 **Save / Load Project**
- **Save Project (.cmt.zip)** — Exports the full state of work (images, boxes, layers, history) into a compressed file.  
  Perfect for pausing and resuming later.  
- **Load Project (.cmt.zip)** — Imports a saved project, restoring the complete work environment.

#### 🗂️ **Page List**
- Displays thumbnails of all loaded pages.  
- Clicking a thumbnail opens it in the **central canvas**.  
- A **trash icon** appears on hover to delete a page.

---

## 🖼️ **Workspace - Canvas (Center)**

The **core area** of the app, where pages are displayed and edited.

### 👁️ **Display**
- Shows the page currently selected from the File Panel.  
- Always reflects the latest version after edits (cleanup, drawing, text).

### 🎯 **Element Interaction**
- All boxes (OCR, text, images) can be **moved, resized, rotated**, or selected.  
- Supports **multi-selection** using **Shift**.

### 🧮 **Selection Tools**
- **🖊️ Manual Selection:** Draw a rectangle to select custom areas.  
  - `Shift` → add  
  - `Alt` → subtract  
- **✨ Magic Wand:** Selects color-similar areas with one click.  
  - Tolerance adjustable from the Tools Panel.

### 🎨 **Drawing Tools**
- **Brush:** Draw freely on the comic.  
- **Eraser:** Erase directly on the image.

### 🔍 **Navigation**
- **Zoom:** Mouse wheel to zoom in/out.  
- **Pan:** Hold `Ctrl` and drag to move the view.

### ✏️ **Inline Text Editing**
- Double-click a text box to edit the text **directly on the panel**.

---

## 🧰 **Tools Panel (Right)**

Contains all **processing, formatting, and image control** tools.

### 📝 **Source and Display Text**
- **🔹 Source Text:** Displays OCR text (read-only).  
- **🔹 Display Text:** Editable and translatable content.

### 🪄 **Editing Tools**
- **➕ Add Text / Manual Selection**  
- **↩️ Undo / ↪️ Redo**  
- **🎯 Selection Tools:** Magic Wand, Selection Eraser, Clear Selection  
- **🧽 Inpaint:** Removes unwanted text or backgrounds using AI.  
- **🖼️ Image Editor:** Opens an advanced editor for the selected area.  
- **✂️ Split Box:** Divides one box into two.

### 🖋️ **Text Formatting**
- **Style Controls:** Font, size, alignment, bold, italic, color, outline.  
- **Spacing:** Sliders for line spacing and word spacing.  
- **Layer Order:**  
  - 🔼 Bring Forward  
  - 🔽 Send Backward

### 🎨 **Drawing Tools**
- **Tool Selection:** Brush or Eraser.  
- **Brush Properties:** Color, size, hardness, opacity.

### 📦 **Export**
- **🖼️ Save Current Image:** Export the active page (PNG, JPG, WebP).  
- **📁 Save All as ZIP:** Export all edited pages in one file.  
- **📄 Save as PDF:** Export the full project as a single PDF file.

---

## 🪜 **Layers Panel (Left, bottom)**

Provides a **layered view** of all text and image elements on the page.

### 📚 **Features**
- **Layer List:** Displays boxes in order of overlap (top → most visible).  
- **Selection:** Click to select in the canvas (Shift for multiple).  
- **Reordering:** Drag and drop to change layer position.  
- **Text Preview:** Shows each box’s text for quick identification.

---

## 🔖 **Tip**

💡 *Keep a logical layer order (background → text → effects) for a cleaner and more efficient workflow.*

---

