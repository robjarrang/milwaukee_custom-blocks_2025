# Copilot Instructions for Milwaukee Custom Blocks

## Repository Overview

This repository contains **custom email blocks for Salesforce Marketing Cloud (SFMC) Content Builder**, designed for Milwaukee Tool email campaigns. It is a **static HTML/CSS/JavaScript project** with no build system—files are served directly via **GitHub Pages**.

- **Languages:** HTML, CSS, JavaScript (vanilla ES6+)
- **Frameworks:** Quill.js 2.0.3 (rich text editor), SFMC BlockSDK
- **Size:** ~17 modules, ~15,000 lines total
- **Deployment:** GitHub Pages (automatic on push to `main`)
- **No build step required**—changes to HTML files are deployed directly

## Project Structure

```
milwaukee_custom-blocks_2025/
├── DEVELOPER_GUIDE.md          # Primary documentation - READ FIRST
├── _base-template/             # Template for creating new modules
│   ├── index.html              # Copy this for new modules
│   └── README.md               # Template-specific instructions
├── shared-assets/              # Shared libraries (DO NOT DUPLICATE)
│   ├── quill-config.js         # QuillConfigManager - ALWAYS USE THIS
│   ├── quill.js                # Quill library (minified)
│   ├── quill.snow.css          # Quill styles
│   ├── customblock-bundle.js   # Shared SFMC utilities
│   └── customblock-styles.css  # Shared editor styles
└── [module-name]/              # Individual modules (16 total)
    ├── index.html              # Module code - self-contained
    ├── icon.png                # Content Builder icon
    └── dragIcon.png            # Drag handle icon
```

## Key Architectural Patterns

### Module Structure
Each module's `index.html` contains everything: CSS, HTML editor UI, and JavaScript. All modules follow this structure:

1. **Early SFMC Handshake** (line ~8): Required script to prevent timeout
2. **CSS Styles**: Editor UI styles (not email output)
3. **HTML Body**: Configuration form for marketers
4. **JavaScript**:
   - `moduleConfig` object with field definitions
   - `state` object for runtime data
   - `initializeEditors()` using `QuillConfigManager`
   - `generateTemplate()` returns email HTML output
   - Event handlers with debouncing (300-400ms)

### Critical Constants (Email Output)
- **Total width:** 620px (20px gutters + 580px content)
- **Milwaukee Red:** `#DB011C`
- **Milwaukee Black:** `#000000` or `#313131`
- **Header font:** `'Helvetica Neue LT W05_93 Blk E', Arial, sans-serif`
- **Body font:** `'Helvetica Neue LT W05_55 Roman', sans-serif`

### Required Patterns
- **Always use `QuillConfigManager`** for rich text editors (never instantiate Quill directly)
- **Always include** `tabs: ['htmlblock']` in BlockSDK initialization
- **Always call** `QuillConfigManager.sanitizeForEmail()` for email content
- **Always use** table-based layouts in `generateTemplate()` output
- **Always include** WeakMap cleanup pattern for editors

## Development Workflow

### No Build System
This project has **no npm scripts, no webpack, no compilation**. Files are edited and served directly.

### Local Testing
Start a local server from the repository root:
```bash
cd "/path/to/milwaukee_custom-blocks_2025"
python3 -m http.server 8000
```
Then open `http://localhost:8000/[module-name]/` in a browser.

**Note:** Modules require SFMC Content Builder context to fully function. Local testing validates HTML/CSS/JS syntax but not SFMC integration.

### Validation Checklist
Before committing changes, verify:
- [ ] No JavaScript syntax errors (check browser console)
- [ ] All field names in `moduleConfig.fields` match UI element IDs
- [ ] `generateTemplate()` returns valid HTML string
- [ ] Rich text uses `QuillConfigManager.getCleanContent(editor, true)`
- [ ] URLs validated with `utils.isValidUrl()`
- [ ] Number inputs use step="4" for pixel values
- [ ] Shared assets loaded via relative paths (`../shared-assets/`)

## Creating New Modules

1. **Copy the base template:**
   ```bash
   cp -r _base-template your-new-module-name
   ```

2. **Update `moduleConfig`** with your fields

3. **Modify `generateTemplate()`** to output email-safe HTML

4. **Test locally** then commit

**Never duplicate shared assets into module folders.**

## Code Conventions

### JavaScript
- Use `'use strict';` at top of script blocks
- Use `const`/`let` (never `var`)
- Debounce all input handlers (300-400ms)
- Track event listeners in `state.eventListeners` array for cleanup
- Use `utils.getFieldValue()` for safe field access with defaults

### CSS
- Editor styles: standard CSS in `<style>` block
- Email output: **inline styles only** for compatibility
- Use email-safe properties (no flexbox/grid in output)

### HTML (Email Output)
- Use `<table>` layouts with `role="presentation"`
- Include `border="0" cellpadding="0" cellspacing="0"`
- Use `&nbsp;` for spacing, not margins
- Use `mso-line-height-rule: exactly` for Outlook

## Common Pitfalls

| Issue | Solution |
|-------|----------|
| Editor not initializing | Ensure Quill and QuillConfigManager scripts load before module script |
| Preview not updating | Verify `refreshPreview()` is called after data changes |
| Line breaks lost | Use `QuillConfigManager.sanitizeForEmail()` (preserves `<br>` tags) |
| Non-breaking spaces | QuillConfigManager handles this automatically |
| Memory leaks | Always call `QuillConfigManager.cleanup()` on destroy |

## File Reference

| File | Purpose |
|------|---------|
| `DEVELOPER_GUIDE.md` | Comprehensive development guide |
| `_base-template/README.md` | Template usage and field types |
| `shared-assets/README.md` | QuillConfigManager API reference |
| `shared-assets/quill-config.js` | Editor presets: `minimal`, `basic`, `title`, `button`, `description` |

## Deployment

Deployment is automatic via GitHub Pages on push to `main`. Each module becomes accessible at:
```
https://robjarrang.github.io/milwaukee_custom-blocks_2025/[module-name]/
```

**There is no CI/CD pipeline or automated testing.** Manual browser testing is required.

---

**Trust these instructions.** Only search the codebase if information here is incomplete or produces errors. The `DEVELOPER_GUIDE.md` and `_base-template/README.md` files contain additional details not covered here.
