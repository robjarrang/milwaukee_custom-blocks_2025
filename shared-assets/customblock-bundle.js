/**
 * SFMC Custom Block Bundle
 * Combined: BlockSDK + Custom Block Engine
 * Inlined for maximum load performance
 */

/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root  or https://opensource.org/licenses/BSD-3-Clause
 */

var SDK = function (config, whitelistOverride, sslOverride) {
 // config has been added as the primary parameter
 // If it is provided ensure that the other paramaters are correctly assigned
 // for backwards compatibility
 if (Array.isArray(config)) {
  whitelistOverride = config;
  sslOverride = whitelistOverride;
  config = undefined;
 }

 if (config && config.onEditClose) {
  this.handlers = {
   onEditClose: config.onEditClose
  };
  config.onEditClose = true;
 }

 this._whitelistOverride = whitelistOverride;
 this._sslOverride = sslOverride;
 this._messageId = 1;
 this._messages = {
  0: function () {}
 };
 this._readyToPost = false;
 this._pendingMessages = [];
 this._receiveMessage = this._receiveMessage.bind(this);

 window.addEventListener('message', this._receiveMessage, false);

 window.parent.postMessage({
  method: 'handShake',
  origin: window.location.origin,
  payload: config
 }, '*');
};

SDK.prototype.execute = function execute (method, options) {
 options = options || {};

 var self = this;
 var payload = options.data;
 var callback = options.success;

 if (!this._readyToPost) {
  this._pendingMessages.push({
   method: method,
   payload: payload,
   callback: callback
  });
 } else {
  this._post({
   method: method,
   payload: payload
  }, callback);
 }
};

SDK.prototype.getCentralData = function (cb) {
 this.execute('getCentralData', {
  success: cb
 });
};

SDK.prototype.getContent = function (cb) {
 this.execute('getContent', {
  success: cb
 });
};

SDK.prototype.getData = function (cb) {
 this.execute('getData', {
  success: cb
 });
};

SDK.prototype.getUserData = function (cb) {
 this.execute('getUserData', {
  success: cb
 });
};

SDK.prototype.getView = function (cb) {
 this.execute('getView', {
  success: cb
 });
};

SDK.prototype.setBlockEditorWidth = function (value, cb) {
 this.execute('setBlockEditorWidth', {
  data: value,
  success: cb
 });
};

SDK.prototype.setCentralData = function (dataObj, cb) {
 this.execute('setCentralData', {
  data: dataObj,
  success: cb
 });
};

SDK.prototype.setContent = function (content, cb) {
 this.execute('setContent', {
  data: content,
  success: cb});
};

SDK.prototype.setData = function (dataObj, cb) {
 this.execute('setData', {
  data: dataObj,
  success: cb
 });
};

SDK.prototype.setSuperContent = function (content, cb) {
 this.execute('setSuperContent', {
  data: content,
  success: cb
 });
};

SDK.prototype.triggerAuth = function (appID) {
 this.getUserData(function (userData) {
  var stack = userData.stack;
  if (stack.indexOf('qa') === 0) {
   stack = stack.substring(3,5) + '.' + stack.substring(0,3);
  }
  var iframe = document.createElement('IFRAME');
  iframe.src = 'https://mc.' + stack + '.exacttarget.com/cloud/tools/SSO.aspx?appId=' + appID + '&restToken=1&hub=1';
  iframe.style.width= '1px';
  iframe.style.height = '1px';
  iframe.style.position = 'absolute';
  iframe.style.top = '0';
  iframe.style.left = '0';
  iframe.style.visibility = 'hidden';
  iframe.className = 'authframe';
  document.body.appendChild(iframe);
 });
};

SDK.prototype.triggerAuth2 = function (authInfo) {
 var iframe = document.createElement('IFRAME');
 var scope = '';
 var state = '';
 if(Array.isArray(authInfo.scope)) {
  scope = '&scope=' + authInfo.scope.join('%20');
 }
 if(authInfo.state) {
  state = '&state=' + authInfo.state;
 }
 iframe.src = authInfo.authURL + (authInfo.authURL.endsWith('/') ? '':'/') + 'v2/authorize?response_type=code&client_id=' + authInfo.clientId + '&redirect_uri=' + encodeURIComponent(authInfo.redirectURL) + scope + state;
 iframe.style.width= '1px';
 iframe.style.height = '1px';
 iframe.style.position = 'absolute';
 iframe.style.top = '0';
 iframe.style.left = '0';
 iframe.style.visibility = 'hidden';
 iframe.className = 'authframe';
 document.body.appendChild(iframe);
};

/* Internal Methods */

SDK.prototype._executePendingMessages = function _executePendingMessages () {
 var self = this;

 this._pendingMessages.forEach(function (thisMessage) {
  self.execute(thisMessage.method, {
   data: thisMessage.payload,
   success: thisMessage.callback
  });
 });

 this._pendingMessages = [];
};

SDK.prototype._post = function _post (payload, callback) {
 this._messages[this._messageId] = callback;
 payload.id = this._messageId;
 this._messageId += 1;
 // the actual postMessage always uses the validated origin
 window.parent.postMessage(payload, this._parentOrigin);
};

SDK.prototype._receiveMessage = function _receiveMessage (message) {
 message = message || {};
 var data = message.data || {};

 if (data.method === 'handShake') {
  if (this._validateOrigin(data.origin)) {
   this._parentOrigin = data.origin;
   this._readyToPost = true;
   this._executePendingMessages();
   return;
  }
 } else if (data.method === 'closeBlock') {
  if (this._validateOrigin(data.origin)) {
   // here execute the method before closing the  block editing
   //onEditClose();
   if (this.handlers && this.handlers.onEditClose) {
    this.handlers.onEditClose();
   }
   this.execute('blockReadyToClose');
   return;
  }
 }

 // if the message is not from the validated origin it gets ignored
 if (!this._parentOrigin || this._parentOrigin !== message.origin) {
  return;
 }
 // when the message has been received, we execute its callback
 (this._messages[data.id || 0] || function () {})(data.payload);
 delete this._messages[data.id];
};

// the custom block should verify it is being called from the marketing cloud
SDK.prototype._validateOrigin = function _validateOrigin (origin) {
 // Make sure to escape periods since these strings are used in a regular expression
 var allowedDomains = this._whitelistOverride || ['exacttarget\\.com', 'marketingcloudapps\\.com', 'blocktester\\.herokuapp\\.com'];

 for (var i = 0; i < allowedDomains.length; i++) {
  // Makes the s optional in https
  var optionalSsl = this._sslOverride ? '?' : '';
  var mcSubdomain = allowedDomains[i] === 'exacttarget\\.com' ? 'mc\\.' : '';
  var whitelistRegex = new RegExp('^https' + optionalSsl + '://' + mcSubdomain + '([a-zA-Z0-9-]+\\.)*' + allowedDomains[i] + '(:[0-9]+)?$', 'i');

  if (whitelistRegex.test(origin)) {
   return true;
  }
 }

 return false;
};

if (typeof(window) === 'object') {
 window.sfdc = window.sfdc || {};
 window.sfdc.BlockSDK = SDK;
}
if (typeof(module) === 'object') {
 module.exports = SDK;
}

/**
 * SFMC Custom Block Engine v2.0
 * A declarative framework for building custom blocks.
 *
 * Called by the module's inline script inside an sdk.ready() callback.
 */

// The engine is now just one function that takes the config and the ready SDK.
function initializeBlock(config, sdk) {
    let blockData = {};
    let editors = {};
    const uiFields = {};

    // --- Core Functions ---

    // 1. Update data and refresh the preview
    function updateData(field, value) {
        blockData[field] = value;
        refreshPreview();
    }

    // 2. Generate final HTML from a template string
    function generateHtmlFromTemplate() {
        let hydratedTemplate = config.template;

        // Handle conditional blocks first, e.g., {{#if showButton}}...{{/if}}
        hydratedTemplate = hydratedTemplate.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, content) => {
            return blockData[key] ? content.trim() : '';
        });

        // Handle regular value placeholders, e.g., {{title}}
        Object.keys(config.fields).forEach(key => {
            const fieldConfig = config.fields[key];
            let value = blockData[key] !== undefined ? blockData[key] : fieldConfig.defaultValue;
            
            if (fieldConfig.type === 'richtext') {
                value = processRichText(value, fieldConfig.allowBold);
            }

            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            hydratedTemplate = hydratedTemplate.replace(regex, value || '');
        });

        return hydratedTemplate;
    }

    // 3. Refresh SFMC preview
    function refreshPreview() {
        const html = generateHtmlFromTemplate();
        sdk.setContent(html);
        sdk.setData({ ...blockData, html });
    }

    // 4. Create the entire UI from the config object
    function createUI() {
        const container = document.getElementById('fields-container');
        if (!container) {
            console.error('Fatal: A div with id="fields-container" is required.');
            return;
        }

        document.getElementById('block-title').innerText = config.name;

        Object.keys(config.fields).forEach(key => {
            const fieldConfig = config.fields[key];
            const group = document.createElement('div');
            group.className = 'field-group';

            if (fieldConfig.section) {
                // To prevent adding a divider for the very first section
                if (container.children.length > 0) {
                     group.className += ' section-divider';
                }
                const sectionTitle = document.createElement('div');
                sectionTitle.className = 'section-title';
                sectionTitle.textContent = fieldConfig.section;
                group.appendChild(sectionTitle);
            }

            const label = document.createElement('label');
            label.className = 'field-label';
            label.textContent = fieldConfig.label;
            label.htmlFor = key;

            let fieldElement;
            switch (fieldConfig.type) {
                case 'url':
                case 'text':
                    fieldElement = document.createElement('input');
                    fieldElement.type = fieldConfig.type;
                    fieldElement.id = key;
                    fieldElement.className = 'field-input';
                    fieldElement.placeholder = fieldConfig.placeholder || '';
                    fieldElement.addEventListener('input', (e) => updateData(key, e.target.value));
                    uiFields[key] = fieldElement;
                    break;
                
                case 'richtext':
                    fieldElement = document.createElement('div');
                    fieldElement.id = `${key}Editor`;
                    fieldElement.className = 'quill-container';
                    setTimeout(() => {
                        editors[key] = new Quill(`#${key}Editor`, {
                            theme: 'snow',
                            modules: { toolbar: fieldConfig.formats || [['bold', 'italic'], ['link']] },
                            placeholder: `Enter ${fieldConfig.label.toLowerCase()}...`
                        });
                        editors[key].on('text-change', () => updateData(key, editors[key].root.innerHTML));
                        // After editor is created, populate it if data already exists
                        if (blockData[key]) {
                           editors[key].root.innerHTML = blockData[key];
                        }
                    }, 0);
                    break;
            }

            group.appendChild(label);
            group.appendChild(fieldElement);
            container.appendChild(group);
        });
    }

    // 5. Load data from SFMC
    function loadData() {
        sdk.getData(data => {
            if (data && Object.keys(data).length > 1) { // > 1 to ignore just 'html' key
                blockData = data;
            } else {
                Object.keys(config.fields).forEach(key => {
                    blockData[key] = config.fields[key].defaultValue;
                });
            }
            populateUI();
            refreshPreview();
        });
    }
    
    // 6. Populate UI fields with data
    function populateUI() {
        Object.keys(config.fields).forEach(key => {
            const value = blockData[key];
            if (value === undefined) return;
            if (uiFields[key]) {
                uiFields[key].value = value;
            }
            // Quill editors are populated in their own creation callback to avoid timing issues
        });
    }

    // 7. Helper to process rich text for email
    function processRichText(html, allowBold = false) {
        if (!html) return '';
        const temp = document.createElement('div');
        temp.innerHTML = html;
        if (allowBold) {
            // Use a span with inline style for better email client compatibility
            temp.querySelectorAll('strong, b').forEach(el => {
                const span = document.createElement('span');
                span.style.fontWeight = 'bold';
                span.innerHTML = el.innerHTML;
                el.replaceWith(span);
            });
        }
        temp.querySelectorAll('a').forEach(link => {
            if (!link.style.color) link.style.color = '#ffffff';
            link.style.textDecoration = 'none';
        });
        return temp.innerHTML.replace(/<p>/g, '').replace(/<\/p>/g, '').replace(/<br>/g, '');
    }

    // --- Initialization Flow ---
    createUI();
    loadData();
}
