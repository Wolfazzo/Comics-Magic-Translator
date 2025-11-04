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

# ⚙️ Chapter 3 — Main Workflows

This section describes the **core operational processes** of the application, from the initial page upload to the final formatting of the translated text.

---

## 📁 Project Loading and Management

A well-organized workflow starts with proper file and project management.

---

### 🖼️ Importing Pages (Images)

The process always begins with loading the images to be translated.

#### 🔹 Procedure

1. **Start:** Click **Upload Pages** in the *File Panel*.  
2. **Selection:** In the system dialog, choose one or more images (formats: **PNG, JPG, WebP**).  
3. **Display:** Loaded images will appear as **thumbnails** in the *File Panel*.  
   - The **first** image is automatically loaded into the *central Canvas*.  
   - To work on another page, simply click its thumbnail.

---

### 💾 Saving and Loading a Project (.cmt.zip)

To avoid losing your progress and resume work later, use the **Save** and **Load Project** functions.

#### 💾 Save Project

1. Click **Save Project**.  
2. The app will gather:
   - 🖼️ Original loaded images.  
   - ✂️ Edited versions (cleaned, modified).  
   - 🔲 All OCR and text boxes (position, style, content).  
   - ⏪ Undo/Redo history.  
   - ⚙️ Active profile settings.  
3. Everything is compressed into a **`.cmt.zip`** file saved on your computer.

#### 📂 Load Project

1. Click **Load Project**.  
2. Select a previously saved `.cmt.zip` file.  
3. The app restores the full work environment:
   - Pages, text boxes, and modifications.  
   - The last active page is reopened automatically in the *Canvas*.

---

## ⚡ Automatic Translation Process ("Auto Workflow")

The **Auto** button enables **maximum speed**, chaining the most common operations in a single click.  
It can be used in **two main modes**.

---

### 🎯 Using "Auto" on a Selection

Fastest way to translate text from one or more comic panels.

#### 🔹 Procedure

1. **Select:** Use the *Magic Wand* or *Manual Selection* to highlight the source text.  
   - `Shift` → add areas  
   - `Alt` → remove areas  
2. **Run:** Click **Auto**.  
3. **Automatic Process:**
   - 🧩 *Finalization:* The selection becomes optimized OCR boxes.  
   - 🔍 *OCR:* Extracts the text.  
   - 🧽 *Inpainting:* Removes original text using AI fill.  
   - 🌐 *Translation:* Sends text to the translation service.  
   - 📝 *Creation:* Generates new **Text Boxes** with translations.  
4. **Review:** Adjust or reposition text boxes as needed.

---

### 🧠 Using "Auto" on All OCR Boxes

Useful when **OCR Boxes** have already been manually created on the page.

#### 🔹 Procedure

1. **Preparation:** Ensure one or more OCR Boxes are present and nothing is selected.  
2. **Run:** Click **Auto**.  
3. **Automatic Process:**
   - 🧽 *Inpainting:* Cleans each OCR Box area.  
   - 🌐 *Translation:* Translates all OCR texts in one request.  
   - 📝 *Creation:* Generates translated text boxes for each OCR Box.

---

## 🪄 Manual Translation Process (Step-by-Step)

This workflow breaks down the automatic process, giving **full control** over each stage.

---

### 1️⃣ Creating Selection Areas

#### 🔹 Magic Wand
- Activate from the *Tool Panel*.  
- Click on the text to select pixels of similar color.  
- Adjust **Tolerance** to refine the selection.

#### 🔹 Manual Selection
- Activate the tool and drag to draw a rectangular selection.

#### ✏️ Modify Selection
- **Add:** `Shift`  
- **Subtract:** `Alt`  
- **Quick Buttons:**  
  - ❌ *Clear Selection*  
  - 🔁 *Recall Selection*

---

### 2️⃣ Performing OCR (Text Extraction)

1. Create or select an area covering the source text.  
2. Click **OCR**.  
3. The app creates a **vector OCR Box** and extracts the text.  
4. Extracted text appears in the **Source Text** field of the *Tool Panel*.

---

### 3️⃣ Background Cleaning (Inpainting)

1. Select or recall the last area.  
2. Click **Inpaint**.  
3. The algorithm fills the area with surrounding colors, removing the text.  
4. Options:
   - 🎨 *Automatic Color*  
   - 🖌️ *Manual Color*  
5. For manual refinements, use **Brush** and **Eraser**.

---

### 4️⃣ Performing Translation

1. Once OCR Boxes are ready, click **Translate**.  
2. The app sends the source text to the translation API.  
3. New **translated Text Boxes** are created for each OCR Box.

---

### 5️⃣ Text Formatting and Refinement

#### ✏️ Edit and Review
- Click a **Text Box** to select it.  
- Edit text in the **Display Text** field or directly on the *canvas* via double-click.

#### 🎨 Formatting
Use controls in *Tool Panel → Text Formatting* for:
- 🅰️ Font and size  
- 🧭 Alignment (left, center, right)  
- 🔠 Bold and italic  
- 🎨 Text and outline color  
- 📏 Line and word spacing

#### 🪶 Positioning
- Drag to move boxes.  
- Use handles to **resize** or **rotate**.  
- Align text perfectly inside the comic balloon.

---

## 💡 Final Tip

For best results:  
> 🔧 Alternate between **Auto** mode for speed and **Manual** mode for precision.

---

# 🧩 Chapter 4 — Detailed Features

This chapter explores each feature of the application, explaining in practical terms how to make the best use of every tool to achieve precise and professional results.

---

## 🎯 Selection and Cleanup

Creating accurate selections is the first essential step toward a clean result.  
These tools allow you to isolate the original text precisely from everything else.

---

### ✨ Using the Magic Wand and Tolerance

The **Magic Wand** is the fastest tool for selecting areas of uniform color, such as black text on a white background.

- **How it works:** click on a pixel of the text; the app will automatically select all adjacent pixels of similar color.  
- **Tolerance:** adjust sensitivity using the **Tolerance** slider in the Tool Panel:
  - 🔹 *Low value (e.g., 10):* selects only very similar colors.  
  - 🔹 *High value (e.g., 100):* includes a broader range of shades.  
  - 💡 *Tip:* increase tolerance for colored or gradient text.

---

### 🟩 Creating Manual Selections (Add / Subtract Areas)

The **Manual Selection** tool allows you to draw rectangular selections.

- **How it works:** drag your mouse on the image to draw a rectangle.  
- **Modifier Keys:**
  - ⬆️ **Shift:** adds the new area to the current selection.  
  - ⬇️ **Alt:** subtracts the area from the current selection.

---

### 🧽 Refining Selections with the Selection Eraser

The **Selection Eraser** lets you remove unwanted parts of a selection.

- **Use:** click and drag to erase portions of the selection.  
- **Purpose:** perfect for separating merged letters or refining complex edges.  
- **Settings:** the eraser size is adjustable in the Tool Panel.

---

### 🎨 Inpainting (Automatic and Manual)

**Inpainting (Fill)** removes the original text and reconstructs the background.

- 🧠 **Automatic Mode (Auto-Color):** analyzes edges to rebuild realistic textures and gradients.  
- 🎛️ **Manual Mode:** fills the selection with a solid color chosen manually — perfect for uniform balloons.

---

### 🔁 Clearing and Recalling the Last Selection

- ❌ **Clear Selection:** removes any active selection.  
- ♻️ **Recall Selection:** reactivates the last used selection — useful after OCR to immediately perform inpainting.

---

## 🧱 Box Management

“Boxes” are the core elements of the entire workflow.  
They are divided into two categories: **OCR Boxes** (text extraction) and **Text Boxes** (translated text).

---

### 📦 Creating OCR Boxes and Text Boxes

- **OCR Boxes**
  - ✋ Manual → create a selection → click **OCR**.  
  - ⚙️ Automatic → create a selection → click **Auto**.  
  - 🎨 Appearance: dashed amber border.  

- **Text Boxes**
  - ⚙️ Automatic → generated after **Translate** or **Auto**.  
  - ✍️ Manual → click **Add Text** to create an empty one.  
  - 🎨 Appearance: green border when selected.

---

### 🖱️ Selecting, Moving, and Resizing Boxes

- **Select:** single click to select; **Shift** for multiple selections.  
- **Move:** drag the box to reposition it.  
- **Resize:** use the corner handles.  
- **Rotate:** drag the circular handle above the box.

---

### ✏️ Inline Text Editing

Double-click a **Text Box** to edit it directly on the canvas.  
Press **Esc** or click outside the box to end inline editing.

---

### ✂️ Splitting a Text Box

Useful for dividing a sentence into multiple balloons.

1. Select the box.  
2. Place the cursor in the desired point within the **Text Preview**.  
3. Click **Split Box** → the text divides into two separate boxes, preserving style.

---

## 🅰️ Advanced Text Formatting

The **Text Formatting Panel** allows full control over the appearance of translated text.

---

### 🎨 Applying Styles (Font, Size, Color, Outline)

- **Font and Size:** dropdown menu and numeric field.  
- **Color and Outline:** color pickers and outline thickness.  
  - 🖍️ Thickness 0 → no outline.

---

### 🔠 Quick Typographic Styles

- **B / I:** bold and italic.  
- **Aa:** toggle uppercase/lowercase.  
- **A²:** superscript for notes or sound effects.

---

### 🧭 Alignment and Spacing

- 🧍‍♂️ **Alignment:** left / center / right.  
- 📏 **Line Spacing:** adjusts vertical distance between lines.  
- ↔️ **Word Spacing:** adjusts horizontal distance between words.

---

### ⚡ Quick Styles (F1 / F2)

- 💾 **Save a Style:**  
  Select a box → **Shift + F1/F2** → the style is saved.  
- 🎯 **Apply a Style:**  
  Select a box → **F1/F2** → apply the saved style.

---

### 🔄 Importing and Exporting Translated Text (.json)

- ⬇️ **Export:** generates a `.json` file with all translated texts.  
- ⬆️ **Import:** updates text boxes by loading a `.json` file with the same IDs.

---

## 🎨 Drawing and Retouching

For manual corrections or background reconstruction, the drawing tools offer full control.

---

### 🖌️ Using the Brush and Eraser

- **Brush:** paints directly on the image.  
- **Eraser:** removes unwanted parts, making them transparent.  
- 💡 Ideal for touch-ups after inpainting.

---

### ⚙️ Tool Options

When activating Brush or Eraser, you can adjust:

- 🎨 **Color (Brush only)**  
- ⚫ **Size**  
- 🪶 **Hardness**  
- 🌫️ **Opacity**

---

## 🖼️ Modal Image Editor

The Image Editor provides advanced tools for focused edits on portions or layers.

---

### 🚪 How to Open

- **From Selection:** create an area → click **Image Editor**.  
- **From Image Layer:** select a layer → click **Image Editor**.

---

### 🧰 Editor Tools

- 🖌️ **Brush / Eraser / Eyedropper**  
- ✂️ **Lasso Erase:** draw a freeform shape to erase.  
- 🪄 **Magic Brush:** restores original areas of the image.

---

### 🔍 Image Transformations

- 🖐️ **Move:** drag to reposition.  
- 🧭 **Zoom:** use the mouse wheel.  
- 🔄 **Rotate:** hold **Shift** and scroll to rotate.  
- 🔁 **Reset Transform:** restores the original state.

---

### 🌞 Adjustments: Brightness and Contrast

In the right panel, you can adjust **brightness** and **contrast** in real time to balance image tones.

---

### ✅ Applying or Canceling Changes

- 💾 **Apply:** confirms and merges changes into the main canvas.  
- ❎ **Cancel:** closes the editor without saving.

---

> 🧭 **Final Note:**  
> The features described in this chapter form the operational foundation for comic typesetting and post-production.  
> Mastery of selection, box, and formatting tools is the key to achieving professional results.
---

# 📦 Chapter 5 — Export and Save

Once the translation and *typesetting* are complete, **Comics Magic Translator** offers several options to export your finished work.  
The saving modes cover every need: from sharing a single page to archiving an entire chapter or project.

---

## 🖼️ Save the Current Page as a Single Image (PNG, JPG, WebP)

This mode is perfect for quickly saving **a single page**, useful for previews, reviews, or fast sharing.

### 🔧 How to Use

1. Make sure the page you want to save is **active in the Workspace (Canvas)**.  
2. Open the **Tools Panel**, under the **Export** section.  
3. Click **Save Current Image**.  
4. A dialog box will appear with configuration options.

### ⚙️ Export Options

- **Format:**  
  - **PNG** → lossless quality, ideal for maximum fidelity.  
  - **JPG** → lossy quality, lighter files.  
  - **WebP** → modern format with excellent quality-size balance.

- **Quality (for JPG/WebP only):**  
  A *slider* adjusts quality from **0 to 100**.  
  Higher values = better quality but heavier files.

### 📤 Result

A **single image file** will be generated, merging all visible elements:  
the base artwork (including any cleaning or retouches) and the **text boxes** rendered with their final formatting.

---

## 🗂️ Export All Pages into a `.zip` File

Ideal for exporting **an entire chapter or project**, collecting all modified pages into a single compressed archive.

### 🔧 How to Use

1. Open the **Export Panel**.  
2. Click **Save All as ZIP**.  
3. In the dialog box, select image format and quality.

### ⚙️ Export Options

Same as for single-page saving:

- **Format:** PNG, JPG, WebP  
- **Quality:** adjustable via slider (for JPG and WebP)

### 📦 Result

A **`.zip` file** will be generated containing all exported pages.  
Inside, each page will be saved as an image, keeping its **original filename**.

---

## 📄 Export All Pages as a Single `.pdf` File

This option is perfect for creating a **ready-to-read or shareable document**, automatically arranging all comic pages.

### 🔧 How to Use

1. From the **Export Panel**, click **Save as PDF**.  
2. The app will render each page as a final image.  
3. All pages will then be combined into **a single PDF file**, following the order shown in the File Panel.

### ⚙️ Export Options

Same as other modes:

- **Format:** PNG, JPG, or WebP  
- **Quality:** adjustable for lossy formats

### 📕 Result

A **single `.pdf` file** will be downloaded, where each comic page corresponds to one page in the document.  
The order will match the **File Panel**, ensuring a coherent and sequential reading experience.

---

> 💡 **Tip:**  
> Before exporting to ZIP or PDF, make sure all texts are correct and aligned.  
> The export process saves the current visual state, including all layers and formatting.

---
# 🪟 Chapter 6 — Auxiliary Windows

In addition to the main panels, **Comics Magic Translator** includes several **floating and resizable auxiliary windows**, designed to assist in the translation process without cluttering the main workspace.

---

## 🖼️ Original Image Viewer

This window is an essential tool for **quality control**.  
It allows you to view the **original, unmodified page** alongside the active version in the *main canvas*.

### 🎯 Purpose

- **Direct Comparison:**  
  Displays the translated and original versions side by side, useful for checking fidelity and text placement.

- **Cleaning Verification:**  
  Helps ensure that the *inpainting* process has completely removed the source text without artifacts or smudges.

- **Retouch Reference:**  
  During manual retouching, it allows you to replicate textures and colors by observing the original in real time.

### ⚙️ How It Works

- **Opening:**  
  Open it by clicking **Compare with Original**, located in the application header.

- **Floating Window:**  
  Appears as an **independent panel** that can be freely moved by dragging its title bar.

- **Independent Navigation:**  
  Inside, the image can be:  
  - **Zoomed in/out** with the mouse wheel  
  - **Panned** by dragging with the left mouse button  
  These controls are independent of the main canvas, allowing you to zoom in on different areas between the two views.

- **Closing:**  
  Close it by clicking the **“X” icon** in the window header.

---

## 📝 Project Notes

The **Notes Panel** is an **integrated notepad** designed to record useful information during translation or typesetting.

### 🎯 Purpose

- **Translation Notes:**  
  To record specific terms, stylistic choices, or lines to review later.

- **Typesetting Reminders:**  
  Notes on fonts to use, alignments to fix, or areas to retouch.

- **Collaboration:**  
  In a team workflow, notes can be left for the **proofreader** or **quality checker**.

### ⚙️ How It Works

- **Opening and Management:**  
  Open it using the **note icon** located beside the canvas.  
  It’s a floating window that can be freely moved around the screen.

- **Creating Notes:**  
  Click **Add Note** to generate a new editable box.

- **Priority Levels:**  
  Each note can be classified as:  
  - 🟢 **Normal**  
  - 🟡 **Important**  
  - 🔴 **Critical**  
  The border color changes according to priority, providing quick visual recognition.

- **Automatic Saving:**  
  All notes are included in the `.cmt.zip` project file when using the **Save Project** function.

- **Import/Export:**  
  Notes can be exported to a `.json` file for sharing or external editing.  
  They can later be **reimported into the project**.  
  This feature is particularly useful for translators and typesetters working separately.

---

> 💡 **Tip:**  
> Keep the Original Viewer and Notes Panel open during final review.  
> They help ensure both visual and linguistic consistency throughout the chapter.

---

# ⚙️ Chapter 7 — Settings and Preferences

The **Settings** (or Preferences) window, accessible via the **gear icon** in the header, is the control center for **customizing every aspect of Comics Magic Translator**.  
Here you can tailor the app to your workflow, manage languages, fonts, and more.  
Settings are organized into **profiles** for maximum flexibility.

---

## 🗂️ Profile Management

A **profile** is a saved set of all the app’s settings.  
You can create different profiles for different comics (e.g., B/W manga, colored webtoons) or for different roles (translator, typesetter).

### 🔹 Creating a Profile

1. Go to the **Profiles** section.  
2. The displayed settings belong to the **active profile**, selected in the dropdown menu.  
3. To create a new profile based on the current one, enter a name in the **New profile name…** field.  
4. Click **Save as New Profile**. The new profile will immediately become active.

### 🔹 Saving, Importing, and Exporting Profiles

- **Active Profile Selection:** Use the dropdown menu to choose which profile to edit. All changes in other settings sections will apply to this profile.  
- **Saving:** Changes to a profile are automatically saved when clicking **Save & Close**.  
- **Exporting:** Click **Export Profile** to generate a `.prof` file to share or archive.  
- **Importing:** Click **Import Profile** to load a `.prof` file. If the profile ID already exists, the app will ask for confirmation before overwriting it.

---

## 🌐 Translation Settings

This section controls the languages used by the app.

- **Default Target Language:**  
  Sets the language you want to translate comics into.  
  This will be the default for the **Translate** and **Auto** buttons, and can be changed from the toolbar.

- **Interface Language:**  
  Changes the language of menus, buttons, and labels in the app.

---

## 🔑 API Key Configuration

To use the **AI-powered OCR and translation** features, you must provide an API key for **Google Gemini**.

### 🔹 Getting an API Key

- Visit **Google AI Studio** to obtain a free API key.

### 🔹 How to Set It

1. Go to the **API Key** section.  
2. Paste the key into the text field. The key is saved locally in the browser.  
3. Click **Save API Key**.  
4. **Fallback:** If no key is found in the browser, the app will look for one in a `.env.local` file in the project folder (developer option).

---

## 🔤 Font Management

This section allows you to **manage the available fonts** for typesetting, including your custom ones.

### 🔹 Loading Fonts

- **Load System Fonts:**  
  If supported by the browser, this lets you add fonts installed on your computer. Fonts are saved in the browser database for future use.

- **Load Font Files:**  
  Upload `.ttf`, `.otf`, or `.woff` files directly from your computer.

- **Clear Stored Fonts:**  
  Removes all manually or system-loaded fonts.

### 🔹 Selecting Visible Fonts

- The list displays all available fonts (default, system, and uploaded).  
- Check or uncheck boxes to decide which fonts appear in the **FontSelector** tool menu.  
- Use **Select All / Deselect All** for quick changes.

---

## 🖥️ Layout Customization

Adapt the workspace to your preferences and screen size.

- **Panel Widths:**  
  Set the percentage width for the three main panels:  
  - Left (Files/Layers)  
  - Center (Canvas)  
  - Right (Tools)  
  The central panel width is calculated automatically.

- **Text Area Heights:**  
  Set the pixel height for the **Source Text** and **Display Text** areas. Useful for long dialogues.

- **Reset Layout:**  
  Restores width and height settings to their defaults.

---

