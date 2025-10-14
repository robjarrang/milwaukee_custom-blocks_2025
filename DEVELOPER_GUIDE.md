# Milwaukee Custom Blocks - Developer Guide

## What Are Custom Blocks?

Custom blocks are reusable content components that integrate directly into Salesforce Marketing Cloud (SFMC) Content Builder. They allow marketers to drag and drop sophisticated email components without writing code, while maintaining brand consistency and email client compatibility.

### How It Works

1. **Development** - Developers create self-contained HTML modules (each in its own folder)
2. **Deployment** - Modules are published to GitHub Pages, generating a unique URL for each module
3. **Integration** - Each module's URL is registered as a Custom Block in SFMC Content Builder
4. **Usage** - Marketers drag the custom block into emails and configure it using a user-friendly interface
5. **Output** - The block generates email-safe HTML that renders correctly across all email clients

### Project Structure

```
milwaukee_custom-blocks_2025/
├── DEVELOPER_GUIDE.md          ← You are here
├── _base-template/             ← Starting point for new modules
│   ├── index.html              ← Module code
│   ├── README.md               ← Template usage guide
│   └── icon.png, dragIcon.png  ← Content Builder icons
├── shared-assets/              ← Shared utilities
│   └── quill-config.js         ← Text editor configuration
└── [module-name]/              ← Individual modules
    ├── index.html              ← Module code (published to GitHub Pages)
    ├── icon.png                ← Module icon in Content Builder
    └── dragIcon.png            ← Drag handle icon
```

### GitHub Pages Integration

When this repository is published to GitHub Pages:
- Each module's `index.html` is accessible via a URL like:  
  `https://[username].github.io/milwaukee_custom-blocks_2025/[module-name]/`
- This URL is used as the Custom Block endpoint in SFMC
- Updates to the repository automatically update the live blocks
- Marketers always get the latest version when dragging blocks into emails

### Module Types

This collection includes various block types:
- **Content Blocks** - Text and image layouts (one-column-story, two-column-story, full-width-story)
- **Interactive Elements** - Buttons, carousels, hotspots
- **Structured Content** - Checklists, stats, product features
- **Layout Components** - Spacers, banners, accordions, event lists

## Overview
This collection contains custom email blocks for Salesforce Marketing Cloud Content Builder, designed specifically for Milwaukee Tool's email campaigns. Each block follows a consistent structure and uses shared utilities to ensure maintainability and ease of modification.

## Technology Stack

### Core Libraries
- **Salesforce Marketing Cloud BlockSDK** - Integration with Content Builder
- **Quill 2.0.3** - Rich text editor for formatted content
- **QuillConfigManager** - Custom configuration manager for email-optimized text editing

### Shared Utilities
All modules use centralized utilities located in `shared-assets/`:

#### quill-config.js
Provides consistent Quill editor configuration across all modules:
- **QuillConfigManager.getEditorConfig(type)** - Returns editor configuration for different use cases:
  - `'minimal'` - Bold only (for titles)
  - `'basic'` - Bold, Italic, Link (for descriptions)
  - `'title'` - Bold, Superscript (for branded titles)
  - `'description'` - Bold, Italic, Link (general content)
- **QuillConfigManager.sanitizeForEmail(html)** - Converts editor HTML to email-safe markup:
  - Preserves line breaks (`<br>` tags) when Enter key is pressed
  - Converts block elements (`</p>`, `</div>`) to `<br>` tags
  - Removes non-breaking spaces (`&nbsp;`) that prevent text wrapping
  - Cleans up excessive line breaks
- **QuillConfigManager.getCleanContent(editor, type)** - Gets optimized content from editor instance
- **QuillConfigManager.cleanup(editor)** - Properly destroys editor instances and removes event listeners

### Key Features
- **HTML Editor Tab** - All modules include `tabs: ['htmlblock']` in BlockSDK initialization for raw HTML editing
- **Line Break Preservation** - Rich text editors properly handle Enter key presses, converting them to `<br>` tags
- **Memory Management** - Advanced cleanup using WeakMap and FinalizationRegistry patterns
- **Debounced Updates** - 300-400ms debouncing for smooth UX without excessive saves
- **URL Validation** - Built-in validation for URL fields with visual feedback

## File Structure
Each block contains:
- **Editor Interface Styles**: CSS for the configuration interface (editor)
- **JavaScript Logic**: Block configuration, data management, and template generation
- **Email Template Generation**: Functions that create the final HTML for emails
- **Email Client Compatibility**: CSS and HTML for various email client support

## Commenting Patterns

### 1. Section Headers
Major sections are marked with clear block comments:
```css
/* ============================================
   SECTION NAME
   Brief description of what this section does
   ============================================ */
```

### 2. Editor Interface Comments
Editor styles are clearly separated from email styles:
```css
/* ============================================
   EDITOR INTERFACE STYLES
   (These styles are for the block configuration interface only)
   ============================================ */
```

### 3. Email Template Comments
Email generation functions include comprehensive comments:
```javascript
/* ============================================
   EMAIL TEMPLATE GENERATION
   This function generates the final HTML that will be rendered in emails
   ============================================ */
```

### 4. HTML Structure Comments
Email HTML includes structural comments for clarity:
```html
<!-- ==========================================
     INTERACTIVE CAROUSEL SECTION
     (Hidden by default, shown only in supporting email clients)
     ========================================== -->
```

### 5. CSS Comments for Email Clients
Email CSS includes explanations for compatibility:
```css
/* Email client compatibility reset */
/* Hide radio button controls from view but keep them functional */
/* Interactive functionality for modern email clients */
```

## Key Areas for Email Developers

### Email Template Generation Functions
Look for `generateTemplate()` functions - these create the final email HTML. Key points:
- **Fallback Content**: Always include fallback for unsupported email clients
- **Table Structure**: Use proper table-based layouts for email compatibility
- **Inline Styles**: Critical styles should be inline for email client support

### Email Client Compatibility
Each block includes multiple compatibility layers:
1. **Modern Clients**: Full interactive functionality
2. **Limited Clients**: Static fallback content
3. **Outlook**: Specific targeting with conditional comments
4. **Mobile**: Responsive design considerations

### Common Patterns

#### Standard Email Width
All blocks use 620px total width:
- 20px left gutter
- 580px content area  
- 20px right gutter

#### Brand Colors
- Primary Red: `#DB021D` (Milwaukee brand red)
- Secondary Black: `#000000` or `#313131`

#### Typography
- Headers: `'Helvetica Neue LT W05_93 Blk E', Arial, sans-serif`
- Body: `'Helvetica Neue LT W05_55 Roman', sans-serif`

## Modifying Email Output

### To change the visual appearance:
1. Locate the `generateTemplate()` function
2. Modify the HTML structure and inline styles
3. Update CSS in the `<style>` blocks for interactive elements
4. Test in multiple email clients

### To add new fields:
1. Add to `moduleConfig.fields`
2. Update the editor interface HTML
3. Modify `generateTemplate()` to use the new field
4. Update form validation if needed

### To modify interactive behavior:
1. Update CSS transitions and states
2. Modify the dynamic CSS generation
3. Ensure fallback content remains accessible

## Email Client Testing
Always test changes in:
- Outlook (Desktop & Web)
- Apple Mail
- Gmail (Web & Mobile)
- Thunderbird
- Mobile email apps

## Creating New Modules

### Using the Base Template
A comprehensive base template is available at `_base-template/` that includes all modern patterns and best practices:

1. **Copy the template:**
   ```bash
   cp -r _base-template your-new-module-name
   ```

2. **Customize the module** - See `_base-template/README.md` for detailed instructions

3. **Key files to modify:**
   - `index.html` - Update moduleConfig, UI elements, and generateTemplate()
   - `icon.png` - Main icon for Content Builder (update with your design)
   - `dragIcon.png` - Drag handle icon (update with your design)

### Module Checklist
Before deploying any module:
- [ ] Include `shared-assets/quill-config.js` script tag
- [ ] Initialize BlockSDK with `tabs: ['htmlblock']` for HTML Editor access
- [ ] Use QuillConfigManager for all rich text fields
- [ ] Implement proper editor cleanup (WeakMap pattern)
- [ ] Add debouncing to all user input handlers (300-400ms)
- [ ] Validate URLs with built-in validators
- [ ] Test in all major email clients (see Email Client Testing section)
- [ ] Verify line breaks work correctly (Enter key creates visible breaks)
- [ ] Ensure data persists after page refresh
- [ ] Check mobile responsiveness

## Best Practices

### Rich Text Editing
1. **Always use QuillConfigManager** - Don't create Quill instances manually
2. **Call sanitizeForEmail()** - Use this function in updateDataFromUI() to ensure proper email formatting
3. **Preserve line breaks** - Avoid double-sanitization that strips `<br>` tags
4. **Clean up editors** - Use QuillConfigManager.cleanup() when destroying editors

### Email Compatibility
1. **Always provide fallback content** for email clients that don't support interactive elements
2. **Use inline styles** for critical styling that must work across all clients
3. **Test thoroughly** - email clients have vastly different capabilities
4. **Avoid non-breaking spaces** - They prevent text wrapping on mobile devices
5. **Use table-based layouts** - Most reliable structure for email HTML

### Code Organization
1. **Keep accessibility in mind** - use proper alt text and semantic markup
2. **Follow Milwaukee brand guidelines** - for colors, fonts, and styling
3. **Track event listeners** - Store references for proper cleanup
4. **Use WeakMap for editor references** - Prevents memory leaks
5. **Implement retry logic** - For BlockSDK initialization failures

### Data Management
1. **Debounce user input** - 300-400ms prevents excessive saves
2. **Use type-safe getters** - Always validate field values with fallbacks
3. **Sanitize once, use everywhere** - Avoid processing content multiple times
4. **Handle visibility changes** - Refresh data when Content Builder tab becomes visible

## Support
For questions about these blocks or email development best practices:
- See `_base-template/README.md` for template-specific guidance
- Consult Milwaukee Tool brand guidelines
- Review existing module implementations for patterns
- Check `shared-assets/quill-config.js` for text editing utilities
