#!/usr/bin/env node

// src/index.ts
import { parseArgs } from "util";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// ../core/dist/index.js
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";

// ../../node_modules/smol-toml/dist/error.js
function getLineColFromPtr(string, ptr) {
  let lines = string.slice(0, ptr).split(/\r\n|\n|\r/g);
  return [lines.length, lines.pop().length + 1];
}
function makeCodeBlock(string, line, column) {
  let lines = string.split(/\r\n|\n|\r/g);
  let codeblock = "";
  let numberLen = (Math.log10(line + 1) | 0) + 1;
  for (let i = line - 1; i <= line + 1; i++) {
    let l = lines[i - 1];
    if (!l)
      continue;
    codeblock += i.toString().padEnd(numberLen, " ");
    codeblock += ":  ";
    codeblock += l;
    codeblock += "\n";
    if (i === line) {
      codeblock += " ".repeat(numberLen + column + 2);
      codeblock += "^\n";
    }
  }
  return codeblock;
}
var TomlError = class extends Error {
  line;
  column;
  codeblock;
  constructor(message, options) {
    const [line, column] = getLineColFromPtr(options.toml, options.ptr);
    const codeblock = makeCodeBlock(options.toml, line, column);
    super(`Invalid TOML document: ${message}

${codeblock}`, options);
    this.line = line;
    this.column = column;
    this.codeblock = codeblock;
  }
};

// ../../node_modules/smol-toml/dist/util.js
function isEscaped(str, ptr) {
  let i = 0;
  while (str[ptr - ++i] === "\\")
    ;
  return --i && i % 2;
}
function indexOfNewline(str, start = 0, end = str.length) {
  let idx = str.indexOf("\n", start);
  if (str[idx - 1] === "\r")
    idx--;
  return idx <= end ? idx : -1;
}
function skipComment(str, ptr) {
  for (let i = ptr; i < str.length; i++) {
    let c = str[i];
    if (c === "\n")
      return i;
    if (c === "\r" && str[i + 1] === "\n")
      return i + 1;
    if (c < " " && c !== "	" || c === "\x7F") {
      throw new TomlError("control characters are not allowed in comments", {
        toml: str,
        ptr
      });
    }
  }
  return str.length;
}
function skipVoid(str, ptr, banNewLines, banComments) {
  let c;
  while ((c = str[ptr]) === " " || c === "	" || !banNewLines && (c === "\n" || c === "\r" && str[ptr + 1] === "\n"))
    ptr++;
  return banComments || c !== "#" ? ptr : skipVoid(str, skipComment(str, ptr), banNewLines);
}
function skipUntil(str, ptr, sep, end, banNewLines = false) {
  if (!end) {
    ptr = indexOfNewline(str, ptr);
    return ptr < 0 ? str.length : ptr;
  }
  for (let i = ptr; i < str.length; i++) {
    let c = str[i];
    if (c === "#") {
      i = indexOfNewline(str, i);
    } else if (c === sep) {
      return i + 1;
    } else if (c === end || banNewLines && (c === "\n" || c === "\r" && str[i + 1] === "\n")) {
      return i;
    }
  }
  throw new TomlError("cannot find end of structure", {
    toml: str,
    ptr
  });
}
function getStringEnd(str, seek) {
  let first = str[seek];
  let target = first === str[seek + 1] && str[seek + 1] === str[seek + 2] ? str.slice(seek, seek + 3) : first;
  seek += target.length - 1;
  do
    seek = str.indexOf(target, ++seek);
  while (seek > -1 && first !== "'" && isEscaped(str, seek));
  if (seek > -1) {
    seek += target.length;
    if (target.length > 1) {
      if (str[seek] === first)
        seek++;
      if (str[seek] === first)
        seek++;
    }
  }
  return seek;
}

// ../../node_modules/smol-toml/dist/date.js
var DATE_TIME_RE = /^(\d{4}-\d{2}-\d{2})?[T ]?(?:(\d{2}):\d{2}(?::\d{2}(?:\.\d+)?)?)?(Z|[-+]\d{2}:\d{2})?$/i;
var TomlDate = class _TomlDate extends Date {
  #hasDate = false;
  #hasTime = false;
  #offset = null;
  constructor(date) {
    let hasDate = true;
    let hasTime = true;
    let offset = "Z";
    if (typeof date === "string") {
      let match = date.match(DATE_TIME_RE);
      if (match) {
        if (!match[1]) {
          hasDate = false;
          date = `0000-01-01T${date}`;
        }
        hasTime = !!match[2];
        hasTime && date[10] === " " && (date = date.replace(" ", "T"));
        if (match[2] && +match[2] > 23) {
          date = "";
        } else {
          offset = match[3] || null;
          date = date.toUpperCase();
          if (!offset && hasTime)
            date += "Z";
        }
      } else {
        date = "";
      }
    }
    super(date);
    if (!isNaN(this.getTime())) {
      this.#hasDate = hasDate;
      this.#hasTime = hasTime;
      this.#offset = offset;
    }
  }
  isDateTime() {
    return this.#hasDate && this.#hasTime;
  }
  isLocal() {
    return !this.#hasDate || !this.#hasTime || !this.#offset;
  }
  isDate() {
    return this.#hasDate && !this.#hasTime;
  }
  isTime() {
    return this.#hasTime && !this.#hasDate;
  }
  isValid() {
    return this.#hasDate || this.#hasTime;
  }
  toISOString() {
    let iso = super.toISOString();
    if (this.isDate())
      return iso.slice(0, 10);
    if (this.isTime())
      return iso.slice(11, 23);
    if (this.#offset === null)
      return iso.slice(0, -1);
    if (this.#offset === "Z")
      return iso;
    let offset = +this.#offset.slice(1, 3) * 60 + +this.#offset.slice(4, 6);
    offset = this.#offset[0] === "-" ? offset : -offset;
    let offsetDate = new Date(this.getTime() - offset * 6e4);
    return offsetDate.toISOString().slice(0, -1) + this.#offset;
  }
  static wrapAsOffsetDateTime(jsDate, offset = "Z") {
    let date = new _TomlDate(jsDate);
    date.#offset = offset;
    return date;
  }
  static wrapAsLocalDateTime(jsDate) {
    let date = new _TomlDate(jsDate);
    date.#offset = null;
    return date;
  }
  static wrapAsLocalDate(jsDate) {
    let date = new _TomlDate(jsDate);
    date.#hasTime = false;
    date.#offset = null;
    return date;
  }
  static wrapAsLocalTime(jsDate) {
    let date = new _TomlDate(jsDate);
    date.#hasDate = false;
    date.#offset = null;
    return date;
  }
};

// ../../node_modules/smol-toml/dist/primitive.js
var INT_REGEX = /^((0x[0-9a-fA-F](_?[0-9a-fA-F])*)|(([+-]|0[ob])?\d(_?\d)*))$/;
var FLOAT_REGEX = /^[+-]?\d(_?\d)*(\.\d(_?\d)*)?([eE][+-]?\d(_?\d)*)?$/;
var LEADING_ZERO = /^[+-]?0[0-9_]/;
var ESCAPE_REGEX = /^[0-9a-f]{2,8}$/i;
var ESC_MAP = {
  b: "\b",
  t: "	",
  n: "\n",
  f: "\f",
  r: "\r",
  e: "\x1B",
  '"': '"',
  "\\": "\\"
};
function parseString(str, ptr = 0, endPtr = str.length) {
  let isLiteral = str[ptr] === "'";
  let isMultiline = str[ptr++] === str[ptr] && str[ptr] === str[ptr + 1];
  if (isMultiline) {
    endPtr -= 2;
    if (str[ptr += 2] === "\r")
      ptr++;
    if (str[ptr] === "\n")
      ptr++;
  }
  let tmp = 0;
  let isEscape;
  let parsed = "";
  let sliceStart = ptr;
  while (ptr < endPtr - 1) {
    let c = str[ptr++];
    if (c === "\n" || c === "\r" && str[ptr] === "\n") {
      if (!isMultiline) {
        throw new TomlError("newlines are not allowed in strings", {
          toml: str,
          ptr: ptr - 1
        });
      }
    } else if (c < " " && c !== "	" || c === "\x7F") {
      throw new TomlError("control characters are not allowed in strings", {
        toml: str,
        ptr: ptr - 1
      });
    }
    if (isEscape) {
      isEscape = false;
      if (c === "x" || c === "u" || c === "U") {
        let code = str.slice(ptr, ptr += c === "x" ? 2 : c === "u" ? 4 : 8);
        if (!ESCAPE_REGEX.test(code)) {
          throw new TomlError("invalid unicode escape", {
            toml: str,
            ptr: tmp
          });
        }
        try {
          parsed += String.fromCodePoint(parseInt(code, 16));
        } catch {
          throw new TomlError("invalid unicode escape", {
            toml: str,
            ptr: tmp
          });
        }
      } else if (isMultiline && (c === "\n" || c === " " || c === "	" || c === "\r")) {
        ptr = skipVoid(str, ptr - 1, true);
        if (str[ptr] !== "\n" && str[ptr] !== "\r") {
          throw new TomlError("invalid escape: only line-ending whitespace may be escaped", {
            toml: str,
            ptr: tmp
          });
        }
        ptr = skipVoid(str, ptr);
      } else if (c in ESC_MAP) {
        parsed += ESC_MAP[c];
      } else {
        throw new TomlError("unrecognized escape sequence", {
          toml: str,
          ptr: tmp
        });
      }
      sliceStart = ptr;
    } else if (!isLiteral && c === "\\") {
      tmp = ptr - 1;
      isEscape = true;
      parsed += str.slice(sliceStart, tmp);
    }
  }
  return parsed + str.slice(sliceStart, endPtr - 1);
}
function parseValue(value, toml, ptr, integersAsBigInt) {
  if (value === "true")
    return true;
  if (value === "false")
    return false;
  if (value === "-inf")
    return -Infinity;
  if (value === "inf" || value === "+inf")
    return Infinity;
  if (value === "nan" || value === "+nan" || value === "-nan")
    return NaN;
  if (value === "-0")
    return integersAsBigInt ? 0n : 0;
  let isInt = INT_REGEX.test(value);
  if (isInt || FLOAT_REGEX.test(value)) {
    if (LEADING_ZERO.test(value)) {
      throw new TomlError("leading zeroes are not allowed", {
        toml,
        ptr
      });
    }
    value = value.replace(/_/g, "");
    let numeric = +value;
    if (isNaN(numeric)) {
      throw new TomlError("invalid number", {
        toml,
        ptr
      });
    }
    if (isInt) {
      if ((isInt = !Number.isSafeInteger(numeric)) && !integersAsBigInt) {
        throw new TomlError("integer value cannot be represented losslessly", {
          toml,
          ptr
        });
      }
      if (isInt || integersAsBigInt === true)
        numeric = BigInt(value);
    }
    return numeric;
  }
  const date = new TomlDate(value);
  if (!date.isValid()) {
    throw new TomlError("invalid value", {
      toml,
      ptr
    });
  }
  return date;
}

// ../../node_modules/smol-toml/dist/extract.js
function sliceAndTrimEndOf(str, startPtr, endPtr) {
  let value = str.slice(startPtr, endPtr);
  let commentIdx = value.indexOf("#");
  if (commentIdx > -1) {
    skipComment(str, commentIdx);
    value = value.slice(0, commentIdx);
  }
  return [value.trimEnd(), commentIdx];
}
function extractValue(str, ptr, end, depth, integersAsBigInt) {
  if (depth === 0) {
    throw new TomlError("document contains excessively nested structures. aborting.", {
      toml: str,
      ptr
    });
  }
  let c = str[ptr];
  if (c === "[" || c === "{") {
    let [value, endPtr2] = c === "[" ? parseArray(str, ptr, depth, integersAsBigInt) : parseInlineTable(str, ptr, depth, integersAsBigInt);
    if (end) {
      endPtr2 = skipVoid(str, endPtr2);
      if (str[endPtr2] === ",")
        endPtr2++;
      else if (str[endPtr2] !== end) {
        throw new TomlError("expected comma or end of structure", {
          toml: str,
          ptr: endPtr2
        });
      }
    }
    return [value, endPtr2];
  }
  let endPtr;
  if (c === '"' || c === "'") {
    endPtr = getStringEnd(str, ptr);
    let parsed = parseString(str, ptr, endPtr);
    if (end) {
      endPtr = skipVoid(str, endPtr);
      if (str[endPtr] && str[endPtr] !== "," && str[endPtr] !== end && str[endPtr] !== "\n" && str[endPtr] !== "\r") {
        throw new TomlError("unexpected character encountered", {
          toml: str,
          ptr: endPtr
        });
      }
      endPtr += +(str[endPtr] === ",");
    }
    return [parsed, endPtr];
  }
  endPtr = skipUntil(str, ptr, ",", end);
  let slice = sliceAndTrimEndOf(str, ptr, endPtr - +(str[endPtr - 1] === ","));
  if (!slice[0]) {
    throw new TomlError("incomplete key-value declaration: no value specified", {
      toml: str,
      ptr
    });
  }
  if (end && slice[1] > -1) {
    endPtr = skipVoid(str, ptr + slice[1]);
    endPtr += +(str[endPtr] === ",");
  }
  return [
    parseValue(slice[0], str, ptr, integersAsBigInt),
    endPtr
  ];
}

// ../../node_modules/smol-toml/dist/struct.js
var KEY_PART_RE = /^[a-zA-Z0-9-_]+[ \t]*$/;
function parseKey(str, ptr, end = "=") {
  let dot = ptr - 1;
  let parsed = [];
  let endPtr = str.indexOf(end, ptr);
  if (endPtr < 0) {
    throw new TomlError("incomplete key-value: cannot find end of key", {
      toml: str,
      ptr
    });
  }
  do {
    let c = str[ptr = ++dot];
    if (c !== " " && c !== "	") {
      if (c === '"' || c === "'") {
        if (c === str[ptr + 1] && c === str[ptr + 2]) {
          throw new TomlError("multiline strings are not allowed in keys", {
            toml: str,
            ptr
          });
        }
        let eos = getStringEnd(str, ptr);
        if (eos < 0) {
          throw new TomlError("unfinished string encountered", {
            toml: str,
            ptr
          });
        }
        dot = str.indexOf(".", eos);
        let strEnd = str.slice(eos, dot < 0 || dot > endPtr ? endPtr : dot);
        let newLine = indexOfNewline(strEnd);
        if (newLine > -1) {
          throw new TomlError("newlines are not allowed in keys", {
            toml: str,
            ptr: ptr + dot + newLine
          });
        }
        if (strEnd.trimStart()) {
          throw new TomlError("found extra tokens after the string part", {
            toml: str,
            ptr: eos
          });
        }
        if (endPtr < eos) {
          endPtr = str.indexOf(end, eos);
          if (endPtr < 0) {
            throw new TomlError("incomplete key-value: cannot find end of key", {
              toml: str,
              ptr
            });
          }
        }
        parsed.push(parseString(str, ptr, eos));
      } else {
        dot = str.indexOf(".", ptr);
        let part = str.slice(ptr, dot < 0 || dot > endPtr ? endPtr : dot);
        if (!KEY_PART_RE.test(part)) {
          throw new TomlError("only letter, numbers, dashes and underscores are allowed in keys", {
            toml: str,
            ptr
          });
        }
        parsed.push(part.trimEnd());
      }
    }
  } while (dot + 1 && dot < endPtr);
  return [parsed, skipVoid(str, endPtr + 1, true, true)];
}
function parseInlineTable(str, ptr, depth, integersAsBigInt) {
  let res = {};
  let seen = /* @__PURE__ */ new Set();
  let c;
  ptr++;
  while ((c = str[ptr++]) !== "}" && c) {
    if (c === ",") {
      throw new TomlError("expected value, found comma", {
        toml: str,
        ptr: ptr - 1
      });
    } else if (c === "#")
      ptr = skipComment(str, ptr);
    else if (c !== " " && c !== "	" && c !== "\n" && c !== "\r") {
      let k;
      let t = res;
      let hasOwn = false;
      let [key, keyEndPtr] = parseKey(str, ptr - 1);
      for (let i = 0; i < key.length; i++) {
        if (i)
          t = hasOwn ? t[k] : t[k] = {};
        k = key[i];
        if ((hasOwn = Object.hasOwn(t, k)) && (typeof t[k] !== "object" || seen.has(t[k]))) {
          throw new TomlError("trying to redefine an already defined value", {
            toml: str,
            ptr
          });
        }
        if (!hasOwn && k === "__proto__") {
          Object.defineProperty(t, k, { enumerable: true, configurable: true, writable: true });
        }
      }
      if (hasOwn) {
        throw new TomlError("trying to redefine an already defined value", {
          toml: str,
          ptr
        });
      }
      let [value, valueEndPtr] = extractValue(str, keyEndPtr, "}", depth - 1, integersAsBigInt);
      seen.add(value);
      t[k] = value;
      ptr = valueEndPtr;
    }
  }
  if (!c) {
    throw new TomlError("unfinished table encountered", {
      toml: str,
      ptr
    });
  }
  return [res, ptr];
}
function parseArray(str, ptr, depth, integersAsBigInt) {
  let res = [];
  let c;
  ptr++;
  while ((c = str[ptr++]) !== "]" && c) {
    if (c === ",") {
      throw new TomlError("expected value, found comma", {
        toml: str,
        ptr: ptr - 1
      });
    } else if (c === "#")
      ptr = skipComment(str, ptr);
    else if (c !== " " && c !== "	" && c !== "\n" && c !== "\r") {
      let e = extractValue(str, ptr - 1, "]", depth - 1, integersAsBigInt);
      res.push(e[0]);
      ptr = e[1];
    }
  }
  if (!c) {
    throw new TomlError("unfinished array encountered", {
      toml: str,
      ptr
    });
  }
  return [res, ptr];
}

// ../../node_modules/smol-toml/dist/parse.js
function peekTable(key, table, meta, type) {
  let t = table;
  let m = meta;
  let k;
  let hasOwn = false;
  let state;
  for (let i = 0; i < key.length; i++) {
    if (i) {
      t = hasOwn ? t[k] : t[k] = {};
      m = (state = m[k]).c;
      if (type === 0 && (state.t === 1 || state.t === 2)) {
        return null;
      }
      if (state.t === 2) {
        let l = t.length - 1;
        t = t[l];
        m = m[l].c;
      }
    }
    k = key[i];
    if ((hasOwn = Object.hasOwn(t, k)) && m[k]?.t === 0 && m[k]?.d) {
      return null;
    }
    if (!hasOwn) {
      if (k === "__proto__") {
        Object.defineProperty(t, k, { enumerable: true, configurable: true, writable: true });
        Object.defineProperty(m, k, { enumerable: true, configurable: true, writable: true });
      }
      m[k] = {
        t: i < key.length - 1 && type === 2 ? 3 : type,
        d: false,
        i: 0,
        c: {}
      };
    }
  }
  state = m[k];
  if (state.t !== type && !(type === 1 && state.t === 3)) {
    return null;
  }
  if (type === 2) {
    if (!state.d) {
      state.d = true;
      t[k] = [];
    }
    t[k].push(t = {});
    state.c[state.i++] = state = { t: 1, d: false, i: 0, c: {} };
  }
  if (state.d) {
    return null;
  }
  state.d = true;
  if (type === 1) {
    t = hasOwn ? t[k] : t[k] = {};
  } else if (type === 0 && hasOwn) {
    return null;
  }
  return [k, t, state.c];
}
function parse(toml, { maxDepth = 1e3, integersAsBigInt } = {}) {
  let res = {};
  let meta = {};
  let tbl = res;
  let m = meta;
  for (let ptr = skipVoid(toml, 0); ptr < toml.length; ) {
    if (toml[ptr] === "[") {
      let isTableArray = toml[++ptr] === "[";
      let k = parseKey(toml, ptr += +isTableArray, "]");
      if (isTableArray) {
        if (toml[k[1] - 1] !== "]") {
          throw new TomlError("expected end of table declaration", {
            toml,
            ptr: k[1] - 1
          });
        }
        k[1]++;
      }
      let p = peekTable(
        k[0],
        res,
        meta,
        isTableArray ? 2 : 1
        /* Type.EXPLICIT */
      );
      if (!p) {
        throw new TomlError("trying to redefine an already defined table or value", {
          toml,
          ptr
        });
      }
      m = p[2];
      tbl = p[1];
      ptr = k[1];
    } else {
      let k = parseKey(toml, ptr);
      let p = peekTable(
        k[0],
        tbl,
        m,
        0
        /* Type.DOTTED */
      );
      if (!p) {
        throw new TomlError("trying to redefine an already defined table or value", {
          toml,
          ptr
        });
      }
      let v = extractValue(toml, k[1], void 0, maxDepth, integersAsBigInt);
      p[1][p[0]] = v[0];
      ptr = v[1];
    }
    ptr = skipVoid(toml, ptr, true);
    if (toml[ptr] && toml[ptr] !== "\n" && toml[ptr] !== "\r") {
      throw new TomlError("each key-value declaration must be followed by an end-of-line", {
        toml,
        ptr
      });
    }
    ptr = skipVoid(toml, ptr);
  }
  return res;
}

// ../core/dist/index.js
import crypto from "crypto";
function configFilePath() {
  return join(homedir(), ".pionex", "config.toml");
}
function readFullConfig() {
  const path2 = configFilePath();
  if (!existsSync(path2)) return { profiles: {} };
  const raw = readFileSync(path2, "utf-8");
  return parse(raw);
}
function readTomlProfile(profileName) {
  const config = readFullConfig();
  const name = profileName ?? config.default_profile ?? "default";
  return config.profiles?.[name] ?? {};
}
var CLIENT_NAMES = {
  "claude-desktop": "Claude Desktop",
  cursor: "Cursor",
  windsurf: "Windsurf",
  vscode: "VS Code",
  "claude-code": "Claude Code CLI",
  openclaw: "OpenClaw (mcporter)"
};
var SUPPORTED_CLIENTS = Object.keys(CLIENT_NAMES);
var PIONEX_API_DEFAULT_BASE_URL = "https://api.pionex.com";
var MODULES = ["market", "account", "orders"];
var DEFAULT_MODULES = ["market", "account", "orders"];
var ConfigError = class extends Error {
  suggestion;
  constructor(message, suggestion) {
    super(message);
    this.name = "ConfigError";
    this.suggestion = suggestion;
  }
};
var PionexApiError = class extends Error {
  status;
  endpoint;
  responseText;
  constructor(message, opts) {
    super(message);
    this.name = "PionexApiError";
    this.status = opts?.status;
    this.endpoint = opts?.endpoint;
    this.responseText = opts?.responseText;
  }
};
function toToolErrorPayload(error) {
  if (error instanceof ConfigError) {
    return {
      error: true,
      type: "ConfigError",
      message: error.message,
      suggestion: error.suggestion
    };
  }
  if (error instanceof PionexApiError) {
    return {
      error: true,
      type: "PionexApiError",
      message: error.message,
      status: error.status,
      endpoint: error.endpoint,
      responseText: error.responseText
    };
  }
  const message = error instanceof Error ? error.message : String(error);
  return { error: true, type: "Error", message };
}
function parseModuleList(rawModules) {
  if (!rawModules || rawModules.trim().length === 0) return [...DEFAULT_MODULES];
  const trimmed = rawModules.trim().toLowerCase();
  if (trimmed === "all") return [...MODULES];
  const requested = trimmed.split(",").map((x) => x.trim()).filter(Boolean);
  if (requested.length === 0) return [...DEFAULT_MODULES];
  const out = [];
  for (const m of requested) {
    if (!MODULES.includes(m)) {
      throw new ConfigError(`Unknown module "${m}".`, `Use one of: ${MODULES.join(", ")} or "all".`);
    }
    out.push(m);
  }
  return Array.from(new Set(out));
}
function loadConfig(cli) {
  const toml = readTomlProfile(cli.profile);
  const apiKey = process.env.PIONEX_API_KEY?.trim() || toml.api_key;
  const apiSecret = process.env.PIONEX_API_SECRET?.trim() || toml.secret_key;
  const hasAuth = Boolean(apiKey && apiSecret);
  const partialAuth = Boolean(apiKey) || Boolean(apiSecret);
  if (partialAuth && !hasAuth) {
    throw new ConfigError(
      "Partial Pionex API credentials detected.",
      "Set both PIONEX_API_KEY and PIONEX_API_SECRET (env vars or config.toml profile)."
    );
  }
  const baseUrl = (cli.baseUrl?.trim() || process.env.PIONEX_BASE_URL?.trim() || toml.base_url || PIONEX_API_DEFAULT_BASE_URL).replace(/\/+$/, "");
  if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
    throw new ConfigError(`Invalid base URL "${baseUrl}".`, "PIONEX_BASE_URL must start with http:// or https://");
  }
  return {
    apiKey,
    apiSecret,
    hasAuth,
    baseUrl,
    modules: parseModuleList(cli.modules),
    readOnly: cli.readOnly
  };
}
function requireAuth(config) {
  if (!config.apiKey || !config.apiSecret) {
    throw new ConfigError(
      "This operation requires authentication, but no Pionex API credentials were found.",
      "Run 'pionex-ai-kit onboard' to create ~/.pionex/config.toml, or set PIONEX_API_KEY and PIONEX_API_SECRET."
    );
  }
  return { apiKey: config.apiKey, apiSecret: config.apiSecret };
}
function buildQueryString(query) {
  if (!query) return "";
  const entries = Object.entries(query).filter(([, v]) => v !== void 0 && v !== null);
  if (entries.length === 0) return "";
  const params = new URLSearchParams();
  for (const [k, v] of entries) params.set(k, String(v));
  return params.toString();
}
function buildSignedRequest(config, method, path2, query, bodyJson) {
  const { apiKey, apiSecret } = requireAuth(config);
  const timestamp = Date.now().toString();
  const params = { ...query, timestamp };
  const sortedKeys = Object.keys(params).sort();
  const queryString = sortedKeys.map((k) => `${k}=${params[k]}`).join("&");
  const pathUrl = `${path2}?${queryString}`;
  let payload = `${method}${pathUrl}`;
  if (bodyJson != null) payload += bodyJson;
  const signature = crypto.createHmac("sha256", apiSecret).update(payload).digest("hex");
  const url = `${config.baseUrl}${pathUrl}`;
  const headers = {
    "PIONEX-KEY": apiKey,
    "PIONEX-SIGNATURE": signature,
    "Content-Type": "application/json"
  };
  return { url, headers, bodyJson };
}
async function readTextSafe(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
var PionexRestClient = class {
  config;
  constructor(config) {
    this.config = config;
  }
  async publicGet(path2, query = {}) {
    const qs = buildQueryString(query);
    const endpoint = qs ? `${path2}?${qs}` : path2;
    const url = `${this.config.baseUrl}${endpoint}`;
    const res = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
    if (!res.ok) {
      const txt = await readTextSafe(res);
      throw new PionexApiError(`HTTP ${res.status}: ${txt || res.statusText}`, { status: res.status, endpoint, responseText: txt });
    }
    const data = await res.json();
    return { endpoint, requestTime: (/* @__PURE__ */ new Date()).toISOString(), data };
  }
  async signedGet(path2, query = {}) {
    const { url, headers } = buildSignedRequest(this.config, "GET", path2, query, null);
    const endpoint = `${path2}?${buildQueryString({ ...query, timestamp: "..." })}`;
    const res = await fetch(url, { method: "GET", headers });
    if (!res.ok) {
      const txt = await readTextSafe(res);
      throw new PionexApiError(`HTTP ${res.status}: ${txt || res.statusText}`, { status: res.status, endpoint: path2, responseText: txt });
    }
    const data = await res.json();
    return { endpoint: path2, requestTime: (/* @__PURE__ */ new Date()).toISOString(), data };
  }
  async signedPost(path2, body) {
    const bodyJson = JSON.stringify(body);
    const { url, headers, bodyJson: bj } = buildSignedRequest(this.config, "POST", path2, {}, bodyJson);
    const res = await fetch(url, { method: "POST", headers, body: bj ?? void 0 });
    if (!res.ok) {
      const txt = await readTextSafe(res);
      throw new PionexApiError(`HTTP ${res.status}: ${txt || res.statusText}`, { status: res.status, endpoint: path2, responseText: txt });
    }
    const data = await res.json();
    return { endpoint: path2, requestTime: (/* @__PURE__ */ new Date()).toISOString(), data };
  }
  async signedDelete(path2, body) {
    const bodyJson = JSON.stringify(body);
    const { url, headers, bodyJson: bj } = buildSignedRequest(this.config, "DELETE", path2, {}, bodyJson);
    const res = await fetch(url, { method: "DELETE", headers, body: bj ?? void 0 });
    if (!res.ok) {
      const txt = await readTextSafe(res);
      throw new PionexApiError(`HTTP ${res.status}: ${txt || res.statusText}`, { status: res.status, endpoint: path2, responseText: txt });
    }
    const data = await res.json();
    return { endpoint: path2, requestTime: (/* @__PURE__ */ new Date()).toISOString(), data };
  }
};
function registerMarketTools() {
  return [
    {
      name: "pionex_market_get_depth",
      module: "market",
      isWrite: false,
      description: "Get order book depth (bids and asks) for a symbol. Use for spread, liquidity, or best bid/ask.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string", description: "e.g. BTC_USDT" },
          limit: { type: "integer", description: "Price levels (1-100), default 5" }
        },
        required: ["symbol"]
      },
      async handler(args, { client }) {
        const symbol = String(args.symbol);
        const limit = args.limit == null ? void 0 : Number(args.limit);
        const q = { symbol };
        if (limit != null && Number.isFinite(limit)) q.limit = limit;
        return (await client.publicGet("/api/v1/market/depth", q)).data;
      }
    },
    {
      name: "pionex_market_get_trades",
      module: "market",
      isWrite: false,
      description: "Get recent trades for a symbol. Use for latest price and volume.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string", description: "e.g. BTC_USDT" },
          limit: { type: "integer", description: "Default 5 (1-100)" }
        },
        required: ["symbol"]
      },
      async handler(args, { client }) {
        const symbol = String(args.symbol);
        const limit = args.limit == null ? void 0 : Number(args.limit);
        const q = { symbol };
        if (limit != null && Number.isFinite(limit)) q.limit = limit;
        return (await client.publicGet("/api/v1/market/trades", q)).data;
      }
    },
    {
      name: "pionex_market_get_symbol_info",
      module: "market",
      isWrite: false,
      description: "Get symbol metadata (precision, min size, price limits). Call before placing orders to avoid amount/size filter errors.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbols: {
            type: "string",
            description: 'Optional. One or more symbols, comma-separated, e.g. "BTC_USDT" or "BTC_USDT,ADA_USDT".'
          },
          type: {
            type: "string",
            enum: ["SPOT", "PERP"],
            description: "Optional. If no symbols are specified, filter by type (default SPOT)."
          }
        }
      },
      async handler(args, { client }) {
        const q = {};
        if (args.symbols) q.symbols = String(args.symbols);
        if (!args.symbols && args.type) q.type = String(args.type);
        return (await client.publicGet("/api/v1/common/symbols", q)).data;
      }
    },
    {
      name: "pionex_market_get_tickers",
      module: "market",
      isWrite: false,
      description: "Get 24-hour ticker(s): open, close, high, low, volume, amount, count. Optional symbol or type (SPOT/PERP).",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string", description: "e.g. BTC_USDT; if omitted, returns all tickers filtered by type" },
          type: { type: "string", enum: ["SPOT", "PERP"], description: "If symbol is not specified, filter by type." }
        }
      },
      async handler(args, { client }) {
        const q = {};
        if (args.symbol) q.symbol = String(args.symbol);
        if (args.type) q.type = String(args.type);
        return (await client.publicGet("/api/v1/market/tickers", q)).data;
      }
    },
    {
      name: "pionex_market_get_klines",
      module: "market",
      isWrite: false,
      description: "Get OHLCV klines (candlestick) for a symbol. Use for charts or historical price/volume.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string", description: "e.g. BTC_USDT" },
          interval: { type: "string", enum: ["1M", "5M", "15M", "30M", "60M", "4H", "8H", "12H", "1D"], description: "Kline interval." },
          endTime: { type: "integer", description: "End time in milliseconds." },
          limit: { type: "integer", description: "Default 100 (1-500)." }
        },
        required: ["symbol", "interval"]
      },
      async handler(args, { client }) {
        const symbol = String(args.symbol);
        const interval = String(args.interval);
        const q = { symbol, interval };
        if (args.endTime != null) q.endTime = Number(args.endTime);
        if (args.limit != null) q.limit = Number(args.limit);
        return (await client.publicGet("/api/v1/market/klines", q)).data;
      }
    }
  ];
}
function registerAccountTools() {
  return [
    {
      name: "pionex_account_get_balance",
      module: "account",
      isWrite: false,
      description: "Query spot account balances for all currencies. Requires API key and secret in ~/.pionex/config.toml or env.",
      inputSchema: { type: "object", additionalProperties: false, properties: {} },
      async handler(_args, { client }) {
        return (await client.signedGet("/api/v1/account/balances")).data;
      }
    }
  ];
}
function registerOrdersTools() {
  return [
    {
      name: "pionex_orders_new_order",
      module: "orders",
      isWrite: true,
      description: "Create a spot order on Pionex. LIMIT requires symbol/side/type=LIMIT/price/size. MARKET BUY requires amount (quote). MARKET SELL requires size (base).",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string", description: "e.g. BTC_USDT" },
          side: { type: "string", enum: ["BUY", "SELL"] },
          type: { type: "string", enum: ["LIMIT", "MARKET"] },
          clientOrderId: { type: "string", description: "Optional client order id (max 64 chars)" },
          size: { type: "string", description: "Quantity; required for limit and market sell" },
          price: { type: "string", description: "Required for limit order" },
          amount: { type: "string", description: "Quote amount; required for market buy" },
          IOC: { type: "boolean", description: "Immediate-or-cancel, default false" }
        },
        required: ["symbol", "side", "type"]
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; order placement is disabled.");
        }
        const body = {};
        if (args.symbol != null) body.symbol = String(args.symbol);
        if (args.side != null) body.side = String(args.side);
        if (args.type != null) body.type = String(args.type);
        if (args.clientOrderId != null) body.clientOrderId = String(args.clientOrderId);
        if (args.size != null) body.size = String(args.size);
        if (args.price != null) body.price = String(args.price);
        if (args.amount != null) body.amount = String(args.amount);
        if (args.IOC != null) body.IOC = Boolean(args.IOC);
        return (await client.signedPost("/api/v1/trade/order", body)).data;
      }
    },
    {
      name: "pionex_orders_get_order",
      module: "orders",
      isWrite: false,
      description: "Get a single order by order ID.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string", description: "e.g. BTC_USDT" },
          orderId: { type: "integer", description: "Order id" }
        },
        required: ["symbol", "orderId"]
      },
      async handler(args, { client }) {
        const symbol = String(args.symbol);
        const orderId = Number(args.orderId);
        return (await client.signedGet("/api/v1/trade/order", { symbol, orderId })).data;
      }
    },
    {
      name: "pionex_orders_get_order_by_client_order_id",
      module: "orders",
      isWrite: false,
      description: "Get a single order by client order ID.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string", description: "e.g. BTC_USDT" },
          clientOrderId: { type: "string", description: "Client order id" }
        },
        required: ["symbol", "clientOrderId"]
      },
      async handler(args, { client }) {
        const symbol = String(args.symbol);
        const clientOrderId = String(args.clientOrderId);
        return (await client.signedGet("/api/v1/trade/orderByClientOrderId", { symbol, clientOrderId })).data;
      }
    },
    {
      name: "pionex_orders_get_open_orders",
      module: "orders",
      isWrite: false,
      description: "List open (unfilled) orders for a symbol.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: { symbol: { type: "string", description: "e.g. BTC_USDT" } },
        required: ["symbol"]
      },
      async handler(args, { client }) {
        const symbol = String(args.symbol);
        return (await client.signedGet("/api/v1/trade/openOrders", { symbol })).data;
      }
    },
    {
      name: "pionex_orders_get_all_orders",
      module: "orders",
      isWrite: false,
      description: "List order history for a symbol (filled and cancelled), with optional limit.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string", description: "e.g. BTC_USDT" },
          limit: { type: "integer", description: "Default 1 (1-100)" }
        },
        required: ["symbol"]
      },
      async handler(args, { client }) {
        const symbol = String(args.symbol);
        const q = { symbol };
        if (args.limit != null) q.limit = Number(args.limit);
        return (await client.signedGet("/api/v1/trade/allOrders", q)).data;
      }
    },
    {
      name: "pionex_orders_cancel_order",
      module: "orders",
      isWrite: true,
      description: "Cancel an open order by order ID.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string", description: "e.g. BTC_USDT" },
          orderId: { type: "integer", description: "Order id" }
        },
        required: ["symbol", "orderId"]
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; order cancellation is disabled.");
        }
        const symbol = String(args.symbol);
        const orderId = Number(args.orderId);
        return (await client.signedDelete("/api/v1/trade/order", { symbol, orderId })).data;
      }
    },
    {
      name: "pionex_orders_get_fills",
      module: "orders",
      isWrite: false,
      description: "Get filled trades (fills) for a symbol in a time range. Requires API key. Returns up to 100 latest fills.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string", description: "e.g. BTC_USDT" },
          startTime: { type: "integer", description: "Start time in milliseconds." },
          endTime: { type: "integer", description: "End time in milliseconds." }
        },
        required: ["symbol"]
      },
      async handler(args, { client }) {
        const symbol = String(args.symbol);
        const q = { symbol };
        if (args.startTime != null) q.startTime = Number(args.startTime);
        if (args.endTime != null) q.endTime = Number(args.endTime);
        return (await client.signedGet("/api/v1/trade/fills", q)).data;
      }
    },
    {
      name: "pionex_orders_cancel_all_orders",
      module: "orders",
      isWrite: true,
      description: "Cancel all open orders for a symbol.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: { symbol: { type: "string", description: "e.g. BTC_USDT" } },
        required: ["symbol"]
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; cancel-all is disabled.");
        }
        const symbol = String(args.symbol);
        return (await client.signedDelete("/api/v1/trade/allOrders", { symbol })).data;
      }
    }
  ];
}
function allToolSpecs() {
  return [...registerMarketTools(), ...registerAccountTools(), ...registerOrdersTools()];
}
function buildTools(config) {
  const enabled = new Set(config.modules);
  const tools = allToolSpecs().filter((t) => enabled.has(t.module));
  if (!config.readOnly) return tools;
  return tools.filter((t) => !t.isWrite);
}
function toMcpTool(tool) {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: {
      readOnlyHint: !tool.isWrite,
      destructiveHint: tool.isWrite,
      idempotentHint: !tool.isWrite,
      openWorldHint: false
    }
  };
}

// src/server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
var SERVER_NAME = "pionex-trade-mcp";
var SERVER_VERSION = "0.3.0";
var SYSTEM_CAPABILITIES_TOOL_NAME = "system_get_capabilities";
var SYSTEM_CAPABILITIES_TOOL = {
  name: SYSTEM_CAPABILITIES_TOOL_NAME,
  description: "Return machine-readable server capabilities and module availability for agent planning.",
  inputSchema: { type: "object", additionalProperties: false },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false
  }
};
function buildCapabilitySnapshot(config) {
  const enabledModules = new Set(config.modules);
  const moduleAvailability = {};
  for (const moduleId of MODULES) {
    if (!enabledModules.has(moduleId)) {
      moduleAvailability[moduleId] = { status: "disabled", reasonCode: "MODULE_FILTERED" };
      continue;
    }
    if (moduleId === "market") {
      moduleAvailability[moduleId] = { status: "enabled" };
      continue;
    }
    if (!config.hasAuth) {
      moduleAvailability[moduleId] = { status: "requires_auth", reasonCode: "AUTH_MISSING" };
      continue;
    }
    moduleAvailability[moduleId] = { status: "enabled" };
  }
  return {
    readOnly: config.readOnly,
    hasAuth: config.hasAuth,
    moduleAvailability
  };
}
function successResult(toolName, data, snapshot) {
  const payload = {
    tool: toolName,
    ok: true,
    data,
    capabilities: snapshot,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload
  };
}
function errorResult(toolName, error, snapshot) {
  const payload = toToolErrorPayload(error);
  const structured = {
    tool: toolName,
    ...payload,
    serverVersion: SERVER_VERSION,
    capabilities: snapshot
  };
  return {
    isError: true,
    content: [{ type: "text", text: JSON.stringify(structured, null, 2) }],
    structuredContent: structured
  };
}
function createServer(config) {
  const client = new PionexRestClient(config);
  const tools = buildTools(config);
  const toolMap = new Map(tools.map((t) => [t.name, t]));
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: [...tools.map(toMcpTool), SYSTEM_CAPABILITIES_TOOL] };
  });
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const snapshot = buildCapabilitySnapshot(config);
    if (toolName === SYSTEM_CAPABILITIES_TOOL_NAME) {
      return successResult(
        toolName,
        {
          server: { name: SERVER_NAME, version: SERVER_VERSION },
          capabilities: snapshot
        },
        snapshot
      );
    }
    const tool = toolMap.get(toolName);
    if (!tool) {
      return errorResult(toolName, new Error(`Tool "${toolName}" is not available in this server session.`), snapshot);
    }
    try {
      const data = await tool.handler(request.params.arguments ?? {}, { config, client });
      return successResult(toolName, data, snapshot);
    } catch (e) {
      return errorResult(toolName, e, snapshot);
    }
  });
  return server;
}

// src/index.ts
function printHelp() {
  process.stdout.write(`
Usage: pionex-trade-mcp [options]

Options:
  --modules <list>     Comma-separated list of modules to load
                       Available: market, account, orders
                       Special: "all" loads all modules
                       Default: market,account,orders

  --profile <name>     Profile to load from ~/.pionex/config.toml
                       Falls back to default_profile in config, then "default"
  --base-url <url>     Override API base URL (otherwise env PIONEX_BASE_URL / toml / default)
  --read-only          Expose only read/query tools and disable write operations
  --help               Show this help message
  --version            Show version

Credentials (priority: env vars > ~/.pionex/config.toml > none):
  PIONEX_API_KEY       Pionex API key
  PIONEX_API_SECRET    Pionex API secret
  PIONEX_BASE_URL      Optional API base URL override
`);
}
function parseCli() {
  const parsed = parseArgs({
    options: {
      modules: { type: "string" },
      profile: { type: "string" },
      "base-url": { type: "string" },
      "read-only": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
      version: { type: "boolean", default: false }
    },
    allowPositionals: false
  });
  return {
    modules: parsed.values.modules,
    profile: parsed.values.profile,
    baseUrl: parsed.values["base-url"],
    readOnly: parsed.values["read-only"] ?? false,
    help: parsed.values.help ?? false,
    version: parsed.values.version ?? false
  };
}
async function main() {
  const cli = parseCli();
  if (cli.help) {
    printHelp();
    return;
  }
  if (cli.version) {
    process.stdout.write(`pionex-trade-mcp
`);
    return;
  }
  const config = loadConfig({
    modules: cli.modules,
    profile: cli.profile,
    baseUrl: cli.baseUrl,
    readOnly: cli.readOnly
  });
  const server = createServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
main().catch((error) => {
  const payload = toToolErrorPayload(error);
  process.stderr.write(`${JSON.stringify(payload, null, 2)}
`);
  process.exitCode = 1;
});
export {
  main
};
/*! Bundled license information:

smol-toml/dist/error.js:
smol-toml/dist/util.js:
smol-toml/dist/date.js:
smol-toml/dist/primitive.js:
smol-toml/dist/extract.js:
smol-toml/dist/struct.js:
smol-toml/dist/parse.js:
smol-toml/dist/stringify.js:
smol-toml/dist/index.js:
  (*!
   * Copyright (c) Squirrel Chat et al., All rights reserved.
   * SPDX-License-Identifier: BSD-3-Clause
   *
   * Redistribution and use in source and binary forms, with or without
   * modification, are permitted provided that the following conditions are met:
   *
   * 1. Redistributions of source code must retain the above copyright notice, this
   *    list of conditions and the following disclaimer.
   * 2. Redistributions in binary form must reproduce the above copyright notice,
   *    this list of conditions and the following disclaimer in the
   *    documentation and/or other materials provided with the distribution.
   * 3. Neither the name of the copyright holder nor the names of its contributors
   *    may be used to endorse or promote products derived from this software without
   *    specific prior written permission.
   *
   * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
   * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
   * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
   * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
   * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
   * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
   * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
   * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
   * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
   * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
   *)
*/
//# sourceMappingURL=index.js.map