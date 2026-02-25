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

class QuillConfigManager {
    static DEFAULT_TIMEOUT = 5000;
    static DEBOUNCE_DELAY = 300;
    
    // Predefined toolbar configurations for different use cases
    static TOOLBAR_PRESETS = {
        minimal: [['bold']],
        basic: [['bold', 'italic'], ['link']],
        title: [['bold'], [{ 'script': 'super' }], ['nbsp']],
        button: [[{ 'script': 'super' }]],
        description: [['bold', 'italic'], [{ 'script': 'super' }], ['link'], ['nbsp']]
    };

    // Format configurations optimized for email
    static FORMAT_PRESETS = {
        minimal: ['bold'],
        basic: ['bold', 'italic', 'link'],
        title: ['bold', 'script', 'nbsp'],
        button: ['script'],
        description: ['bold', 'italic', 'script', 'link', 'nbsp']
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

        // Preserve intentional nbsp blots before cleaning
        content = this.protectNbspBlots(content);

        // Always clean up non-breaking spaces (unintentional ones)
        content = this.cleanSpaces(content);

        if (emailOptimized) {
            content = this.sanitizeForEmail(content);
        }

        // Restore intentional nbsp characters
        content = this.restoreNbspTokens(content);

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

        // Preserve intentional nbsp blots before cleaning
        let result = this.protectNbspBlots(temp.innerHTML);

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

        // Restore intentional nbsp characters
        return this.restoreNbspTokens(result);
    }

    /**
     * Sets content in Quill editor safely
     * @param {Object} editor - Quill instance
     * @param {string} content - HTML content to set
     */
    static setContent(editor, content) {
        if (!editor || !content) return;

        try {
            // Preserve intentional &nbsp; by converting to blot markup before cleaning
            let cleanContent = this.convertNbspToBlots(content);

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
