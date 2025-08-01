# Milwaukee Custom Blocks - Developer Guide

## Overview
This collection contains custom email blocks for Salesforce Marketing Cloud Content Builder, designed specifically for Milwaukee Tool's email campaigns. Each block follows a consistent structure and commenting pattern to ensure maintainability and ease of modification.

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

## Best Practices
1. **Always provide fallback content** for email clients that don't support interactive elements
2. **Use inline styles** for critical styling that must work across all clients
3. **Test thoroughly** - email clients have vastly different capabilities
4. **Keep accessibility in mind** - use proper alt text and semantic markup
5. **Follow Milwaukee brand guidelines** for colors, fonts, and styling

## Support
For questions about these blocks or email development best practices, consult the Milwaukee Tool brand guidelines and email development documentation.
