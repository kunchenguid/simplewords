"use strict";
(() => {
  // src/domTree.ts
  var IRRELEVANT_TAGS = /* @__PURE__ */ new Set([
    "script",
    "style",
    "noscript",
    "template",
    "svg",
    "canvas",
    "nav"
  ]);
  var IRRELEVANT_ROLES = /* @__PURE__ */ new Set([
    "banner",
    "combobox",
    "listbox",
    "menu",
    "menubar",
    "navigation",
    "option",
    "search",
    "toolbar"
  ]);
  var FORM_CONTROL_TAGS = /* @__PURE__ */ new Set(["button", "select"]);
  var STRUCTURAL_TAGS = /* @__PURE__ */ new Set([
    "article",
    "aside",
    "dialog",
    "footer",
    "form",
    "header",
    "main",
    "section"
  ]);
  var INLINE_TEXT_TAGS = /* @__PURE__ */ new Set(["label", "summary"]);
  function serializeVisibleTextTree(root, activeEditor2) {
    const lines = serializeElement(root, activeEditor2, 0);
    return lines.join("\n");
  }
  function serializeElement(element, activeEditor2, depth) {
    if (!isRelevantVisibleElement(element)) {
      return [];
    }
    if (element === activeEditor2) {
      return serializeEditor(element, depth);
    }
    const directText = getDirectText(element);
    const elementChildren = Array.from(element.children);
    if (elementChildren.length === 0 && directText) {
      return [`${indent(depth)}${nodeName(element)} ${quote(directText)}`];
    }
    const childDepth = shouldEmitContainer(element) ? depth + 1 : depth;
    const childLines = [];
    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = normalizeText(child.textContent ?? "");
        if (text) {
          childLines.push(`${indent(childDepth)}text ${quote(text)}`);
        }
        continue;
      }
      if (child.nodeType === Node.ELEMENT_NODE) {
        childLines.push(
          ...serializeElement(child, activeEditor2, childDepth)
        );
      }
    }
    const name = nodeName(element);
    if (childLines.length === 0 && directText) {
      return [`${indent(depth)}${name} ${quote(directText)}`];
    }
    if (INLINE_TEXT_TAGS.has(element.tagName.toLowerCase()) && directText) {
      return [`${indent(depth)}${name} ${quote(directText)}`];
    }
    if (childLines.length === 0) {
      return [];
    }
    if (shouldEmitContainer(element)) {
      return [`${indent(depth)}${name}`, ...childLines];
    }
    return childLines;
  }
  function serializeEditor(element, depth) {
    const attributes = ["active"];
    if (element.getAttribute("contenteditable") === "true" || element.getAttribute("contenteditable") === "") {
      attributes.push("contenteditable=true");
    }
    const draft = getEditorText(element);
    const lines = [`${indent(depth)}> editor ${attributes.join(" ")}`];
    if (draft) {
      lines.push(`${indent(depth + 1)}draft ${quote(draft)}`);
    }
    return lines;
  }
  function getEditorText(element) {
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      return normalizeText(element.value);
    }
    return normalizeText(element.textContent ?? "");
  }
  function isRelevantVisibleElement(element) {
    const tagName = element.tagName.toLowerCase();
    if (IRRELEVANT_TAGS.has(tagName)) {
      return false;
    }
    if (element.id === "simplewords-button" || element.id === "simplewords-panel") {
      return false;
    }
    if (IRRELEVANT_ROLES.has(element.getAttribute("role") ?? tagName)) {
      return false;
    }
    if (FORM_CONTROL_TAGS.has(tagName)) {
      return false;
    }
    if (element instanceof HTMLInputElement && !isActiveEditorCandidate(element)) {
      return false;
    }
    if (element.hasAttribute("hidden") || element.getAttribute("aria-hidden") === "true") {
      return false;
    }
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse") {
      return false;
    }
    return true;
  }
  function shouldEmitContainer(element) {
    const tagName = element.tagName.toLowerCase();
    if (STRUCTURAL_TAGS.has(tagName)) {
      return true;
    }
    const role = element.getAttribute("role");
    return role === "main" || role === "article" || role === "dialog" || role === "form" || role === "textbox";
  }
  function isActiveEditorCandidate(element) {
    return ["email", "search", "text", "url"].includes(element.type);
  }
  function nodeName(element) {
    const tagName = element.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tagName)) {
      return "h";
    }
    if (tagName === "p" || tagName === "span") {
      return "text";
    }
    if (tagName === "textarea" || tagName === "input" || element.getAttribute("contenteditable") === "true") {
      return "editor";
    }
    return element.getAttribute("role") ?? tagName;
  }
  function getDirectText(element) {
    let text = "";
    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        text += ` ${child.textContent ?? ""}`;
      }
    }
    return normalizeText(text);
  }
  function normalizeText(text) {
    return text.replace(/\s+/g, " ").trim();
  }
  function quote(text) {
    return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  function indent(depth) {
    return "  ".repeat(depth);
  }

  // src/uiPosition.ts
  var VIEWPORT_GUTTER = 8;
  var PANEL_GAP = 12;
  function panelPositionAboveButton(options) {
    const { buttonRect, panelSize, viewportSize } = options;
    const centeredLeft = buttonRect.left + buttonRect.width / 2 - panelSize.width / 2;
    const maxLeft = viewportSize.width - panelSize.width - VIEWPORT_GUTTER;
    return {
      top: Math.max(
        VIEWPORT_GUTTER,
        buttonRect.top - panelSize.height - PANEL_GAP
      ),
      left: Math.max(VIEWPORT_GUTTER, Math.min(maxLeft, centeredLeft))
    };
  }

  // src/content.ts
  var BUTTON_ID = "simplewords-button";
  var PANEL_ID = "simplewords-panel";
  var MAX_CONTEXT_CHARS = 3e4;
  var activeEditor = null;
  document.addEventListener("focusin", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !isEditableElement(target)) {
      return;
    }
    activeEditor = target;
    showButton(target);
  });
  document.addEventListener("selectionchange", () => {
    const element = document.activeElement;
    if (element instanceof HTMLElement && isEditableElement(element)) {
      activeEditor = element;
      showButton(element);
    }
  });
  window.addEventListener(
    "scroll",
    () => {
      if (activeEditor) {
        positionButton(activeEditor);
      }
    },
    { passive: true }
  );
  window.addEventListener("resize", () => {
    if (activeEditor) {
      positionButton(activeEditor);
    }
  });
  function showButton(editor) {
    const button = getOrCreateButton();
    button.hidden = false;
    positionButton(editor);
  }
  function getOrCreateButton() {
    const existing = document.getElementById(BUTTON_ID);
    if (existing instanceof HTMLButtonElement) {
      return existing;
    }
    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = "Simple Words";
    Object.assign(button.style, {
      position: "fixed",
      zIndex: "2147483647",
      border: "0",
      borderRadius: "999px",
      padding: "8px 12px",
      background: "#172033",
      color: "#ffffff",
      boxShadow: "0 8px 24px rgba(15, 23, 42, 0.22)",
      cursor: "pointer",
      font: '600 13px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    });
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => {
      void refineActiveEditor();
    });
    document.documentElement.append(button);
    return button;
  }
  function positionButton(editor) {
    const button = getOrCreateButton();
    const rect = editor.getBoundingClientRect();
    const top = Math.max(8, rect.bottom + 8);
    const left = Math.min(
      window.innerWidth - button.offsetWidth - 8,
      Math.max(8, rect.right - button.offsetWidth)
    );
    button.style.top = `${top}px`;
    button.style.left = `${left}px`;
  }
  async function refineActiveEditor() {
    const editor = activeEditor;
    if (!editor) {
      return;
    }
    const draft = getEditorText2(editor);
    if (!draft) {
      showPanel(editor, "Write a rough reply first.", null);
      return;
    }
    showPanel(editor, "Refining...", null);
    const contextTree = serializeVisibleTextTree(document.body, editor).slice(
      0,
      MAX_CONTEXT_CHARS
    );
    const response = await chrome.runtime.sendMessage({
      type: "simplewords.refine",
      draft,
      contextTree,
      title: document.title,
      url: location.href
    });
    if (response.error || !response.reply) {
      showPanel(editor, response.error ?? "No reply returned.", null);
      return;
    }
    showPanel(editor, response.reply, response.reply);
  }
  function showPanel(editor, message, replacement) {
    const panel = getOrCreatePanel();
    panel.replaceChildren();
    const text = document.createElement("div");
    text.textContent = message;
    text.style.whiteSpace = "pre-wrap";
    text.style.marginBottom = replacement ? "12px" : "0";
    panel.append(text);
    if (replacement) {
      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "8px";
      const replace = document.createElement("button");
      replace.type = "button";
      replace.textContent = "Replace draft";
      stylePanelButton(replace, true);
      replace.addEventListener("click", () => {
        setEditorText(editor, replacement);
        panel.hidden = true;
        editor.focus();
      });
      const dismiss = document.createElement("button");
      dismiss.type = "button";
      dismiss.textContent = "Dismiss";
      stylePanelButton(dismiss, false);
      dismiss.addEventListener("click", () => {
        panel.hidden = true;
        editor.focus();
      });
      actions.append(replace, dismiss);
      panel.append(actions);
    }
    panel.hidden = false;
    const button = getOrCreateButton();
    const position = panelPositionAboveButton({
      buttonRect: button.getBoundingClientRect(),
      panelSize: { width: panel.offsetWidth, height: panel.offsetHeight },
      viewportSize: { width: window.innerWidth, height: window.innerHeight }
    });
    panel.style.top = `${position.top}px`;
    panel.style.left = `${position.left}px`;
  }
  function getOrCreatePanel() {
    const existing = document.getElementById(PANEL_ID);
    if (existing instanceof HTMLDivElement) {
      return existing;
    }
    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    Object.assign(panel.style, {
      position: "fixed",
      zIndex: "2147483647",
      maxWidth: "420px",
      minWidth: "260px",
      padding: "14px",
      borderRadius: "14px",
      background: "#ffffff",
      color: "#172033",
      boxShadow: "0 18px 48px rgba(15, 23, 42, 0.28)",
      font: '14px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    });
    document.documentElement.append(panel);
    return panel;
  }
  function stylePanelButton(button, primary) {
    Object.assign(button.style, {
      border: primary ? "0" : "1px solid #cbd5e1",
      borderRadius: "8px",
      padding: "8px 10px",
      background: primary ? "#172033" : "#ffffff",
      color: primary ? "#ffffff" : "#172033",
      cursor: "pointer",
      font: '600 13px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    });
  }
  function isEditableElement(element) {
    if (element.isContentEditable) {
      return true;
    }
    if (element instanceof HTMLTextAreaElement) {
      return true;
    }
    if (!(element instanceof HTMLInputElement)) {
      return false;
    }
    return ["email", "search", "text", "url"].includes(element.type);
  }
  function getEditorText2(element) {
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      return element.value.trim();
    }
    return (element.textContent ?? "").trim();
  }
  function setEditorText(element, value) {
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      element.value = value;
    } else {
      element.textContent = value;
    }
    element.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertReplacementText",
        data: value
      })
    );
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }
})();
