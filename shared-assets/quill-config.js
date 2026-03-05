/**
 * Shared Quill.js Configuration for Milwaukee Custom Blocks
 * Optimized for email content creation and SFMC compatibility
 */

/**
 * Custom Quill Embed Blot for intentional non-breaking spaces.
 * Uses an embed blot so it survives all nbsp-stripping layers
 * (which operate on getText() — embeds return \uFFFC, not \u00A0).
 * Renders as <span class="ql-nbsp"> </span> in the editor DOM.
 */
(function registerNbspBlot() {
    if (!window.Quill) return; // Will be called again after Quill loads

    const Embed = window.Quill.import('blots/embed');

    class NonBreakingSpaceBlot extends Embed {
        static blotName = 'nbsp';
        static tagName = 'span';
        static className = 'ql-nbsp';

        static create() {
            const node = super.create();
            node.innerHTML = '\u00A0';
            node.setAttribute('contenteditable', 'false');
            return node;
        }

        static value() {
            return true;
        }

        length() {
            return 1;
        }
    }

    window.Quill.register(NonBreakingSpaceBlot, true);
})();

/**
 * Custom Quill Embed Blot for intentional line breaks.
 * Supports two types: standard (<br>&nbsp;) and mobile-hide (<br class="mobile-hide">&nbsp;).
 * Renders as <span class="ql-linebreak" data-type="..."> in the editor DOM.
 */
(function registerLineBreakBlot() {
    if (!window.Quill) return;
    const Embed = window.Quill.import('blots/embed');

    class LineBreakBlot extends Embed {
        static blotName = 'linebreak';
        static tagName = 'span';
        static className = 'ql-linebreak';

        static create(value) {
            const node = super.create();
            const type = value || 'standard';
            node.setAttribute('data-type', type);
            node.setAttribute('contenteditable', 'false');
            const labels = {
                'standard': '\u21B5',
                'mobile-hide': '\u21B5M',
                'mso-only': '\u21B5O',
                'non-mso': '\u21B5!O'
            };
            node.innerHTML = labels[type] || '\u21B5';
            return node;
        }

        static value(node) {
            return node.getAttribute('data-type') || 'standard';
        }

        length() {
            return 1;
        }
    }

    window.Quill.register(LineBreakBlot, true);
})();

class QuillConfigManager {
    static DEFAULT_TIMEOUT = 5000;
    static DEBOUNCE_DELAY = 300;
    
    // Predefined toolbar configurations for different use cases
    static TOOLBAR_PRESETS = {
        minimal: [['bold']],
        basic: [['bold', 'italic'], ['link']],
        title: [['bold'], [{ 'script': 'super' }], ['nbsp'], ['linebreak']],
        button: [[{ 'script': 'super' }]],
        description: [['bold', 'italic'], [{ 'script': 'super' }], ['link'], ['nbsp'], ['linebreak']]
    };

    // Format configurations optimized for email
    static FORMAT_PRESETS = {
        minimal: ['bold'],
        basic: ['bold', 'italic', 'link'],
        title: ['bold', 'script', 'nbsp', 'linebreak'],
        button: ['script'],
        description: ['bold', 'italic', 'script', 'link', 'nbsp', 'linebreak']
    };

    // Email-optimized Quill configurations
    static BASE_CONFIG = {
        theme: 'snow',
        modules: {
            clipboard: { 
                matchVisual: false,
                // Strip formatting that doesn't work well in email
                matchers: [
                    // Convert non-breaking spaces to regular spaces
                    [Node.TEXT_NODE, function(node, delta) {
                        if (typeof node.data === 'string') {
                            // Replace all non-breaking spaces with regular spaces
                            const text = node.data.replace(/\u00A0/g, ' ').replace(/&nbsp;/g, ' ');
                            return new (window.Quill.import('delta'))().insert(text);
                        }
                        return delta;
                    }],
                    // Remove problematic paragraph formatting
                    ['P', function(node, delta) {
                        return delta.compose(new (window.Quill.import('delta'))().retain(delta.length(), { 'block-format': null }));
                    }],
                    // Clean up any remaining non-breaking spaces from HTML
                    ['*', function(node, delta) {
                        if (node.innerHTML) {
                            node.innerHTML = node.innerHTML.replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ');
                        }
                        return delta;
                    }]
                ]
            },
            // Configure keyboard module to prevent non-breaking spaces
            keyboard: {
                bindings: {
                    // Override space key to insert regular space
                    space: {
                        key: ' ',
                        handler: function(range, context) {
                            this.quill.insertText(range.index, ' ', 'user');
                            this.quill.setSelection(range.index + 1, 0, 'user');
                            return false;
                        }
                    }
                }
            }
        }
    };

    /**
     * Creates optimized Quill configuration for specific use cases
     * @param {string} type - Type of editor (minimal, basic, title, button, description)
     * @param {Object} options - Additional options
     * @returns {Object} Quill configuration object
     */
    static createConfig(type = 'basic', options = {}) {
        const {
            placeholder = 'Enter text...',
            maxLength = null,
            customToolbar = null,
            customFormats = null,
            additionalModules = {}
        } = options;

        const toolbar = customToolbar || this.TOOLBAR_PRESETS[type] || this.TOOLBAR_PRESETS.basic;
        const formats = customFormats || this.FORMAT_PRESETS[type] || this.FORMAT_PRESETS.basic;

        return {
            ...this.BASE_CONFIG,
            modules: {
                ...this.BASE_CONFIG.modules,
                toolbar,
                ...additionalModules
            },
            formats,
            placeholder
        };
    }

    /**
     * Initializes a Quill editor with error handling and optimization
     * @param {HTMLElement} element - Container element
     * @param {string} type - Editor type
     * @param {Object} options - Configuration options
     * @returns {Promise<Object>} Quill instance
     */
    static async initializeEditor(element, type = 'basic', options = {}) {
        if (!element) {
            throw new Error('Editor container element is required');
        }

        // Wait for Quill to be available
        await this.waitForQuill();

        const config = this.createConfig(type, options);
        
        try {
            const editor = new window.Quill(element, config);
            
            // Apply length limiting if specified
            if (options.maxLength) {
                this.addLengthLimiting(editor, options.maxLength);
            }

            // Add email-specific formatting cleanup
            this.addEmailFormatting(editor);

            // Add non-breaking space cleanup monitor
            this.addSpaceCleanupMonitor(editor);

            // Register nbsp toolbar handler if toolbar includes the nbsp button
            this.addNbspToolbarHandler(editor, type, options);

            // Register linebreak toolbar handler with dropdown
            this.addLinebreakToolbarHandler(editor, type, options);

            return editor;
        } catch (error) {
            throw new Error(`Failed to initialize Quill editor: ${error.message}`);
        }
    }

    /**
     * Waits for Quill library to be loaded
     * @returns {Promise<void>}
     */
    static waitForQuill() {
        return new Promise((resolve, reject) => {
            if (window.Quill) {
                resolve();
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error('Quill library failed to load within timeout'));
            }, this.DEFAULT_TIMEOUT);

            const checkQuill = () => {
                if (window.Quill) {
                    clearTimeout(timeout);
                    resolve();
                } else {
                    setTimeout(checkQuill, 100);
                }
            };

            checkQuill();
        });
    }

    /**
     * Adds length limiting functionality to editor
     * @param {Object} editor - Quill instance
     * @param {number} maxLength - Maximum character length
     */
    static addLengthLimiting(editor, maxLength) {
        editor.on('text-change', () => {
            const text = editor.getText();
            if (text.length > maxLength) {
                const range = editor.getSelection();
                editor.deleteText(maxLength, text.length - maxLength);
                if (range) {
                    editor.setSelection(Math.min(range.index, maxLength));
                }
            }
        });
    }

    /**
     * Registers the nbsp toolbar button handler for inserting intentional non-breaking spaces
     * @param {Object} editor - Quill instance
     * @param {string} type - Editor preset type
     * @param {Object} options - Editor options
     */
    static addNbspToolbarHandler(editor, type, options) {
        // Check if this editor's toolbar includes the nbsp button
        const toolbar = options.customToolbar || this.TOOLBAR_PRESETS[type] || this.TOOLBAR_PRESETS.basic;
        const hasNbsp = toolbar.some(group => Array.isArray(group) && group.includes('nbsp'));
        if (!hasNbsp) return;

        const toolbarModule = editor.getModule('toolbar');
        if (!toolbarModule) return;

        toolbarModule.addHandler('nbsp', function() {
            const range = editor.getSelection(true);
            if (range) {
                editor.insertEmbed(range.index, 'nbsp', true, 'user');
                editor.setSelection(range.index + 1, 0, 'user');
            }
        });
    }

    /**
     * Registers the linebreak toolbar button handler with dropdown for choosing break type
     * @param {Object} editor - Quill instance
     * @param {string} type - Editor preset type
     * @param {Object} options - Editor options
     */
    static addLinebreakToolbarHandler(editor, type, options) {
        const toolbar = options.customToolbar || this.TOOLBAR_PRESETS[type] || this.TOOLBAR_PRESETS.basic;
        const hasLinebreak = toolbar.some(group => Array.isArray(group) && group.includes('linebreak'));
        if (!hasLinebreak) return;

        const toolbarModule = editor.getModule('toolbar');
        if (!toolbarModule) return;

        // Find the BR button in the toolbar DOM
        const toolbarEl = toolbarModule.container;
        const brButton = toolbarEl ? toolbarEl.querySelector('.ql-linebreak') : null;

        if (brButton) {
            // Create dropdown element
            const dropdown = document.createElement('div');
            dropdown.className = 'ql-linebreak-dropdown';
            dropdown.innerHTML =
                '<div class="ql-linebreak-option" data-type="standard">' +
                    '<span class="ql-linebreak-option-label">Line break</span>' +
                '</div>' +
                '<div class="ql-linebreak-option" data-type="mobile-hide">' +
                    '<span class="ql-linebreak-option-label">Line break (mobile hide)</span>' +
                '</div>' +
                '<div class="ql-linebreak-separator"></div>' +
                '<div class="ql-linebreak-option" data-type="mso-only">' +
                    '<span class="ql-linebreak-option-label">Line break (Outlook only)</span>' +
                '</div>' +
                '<div class="ql-linebreak-option" data-type="non-mso">' +
                    '<span class="ql-linebreak-option-label">Line break (non-Outlook)</span>' +
                '</div>';
            brButton.appendChild(dropdown);

            // Handle option clicks
            dropdown.querySelectorAll('.ql-linebreak-option').forEach(opt => {
                opt.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const breakType = opt.getAttribute('data-type');
                    const range = editor.getSelection(true);
                    if (range) {
                        editor.insertEmbed(range.index, 'linebreak', breakType, 'user');
                        editor.setSelection(range.index + 1, 0, 'user');
                    }
                    dropdown.classList.remove('ql-linebreak-dropdown-open');
                });
            });

            // Close dropdown when clicking outside
            document.addEventListener('mousedown', (e) => {
                if (!brButton.contains(e.target)) {
                    dropdown.classList.remove('ql-linebreak-dropdown-open');
                }
            });
        }

        // Register the toolbar handler to toggle dropdown
        toolbarModule.addHandler('linebreak', function() {
            if (brButton) {
                const dd = brButton.querySelector('.ql-linebreak-dropdown');
                if (dd) {
                    dd.classList.toggle('ql-linebreak-dropdown-open');
                }
            }
        });
    }

    /**
     * Adds email-optimized formatting cleanup
     * @param {Object} editor - Quill instance
     */
    static addEmailFormatting(editor) {
        // Ensure links have proper styling for email
        editor.on('selection-change', (range, oldRange, source) => {
            if (source === 'user' && range) {
                const format = editor.getFormat(range);
                if (format.link) {
                    // Apply email-safe link styling
                    const linkElement = editor.root.querySelector(`a[href="${format.link}"]`);
                    if (linkElement && !linkElement.style.color) {
                        linkElement.style.color = '#ffffff';
                        linkElement.style.textDecoration = 'underline';
                    }
                }
            }
        });

        // Clean up non-breaking spaces on text changes
        editor.on('text-change', (delta, oldDelta, source) => {
            if (source === 'user') {
                const text = editor.getText();
                if (text.includes('\u00A0')) {
                    // Replace non-breaking spaces with regular spaces
                    const cleanText = text.replace(/\u00A0/g, ' ');
                    const currentSelection = editor.getSelection();
                    editor.setText(cleanText);
                    if (currentSelection) {
                        editor.setSelection(currentSelection.index, currentSelection.length);
                    }
                }
            }
        });

        // Override paste behavior to clean up non-breaking spaces
        editor.clipboard.addMatcher(Node.TEXT_NODE, function(node, delta) {
            if (typeof node.data === 'string') {
                const cleanText = node.data.replace(/\u00A0/g, ' ').replace(/&nbsp;/g, ' ');
                return new (window.Quill.import('delta'))().insert(cleanText);
            }
            return delta;
        });
    }

    /**
     * Creates a debounced update handler for editor changes
     * @param {Function} updateCallback - Function to call on content change
     * @param {number} delay - Debounce delay in milliseconds
     * @returns {Function} Debounced handler
     */
    static createUpdateHandler(updateCallback, delay = this.DEBOUNCE_DELAY) {
        let timeout;
        return (delta, oldDelta, source) => {
            if (source === 'user') {
                clearTimeout(timeout);
                timeout = setTimeout(() => updateCallback(delta, oldDelta, source), delay);
            }
        };
    }

    /**
     * Extracts clean HTML content from Quill editor
     * @param {Object} editor - Quill instance
     * @param {boolean} emailOptimized - Whether to apply email-specific cleanup
     * @returns {string} Clean HTML content
     */
    static getCleanContent(editor, emailOptimized = true) {
        if (!editor) return '';

        // Use getSemanticHTML for Quill 2.0, fallback to innerHTML
        let content = editor.getSemanticHTML ? 
            editor.getSemanticHTML() : 
            editor.root.innerHTML;

        // Preserve intentional nbsp and linebreak blots before cleaning
        content = this.protectNbspBlots(content);
        content = this.protectLinebreakBlots(content);

        // Always clean up non-breaking spaces (unintentional ones)
        content = this.cleanSpaces(content);

        if (emailOptimized) {
            content = this.sanitizeForEmail(content);
        }

        // Restore intentional nbsp and linebreak characters
        content = this.restoreNbspTokens(content);
        content = this.restoreLinebreakTokens(content);

        // Convert Outlook conditional break placeholders to real conditional comments
        // (only for email output — conditional comments are stripped by DOM parsers)
        if (emailOptimized) {
            content = this.convertToConditionalBreaks(content);
        }

        return content;
    }

    /**
     * Sanitizes HTML content for email compatibility
     * @param {string} html - HTML content to sanitize
     * @returns {string} Sanitized HTML
     */
    static sanitizeForEmail(html) {
        if (!html) return '';

        const temp = document.createElement('div');
        temp.innerHTML = html;

        // Remove script and style tags
        temp.querySelectorAll('script, style').forEach(el => el.remove());

        // Remove event handlers
        const allElements = temp.getElementsByTagName('*');
        for (let el of allElements) {
            for (let attr of [...el.attributes]) {
                if (attr.name.startsWith('on')) {
                    el.removeAttribute(attr.name);
                }
            }
        }

        // Preserve intentional nbsp and linebreak blots before cleaning
        let result = this.protectNbspBlots(temp.innerHTML);
        result = this.protectLinebreakBlots(result);

        // Also protect bare &nbsp; entities already present in the input.
        // At this point any &nbsp; has survived earlier sanitisation and is intentional.
        result = result.replace(/&nbsp;/g, this.NBSP_TOKEN);

        // Clean up email-incompatible formatting and non-breaking spaces
        result = result
            .replace(/<p>/g, '')
            .replace(/<\/p>/g, '<br>')        // Convert closing </p> to <br> for line breaks
            .replace(/<div[^>]*>/g, '')
            .replace(/<\/div>/g, '<br>')      // Convert closing </div> to <br> for line breaks
            .replace(/^<br\s*\/?>/g, '')      // Remove leading <br>
            .replace(/<br\s*\/?>$/g, '')      // Remove trailing <br>
            .replace(/&nbsp;/g, ' ')          // Replace HTML non-breaking spaces
            .replace(/\u00A0/g, ' ')          // Replace Unicode non-breaking spaces
            .replace(/\s{2,}/g, ' ')          // Replace multiple spaces with single space
            .trim();

        // Restore intentional nbsp and linebreak characters
        result = this.restoreNbspTokens(result);
        return this.restoreLinebreakTokens(result);
    }

    /**
     * Sets content in Quill editor safely
     * @param {Object} editor - Quill instance
     * @param {string} content - HTML content to set
     */
    static setContent(editor, content) {
        if (!editor || !content) return;

        try {
            // Preserve intentional line breaks by converting to blot markup before cleaning
            let cleanContent = this.convertLinebreakToBlots(content);

            // Preserve intentional &nbsp; by converting to blot markup before cleaning
            cleanContent = this.convertNbspToBlots(cleanContent);

            // Clean content before setting - convert <br> tags to proper paragraph structure
            // This prevents duplicate line breaks when content is saved and reloaded
            cleanContent = cleanContent
                .replace(/<br\s*\/?>/gi, '</p><p>');  // Convert <br> to paragraph breaks
            
            // Wrap in paragraph tags if not already wrapped
            if (!cleanContent.trim().startsWith('<p>')) {
                cleanContent = '<p>' + cleanContent + '</p>';
            }
            
            // Clean up empty paragraphs and normalize
            cleanContent = cleanContent
                .replace(/<p><\/p>/g, '')           // Remove empty paragraphs
                .replace(/<p>\s*<\/p>/g, '')        // Remove whitespace-only paragraphs
                .replace(/<\/p>\s*<p>/g, '</p><p>'); // Normalize paragraph spacing

            // Clear existing content first
            editor.setText('');
            
            // Use clipboard.dangerouslyPasteHTML for Quill 2.0
            if (editor.clipboard && editor.clipboard.dangerouslyPasteHTML) {
                editor.clipboard.dangerouslyPasteHTML(cleanContent);
            } else {
                // Fallback for older versions
                editor.root.innerHTML = cleanContent;
            }

            // Additional cleanup after setting content
            const text = editor.getText();
            if (text.includes('\u00A0')) {
                const cleanText = text.replace(/\u00A0/g, ' ');
                editor.setText(cleanText);
            }
        } catch (error) {
            console.warn('Failed to set editor content:', error);
        }
    }

    /**
     * Properly cleans up Quill editor instances
     * @param {Object|Object[]} editors - Single editor or array of editors
     */
    static cleanup(editors) {
        const editorArray = Array.isArray(editors) ? editors : [editors];
        
        editorArray.forEach(editor => {
            if (editor && typeof editor.off === 'function') {
                // Remove all event listeners
                editor.off('text-change');
                editor.off('selection-change');
                
                // Clear content to prevent memory leaks
                try {
                    editor.setText('');
                } catch (error) {
                    console.warn('Error during editor cleanup:', error);
                }
            }
        });
    }

    /**
     * Bulk initialize multiple editors with consistent configuration
     * @param {Array} editorConfigs - Array of editor configuration objects
     * @returns {Promise<Object>} Object with initialized editors
     */
    static async initializeMultipleEditors(editorConfigs) {
        await this.waitForQuill();
        
        const editors = {};
        const initPromises = editorConfigs.map(async config => {
            const { id, element, type, options } = config;
            try {
                editors[id] = await this.initializeEditor(element, type, options);
                return { id, success: true };
            } catch (error) {
                console.error(`Failed to initialize editor ${id}:`, error);
                return { id, success: false, error };
            }
        });

        await Promise.all(initPromises);
        return editors;
    }

    // ── Non-breaking space blot helpers ──────────────────────────────

    /** Token used to protect intentional nbsp blots during cleanup */
    static NBSP_TOKEN = '%%INTENTIONAL_NBSP%%';

    /**
     * Replaces <span class="ql-nbsp">...</span> with a safe token
     * so that downstream cleanup steps don't strip them.
     * @param {string} html - HTML string potentially containing nbsp blots
     * @returns {string} HTML with nbsp blots replaced by tokens
     */
    static protectNbspBlots(html) {
        if (!html) return '';
        // Quill 2.0 renders embeds as:
        //   <span class="ql-nbsp" contenteditable="false">\uFEFF<span contenteditable="false"> </span>\uFEFF</span>
        // Match both the nested (Quill 2.0) and simple forms.
        return html.replace(/<span[^>]*class="ql-nbsp"[^>]*>(?:[^<]*<span[^>]*>[^<]*<\/span>[^<]*|[^<]*)<\/span>/gi, this.NBSP_TOKEN);
    }

    /**
     * Converts safe tokens back to &nbsp; for email output.
     * @param {string} html - HTML containing tokens
     * @returns {string} HTML with tokens replaced by &nbsp;
     */
    static restoreNbspTokens(html) {
        if (!html) return '';
        return html.replace(new RegExp(this.NBSP_TOKEN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '&nbsp;');
    }

    /**
     * Converts standalone &nbsp; in saved content back to blot markup
     * so that Quill can reconstruct the NonBreakingSpaceBlot on reload.
     * Only converts &nbsp; that is NOT already inside a ql-nbsp span.
     * @param {string} html - Saved HTML content
     * @returns {string} HTML with &nbsp; converted to blot markup
     */
    static convertNbspToBlots(html) {
        if (!html) return '';
        // First protect any existing blot markup (handle Quill 2.0 nested embed structure)
        let result = html.replace(/<span[^>]*class="ql-nbsp"[^>]*>(?:[^<]*<span[^>]*>[^<]*<\/span>[^<]*|[^<]*)<\/span>/gi, this.NBSP_TOKEN);
        // Convert remaining &nbsp; entities to blot markup
        result = result.replace(/&nbsp;/g, '<span class="ql-nbsp" contenteditable="false">\u00A0</span>');
        // Also convert Unicode nbsp not inside blots
        result = result.replace(/\u00A0/g, '<span class="ql-nbsp" contenteditable="false">\u00A0</span>');
        // Restore the originals that were already blots
        result = result.replace(new RegExp(this.NBSP_TOKEN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '<span class="ql-nbsp" contenteditable="false">\u00A0</span>');
        return result;
    }

    // ── Line break blot helpers ─────────────────────────────────────

    /** Tokens used to protect intentional linebreak blots during cleanup */
    static LINEBREAK_TOKEN_STANDARD = '%%LINEBREAK_STANDARD%%';
    static LINEBREAK_TOKEN_MOBILE_HIDE = '%%LINEBREAK_MOBILE_HIDE%%';
    static LINEBREAK_TOKEN_MSO_ONLY = '%%LINEBREAK_MSO_ONLY%%';
    static LINEBREAK_TOKEN_NON_MSO = '%%LINEBREAK_NON_MSO%%';

    /**
     * Replaces <span class="ql-linebreak" data-type="...">...</span> with safe tokens
     * so that downstream cleanup steps don't strip them.
     * @param {string} html - HTML string potentially containing linebreak blots
     * @returns {string} HTML with linebreak blots replaced by tokens
     */
    static protectLinebreakBlots(html) {
        if (!html) return '';
        const blotPattern = (dataType) => [
            new RegExp('<span[^>]*class="ql-linebreak"[^>]*data-type="' + dataType + '"[^>]*>(?:[^<]*<span[^>]*>[^<]*<\/span>[^<]*|[^<]*)<\/span>', 'gi'),
            new RegExp('<span[^>]*data-type="' + dataType + '"[^>]*class="ql-linebreak"[^>]*>(?:[^<]*<span[^>]*>[^<]*<\/span>[^<]*|[^<]*)<\/span>', 'gi')
        ];
        let result = html;
        // Match specific variants first (most specific to least)
        const variants = [
            ['mobile-hide', this.LINEBREAK_TOKEN_MOBILE_HIDE],
            ['mso-only', this.LINEBREAK_TOKEN_MSO_ONLY],
            ['non-mso', this.LINEBREAK_TOKEN_NON_MSO]
        ];
        for (const [type, token] of variants) {
            for (const regex of blotPattern(type)) {
                result = result.replace(regex, token);
            }
        }
        // Then match standard (remaining ql-linebreak spans)
        result = result.replace(
            /<span[^>]*class="ql-linebreak"[^>]*>(?:[^<]*<span[^>]*>[^<]*<\/span>[^<]*|[^<]*)<\/span>/gi,
            this.LINEBREAK_TOKEN_STANDARD
        );
        return result;
    }

    /**
     * Converts safe tokens back to line break HTML for email output.
     * @param {string} html - HTML containing tokens
     * @returns {string} HTML with tokens replaced by <br> variants
     */
    static restoreLinebreakTokens(html) {
        if (!html) return '';
        const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return html
            .replace(new RegExp(escapeRegex(this.LINEBREAK_TOKEN_MSO_ONLY), 'g'), '<br class="mso-only">')
            .replace(new RegExp(escapeRegex(this.LINEBREAK_TOKEN_NON_MSO), 'g'), '<br class="non-mso">')
            .replace(new RegExp(escapeRegex(this.LINEBREAK_TOKEN_MOBILE_HIDE), 'g'), '<br class="mobile-hide">')
            .replace(new RegExp(escapeRegex(this.LINEBREAK_TOKEN_STANDARD), 'g'), '<br>');
    }

    /**
     * Converts DOM-safe <br> class placeholders to actual Outlook conditional comments.
     * Called as the final step only for email output.
     * @param {string} html - HTML with <br class="mso-only"> / <br class="non-mso"> tags
     * @returns {string} HTML with real conditional comments
     */
    static convertToConditionalBreaks(html) {
        if (!html) return '';
        return html
            .replace(/<br\s+class="mso-only"\s*\/?>/gi, '<!--[if mso]><br><![endif]-->')
            .replace(/<br\s+class="non-mso"\s*\/?>/gi, '<!--[if !mso]><br><!--<![endif]-->');
    }

    /**
     * Converts <br> and <br class="mobile-hide"> in saved content
     * back to blot markup so that Quill can reconstruct the LineBreakBlot on reload.
     * @param {string} html - Saved HTML content
     * @returns {string} HTML with line break patterns converted to blot markup
     */
    static convertLinebreakToBlots(html) {
        if (!html) return '';
        // First protect any existing blot markup
        let result = this.protectLinebreakBlots(html);
        // Convert <br class="mso-only"> and <br class="non-mso"> to blot markup (must be before generic patterns)
        result = result.replace(
            /<br\s+class="mso-only"\s*\/?>/gi,
            '<span class="ql-linebreak" data-type="mso-only" contenteditable="false">\u21B5O</span>'
        );
        result = result.replace(
            /<br\s+class="non-mso"\s*\/?>/gi,
            '<span class="ql-linebreak" data-type="non-mso" contenteditable="false">\u21B5!O</span>'
        );
        // Convert <br class="mobile-hide"> to blot markup (must be before generic <br>)
        result = result.replace(
            /<br\s+class="mobile-hide"\s*\/?>/gi,
            '<span class="ql-linebreak" data-type="mobile-hide" contenteditable="false">\u21B5M</span>'
        );
        // Restore the originals that were already blots
        const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const blotMap = [
            [this.LINEBREAK_TOKEN_MSO_ONLY, 'mso-only', '\u21B5O'],
            [this.LINEBREAK_TOKEN_NON_MSO, 'non-mso', '\u21B5!O'],
            [this.LINEBREAK_TOKEN_MOBILE_HIDE, 'mobile-hide', '\u21B5M'],
            [this.LINEBREAK_TOKEN_STANDARD, 'standard', '\u21B5']
        ];
        for (const [token, type, label] of blotMap) {
            result = result.replace(new RegExp(escapeRegex(token), 'g'),
                '<span class="ql-linebreak" data-type="' + type + '" contenteditable="false">' + label + '</span>');
        }
        return result;
    }

    /**
     * Cleans up non-breaking spaces from text content
     * (does NOT affect %%INTENTIONAL_NBSP%% tokens)
     * @param {string} text - Text content to clean
     * @returns {string} Cleaned text with regular spaces
     */
    static cleanSpaces(text) {
        if (!text) return '';
        return text
            .replace(/&nbsp;/g, ' ')
            .replace(/\u00A0/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    /**
     * Monitors and cleans up non-breaking spaces in real-time
     * @param {Object} editor - Quill instance to monitor
     */
    static addSpaceCleanupMonitor(editor) {
        let isCleaningSpaces = false;

        const cleanupSpaces = () => {
            if (isCleaningSpaces) return;
            
            const text = editor.getText();
            if (text.includes('\u00A0')) {
                isCleaningSpaces = true;
                const selection = editor.getSelection();
                const cleanText = this.cleanSpaces(text);
                
                editor.setText(cleanText);
                
                if (selection) {
                    // Restore cursor position
                    const newIndex = Math.min(selection.index, cleanText.length);
                    editor.setSelection(newIndex, 0);
                }
                isCleaningSpaces = false;
            }
        };

        // Monitor for non-breaking spaces on text changes
        editor.on('text-change', (delta, oldDelta, source) => {
            if (source === 'user') {
                setTimeout(cleanupSpaces, 10); // Small delay to let Quill finish processing
            }
        });

        // Also clean on focus loss
        editor.root.addEventListener('blur', cleanupSpaces);
    }
}

// Export for use in modules
window.QuillConfigManager = QuillConfigManager;
