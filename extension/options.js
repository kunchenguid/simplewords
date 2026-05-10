"use strict";
(() => {
  // src/settings.ts
  var DEFAULT_SETTINGS = {
    provider: "openai",
    openaiApiKey: "",
    openaiBaseURL: "https://api.openai.com/v1",
    openaiModel: "gpt-5.5",
    openaiReasoningEffort: "low",
    codexAccessToken: "",
    codexRefreshToken: "",
    codexAccountId: "",
    codexBaseURL: "https://chatgpt.com/backend-api/codex",
    codexModel: "gpt-5.5-fast",
    codexReasoningEffort: "low",
    ollamaBaseURL: "http://localhost:11434/v1",
    ollamaModel: "llama3.2"
  };

  // src/codexAuth.ts
  function parseCodexAuthJson(raw) {
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new Error("Select a valid Codex auth JSON file");
    }
    if (!payload || typeof payload !== "object") {
      throw new Error("Select a valid Codex auth JSON file");
    }
    const tokens = payload.tokens;
    if (!tokens || typeof tokens !== "object") {
      throw new Error("Codex auth JSON is missing tokens");
    }
    const accessToken = cleanString(
      tokens.access_token
    );
    if (!accessToken) {
      throw new Error("Codex auth JSON is missing an access token");
    }
    const refreshToken = cleanString(
      tokens.refresh_token
    );
    const accountId = cleanString(payload.account_id) ?? extractAccountId(accessToken) ?? "";
    return {
      accessToken,
      refreshToken: refreshToken ?? "",
      accountId
    };
  }
  function extractAccountId(accessToken) {
    const claims = decodeJwtPayload(accessToken);
    return cleanString(claims?.chatgpt_account_id) ?? cleanString(claims?.["https://api.openai.com/auth"]?.chatgpt_account_id);
  }
  function decodeJwtPayload(token) {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return void 0;
    }
    try {
      const payload = JSON.parse(base64UrlDecode(parts[1]));
      return payload && typeof payload === "object" ? payload : void 0;
    } catch {
      return void 0;
    }
  }
  function base64UrlDecode(value) {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return decodeURIComponent(
      Array.from(
        atob(padded),
        (char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`
      ).join("")
    );
  }
  function cleanString(value) {
    return typeof value === "string" && value.trim() ? value.trim() : void 0;
  }

  // src/options.ts
  var fields = {
    provider: document.getElementById("provider"),
    openaiApiKey: document.getElementById(
      "openaiApiKey"
    ),
    openaiBaseURL: document.getElementById(
      "openaiBaseURL"
    ),
    openaiModel: document.getElementById(
      "openaiModel"
    ),
    openaiReasoningEffort: document.getElementById(
      "openaiReasoningEffort"
    ),
    codexAuthFile: document.getElementById(
      "codexAuthFile"
    ),
    codexAccessToken: document.getElementById(
      "codexAccessToken"
    ),
    codexRefreshToken: document.getElementById(
      "codexRefreshToken"
    ),
    codexAccountId: document.getElementById(
      "codexAccountId"
    ),
    codexBaseURL: document.getElementById(
      "codexBaseURL"
    ),
    codexModel: document.getElementById("codexModel"),
    codexReasoningEffort: document.getElementById(
      "codexReasoningEffort"
    ),
    ollamaBaseURL: document.getElementById(
      "ollamaBaseURL"
    ),
    ollamaModel: document.getElementById("ollamaModel")
  };
  var save = document.getElementById("save");
  var statusElement = document.getElementById("status");
  void restoreOptions();
  save?.addEventListener("click", () => {
    void saveOptions();
  });
  fields.provider?.addEventListener("change", () => {
    updateVisibleProviderFields(fields.provider?.value);
  });
  fields.codexAuthFile?.addEventListener("change", () => {
    void importCodexAuthFile();
  });
  async function restoreOptions() {
    const settings = await chrome.storage.local.get(
      DEFAULT_SETTINGS
    );
    setValue(fields.provider, settings.provider);
    setValue(fields.openaiApiKey, settings.openaiApiKey);
    setValue(fields.openaiBaseURL, settings.openaiBaseURL);
    setValue(fields.openaiModel, settings.openaiModel);
    setValue(fields.openaiReasoningEffort, settings.openaiReasoningEffort);
    setValue(fields.codexAccessToken, settings.codexAccessToken);
    setValue(fields.codexRefreshToken, settings.codexRefreshToken);
    setValue(fields.codexAccountId, settings.codexAccountId);
    setValue(fields.codexBaseURL, settings.codexBaseURL);
    setValue(fields.codexModel, settings.codexModel);
    setValue(fields.codexReasoningEffort, settings.codexReasoningEffort);
    setValue(fields.ollamaBaseURL, settings.ollamaBaseURL);
    setValue(fields.ollamaModel, settings.ollamaModel);
    updateVisibleProviderFields(settings.provider);
  }
  async function saveOptions() {
    if (!statusElement) {
      return;
    }
    await chrome.storage.local.set({
      provider: getValue(fields.provider),
      openaiApiKey: getValue(fields.openaiApiKey),
      openaiBaseURL: getValue(fields.openaiBaseURL) || DEFAULT_SETTINGS.openaiBaseURL,
      openaiModel: getValue(fields.openaiModel) || DEFAULT_SETTINGS.openaiModel,
      openaiReasoningEffort: getValue(fields.openaiReasoningEffort) || DEFAULT_SETTINGS.openaiReasoningEffort,
      codexAccessToken: getValue(fields.codexAccessToken),
      codexRefreshToken: getValue(fields.codexRefreshToken),
      codexAccountId: getValue(fields.codexAccountId),
      codexBaseURL: getValue(fields.codexBaseURL) || DEFAULT_SETTINGS.codexBaseURL,
      codexModel: getValue(fields.codexModel) || DEFAULT_SETTINGS.codexModel,
      codexReasoningEffort: getValue(fields.codexReasoningEffort) || DEFAULT_SETTINGS.codexReasoningEffort,
      ollamaBaseURL: getValue(fields.ollamaBaseURL) || DEFAULT_SETTINGS.ollamaBaseURL,
      ollamaModel: getValue(fields.ollamaModel) || DEFAULT_SETTINGS.ollamaModel
    });
    statusElement.textContent = "Saved.";
    window.setTimeout(() => {
      statusElement.textContent = "";
    }, 1800);
  }
  function updateVisibleProviderFields(provider) {
    for (const section of document.querySelectorAll(
      "[data-provider-section]"
    )) {
      section.hidden = section.dataset.providerSection !== provider;
    }
  }
  async function importCodexAuthFile() {
    const file = fields.codexAuthFile?.files?.[0];
    if (!file) {
      return;
    }
    try {
      const auth = parseCodexAuthJson(await file.text());
      setValue(fields.provider, "codex");
      setValue(fields.codexAccessToken, auth.accessToken);
      setValue(fields.codexRefreshToken, auth.refreshToken);
      setValue(fields.codexAccountId, auth.accountId);
      updateVisibleProviderFields("codex");
      if (statusElement) {
        statusElement.textContent = "Imported Codex auth. Click Save to keep these settings.";
      }
    } catch (error) {
      if (statusElement) {
        statusElement.textContent = error instanceof Error ? error.message : "Could not import Codex auth file.";
      }
    }
  }
  function getValue(field) {
    return field?.value.trim() ?? "";
  }
  function setValue(field, value) {
    if (field) {
      field.value = value;
    }
  }
})();
