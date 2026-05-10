var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

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
function normalizeSettings(raw) {
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    provider: isProvider(raw.provider) ? raw.provider : DEFAULT_SETTINGS.provider,
    openaiReasoningEffort: isReasoningEffort(raw.openaiReasoningEffort) ? raw.openaiReasoningEffort : DEFAULT_SETTINGS.openaiReasoningEffort,
    codexReasoningEffort: isReasoningEffort(raw.codexReasoningEffort) ? raw.codexReasoningEffort : DEFAULT_SETTINGS.codexReasoningEffort
  };
}
function isProvider(value) {
  return value === "openai" || value === "codex" || value === "ollama";
}
function isReasoningEffort(value) {
  return value === "none" || value === "low" || value === "medium" || value === "high" || value === "xhigh";
}

export {
  __commonJS,
  __export,
  __toESM,
  DEFAULT_SETTINGS,
  normalizeSettings
};
