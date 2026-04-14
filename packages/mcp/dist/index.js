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
var MODULES = ["market", "account", "orders", "bot", "earn_dual"];
var DEFAULT_MODULES = ["market", "account", "orders", "bot", "earn_dual"];
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
  async signedDeleteQuery(path2, query = {}) {
    const { url, headers } = buildSignedRequest(this.config, "DELETE", path2, query, null);
    const res = await fetch(url, { method: "DELETE", headers });
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
      name: "pionex_market_get_book_tickers",
      module: "market",
      isWrite: false,
      description: "Get best bid/ask ticker(s). Optional symbol or type (SPOT/PERP).",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string", description: "e.g. BTC_USDT; if omitted, returns all book tickers filtered by type" },
          type: { type: "string", enum: ["SPOT", "PERP"], description: "If symbol is not specified, filter by type." }
        }
      },
      async handler(args, { client }) {
        const q = {};
        if (args.symbol) q.symbol = String(args.symbol);
        if (args.type) q.type = String(args.type);
        return (await client.publicGet("/api/v1/market/bookTickers", q)).data;
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
      name: "pionex_orders_get_fills_by_order_id",
      module: "orders",
      isWrite: false,
      description: "Get fills for a specific order by symbol and orderId.",
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
        return (await client.signedGet("/api/v1/trade/fillsByOrderId", { symbol, orderId })).data;
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
          throw new Error("Server is running in --read-only mode; cancel_all is disabled.");
        }
        const symbol = String(args.symbol);
        return (await client.signedDelete("/api/v1/trade/allOrders", { symbol })).data;
      }
    }
  ];
}
var CREATE_FUTURES_GRID_ORDER_DATA_KEYS = [
  "top",
  "bottom",
  "row",
  "grid_type",
  "trend",
  "leverage",
  "extraMargin",
  "quoteInvestment",
  "condition",
  "conditionDirection",
  "lossStopType",
  "lossStop",
  "lossStopDelay",
  "profitStopType",
  "profitStop",
  "profitStopDelay",
  "lossStopHigh",
  "shareRatio",
  "investCoin",
  "investmentFrom",
  "uiInvestCoin",
  "lossStopLimitPrice",
  "lossStopLimitHighPrice",
  "profitStopLimitPrice",
  "slippage",
  "bonusId",
  "uiExtraData",
  "movingIndicatorType",
  "movingIndicatorInterval",
  "movingIndicatorParam",
  "movingTrailingUpParam",
  "cateType",
  "movingTop",
  "movingBottom",
  "enableFollowClosed"
];
var ORDER_DATA_KEY_SET = new Set(CREATE_FUTURES_GRID_ORDER_DATA_KEYS);
function asNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid "${field}": expected non-empty string.`);
  }
  return value.trim();
}
function asFiniteNumber(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid "${field}": expected finite number.`);
  }
  return value;
}
function asPositiveNumber(value, field) {
  const n = asFiniteNumber(value, field);
  if (n <= 0) throw new Error(`Invalid "${field}": expected number > 0.`);
  return n;
}
function asPositiveInteger(value, field) {
  const n = asPositiveNumber(value, field);
  if (!Number.isInteger(n)) {
    throw new Error(`Invalid "${field}": expected positive integer.`);
  }
  return n;
}
function asBoolean(value, field) {
  if (typeof value !== "boolean") {
    throw new Error(`Invalid "${field}": expected boolean.`);
  }
  return value;
}
function assertEnum(value, field, allowed) {
  if (!allowed.includes(value)) {
    throw new Error(`Invalid "${field}": expected one of ${allowed.join(", ")}.`);
  }
}
function asPositiveDecimalString(value, field) {
  const s = asNonEmptyString(value, field);
  if (!/^\d+(\.\d+)?$/.test(s)) {
    throw new Error(`Invalid "${field}": expected positive decimal string.`);
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid "${field}": expected positive decimal string.`);
  }
  return s;
}
function asPositiveDecimalStringLoose(value, field) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return String(value);
  }
  return asPositiveDecimalString(value, field);
}
function asNonNegativeDecimalString(value, field) {
  const s = asNonEmptyString(value, field);
  if (!/^\d+(\.\d+)?$/.test(s)) {
    throw new Error(`Invalid "${field}": expected non-negative decimal string.`);
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Invalid "${field}": expected non-negative decimal string.`);
  }
  return s;
}
function asOptionalString(value, field) {
  if (typeof value !== "string") {
    throw new Error(`Invalid "${field}": expected string.`);
  }
  return value;
}
function asOptionalNonNegativeNumber(value, field) {
  const n = asFiniteNumber(value, field);
  if (n < 0) throw new Error(`Invalid "${field}": expected number >= 0.`);
  return n;
}
function parseAndValidateCreateFuturesGridBuOrderData(raw) {
  const data = { ...raw };
  for (const k of Object.keys(data)) {
    if (!ORDER_DATA_KEY_SET.has(k)) {
      throw new Error(`Unknown buOrderData property "${k}". Allowed keys: ${CREATE_FUTURES_GRID_ORDER_DATA_KEYS.join(", ")}.`);
    }
  }
  const top = asPositiveDecimalStringLoose(data.top, "buOrderData.top");
  const bottom = asPositiveDecimalStringLoose(data.bottom, "buOrderData.bottom");
  if (Number(top) <= Number(bottom)) {
    throw new Error('Invalid "buOrderData.top": expected top > bottom.');
  }
  const row = asPositiveInteger(data.row, "buOrderData.row");
  const gridType = asNonEmptyString(data.grid_type, "buOrderData.grid_type");
  assertEnum(gridType, "buOrderData.grid_type", ["arithmetic", "geometric"]);
  const trend = asNonEmptyString(data.trend, "buOrderData.trend");
  assertEnum(trend, "buOrderData.trend", ["long", "short", "no_trend"]);
  const leverage = asPositiveNumber(data.leverage, "buOrderData.leverage");
  const quoteInvestment = asPositiveDecimalStringLoose(data.quoteInvestment, "buOrderData.quoteInvestment");
  const out = {
    top,
    bottom,
    row,
    grid_type: gridType,
    trend,
    leverage,
    quoteInvestment
  };
  if (data.extraMargin != null) {
    out.extraMargin = asNonNegativeDecimalString(data.extraMargin, "buOrderData.extraMargin");
  }
  if (data.condition != null) out.condition = asOptionalString(data.condition, "buOrderData.condition");
  if (data.conditionDirection != null) {
    const v = asNonEmptyString(data.conditionDirection, "buOrderData.conditionDirection");
    assertEnum(v, "buOrderData.conditionDirection", ["-1", "1"]);
    out.conditionDirection = v;
  }
  if (data.lossStopType != null) {
    const v = asNonEmptyString(data.lossStopType, "buOrderData.lossStopType");
    assertEnum(v, "buOrderData.lossStopType", ["price", "profit_amount", "profit_ratio", "price_limit"]);
    out.lossStopType = v;
  }
  if (data.lossStop != null) out.lossStop = asOptionalString(data.lossStop, "buOrderData.lossStop");
  if (data.lossStopDelay != null) out.lossStopDelay = asOptionalNonNegativeNumber(data.lossStopDelay, "buOrderData.lossStopDelay");
  if (data.profitStopType != null) {
    const v = asNonEmptyString(data.profitStopType, "buOrderData.profitStopType");
    assertEnum(v, "buOrderData.profitStopType", ["price", "profit_amount", "profit_ratio", "price_limit"]);
    out.profitStopType = v;
  }
  if (data.profitStop != null) out.profitStop = asOptionalString(data.profitStop, "buOrderData.profitStop");
  if (data.profitStopDelay != null) out.profitStopDelay = asOptionalNonNegativeNumber(data.profitStopDelay, "buOrderData.profitStopDelay");
  if (data.lossStopHigh != null) out.lossStopHigh = asOptionalString(data.lossStopHigh, "buOrderData.lossStopHigh");
  if (data.shareRatio != null) out.shareRatio = asOptionalString(data.shareRatio, "buOrderData.shareRatio");
  if (data.investCoin != null) out.investCoin = asOptionalString(data.investCoin, "buOrderData.investCoin");
  if (data.investmentFrom != null) {
    const v = asNonEmptyString(data.investmentFrom, "buOrderData.investmentFrom");
    assertEnum(v, "buOrderData.investmentFrom", ["USER", "LOCK_ACTIVITY", "FUTURE_GRID_BONUS"]);
    out.investmentFrom = v;
  }
  if (data.uiInvestCoin != null) out.uiInvestCoin = asOptionalString(data.uiInvestCoin, "buOrderData.uiInvestCoin");
  if (data.lossStopLimitPrice != null) out.lossStopLimitPrice = asOptionalString(data.lossStopLimitPrice, "buOrderData.lossStopLimitPrice");
  if (data.lossStopLimitHighPrice != null) out.lossStopLimitHighPrice = asOptionalString(data.lossStopLimitHighPrice, "buOrderData.lossStopLimitHighPrice");
  if (data.profitStopLimitPrice != null) out.profitStopLimitPrice = asOptionalString(data.profitStopLimitPrice, "buOrderData.profitStopLimitPrice");
  if (data.slippage != null) out.slippage = asOptionalString(data.slippage, "buOrderData.slippage");
  if (data.bonusId != null) out.bonusId = asOptionalString(data.bonusId, "buOrderData.bonusId");
  if (data.uiExtraData != null) out.uiExtraData = asOptionalString(data.uiExtraData, "buOrderData.uiExtraData");
  if (data.movingIndicatorType != null) out.movingIndicatorType = asOptionalString(data.movingIndicatorType, "buOrderData.movingIndicatorType");
  if (data.movingIndicatorInterval != null) out.movingIndicatorInterval = asOptionalString(data.movingIndicatorInterval, "buOrderData.movingIndicatorInterval");
  if (data.movingIndicatorParam != null) out.movingIndicatorParam = asOptionalString(data.movingIndicatorParam, "buOrderData.movingIndicatorParam");
  if (data.movingTrailingUpParam != null) out.movingTrailingUpParam = asOptionalString(data.movingTrailingUpParam, "buOrderData.movingTrailingUpParam");
  if (data.cateType != null) {
    const v = asNonEmptyString(data.cateType, "buOrderData.cateType");
    assertEnum(v, "buOrderData.cateType", ["FULLY_HEDGING", "LOAN_GRID", "LEVERAGE_GRID", "FUTURE_GRID_COIN_MARGINED"]);
    out.cateType = v;
  }
  if (data.movingTop != null) out.movingTop = asOptionalString(data.movingTop, "buOrderData.movingTop");
  if (data.movingBottom != null) out.movingBottom = asOptionalString(data.movingBottom, "buOrderData.movingBottom");
  if (data.enableFollowClosed != null) out.enableFollowClosed = asBoolean(data.enableFollowClosed, "buOrderData.enableFollowClosed");
  return out;
}
var createFuturesGridOrderDataJsonSchema = {
  type: "object",
  additionalProperties: false,
  description: "CreateFuturesGridOrderData (openapi_bot.yaml). Required: top, bottom, row, grid_type, trend, leverage, quoteInvestment.",
  required: ["top", "bottom", "row", "grid_type", "trend", "leverage", "quoteInvestment"],
  properties: {
    top: { type: "string", description: "Grid upper price" },
    bottom: { type: "string", description: "Grid lower price" },
    row: { type: "number", description: "Number of grid levels" },
    grid_type: {
      type: "string",
      enum: ["arithmetic", "geometric"],
      description: "Grid spacing: arithmetic (equal difference) or geometric (equal ratio)"
    },
    trend: {
      type: "string",
      enum: ["long", "short", "no_trend"],
      description: "Grid direction"
    },
    leverage: { type: "number", description: "Leverage multiplier" },
    extraMargin: { type: "string", description: "Extra margin amount (optional)" },
    quoteInvestment: { type: "string", description: "Investment amount" },
    condition: { type: "string", description: "Trigger price (conditional orders)" },
    conditionDirection: { type: "string", enum: ["-1", "1"], description: "Trigger direction" },
    lossStopType: {
      type: "string",
      enum: ["price", "profit_amount", "profit_ratio", "price_limit"],
      description: "Stop loss type"
    },
    lossStop: { type: "string", description: "Stop loss value" },
    lossStopDelay: { type: "number", description: "Stop loss delay (seconds)" },
    profitStopType: {
      type: "string",
      enum: ["price", "profit_amount", "profit_ratio", "price_limit"],
      description: "Take profit type"
    },
    profitStop: { type: "string", description: "Take profit value" },
    profitStopDelay: { type: "number", description: "Take profit delay (seconds)" },
    lossStopHigh: { type: "string", description: "Upper stop loss price for neutral grid" },
    shareRatio: { type: "string", description: "Profit sharing ratio" },
    investCoin: { type: "string", description: "Investment currency" },
    investmentFrom: {
      type: "string",
      enum: ["USER", "LOCK_ACTIVITY", "FUTURE_GRID_BONUS"],
      description: "Funding source"
    },
    uiInvestCoin: { type: "string", description: "Frontend-recorded investment currency" },
    lossStopLimitPrice: { type: "string", description: "Limit SL price (lossStopType=price_limit)" },
    lossStopLimitHighPrice: { type: "string", description: "Upper limit SL for neutral grid" },
    profitStopLimitPrice: { type: "string", description: "Limit TP price (profitStopType=price_limit)" },
    slippage: { type: "string", description: "Open slippage e.g. 0.01 = 1%" },
    bonusId: { type: "string", description: "Bonus UUID" },
    uiExtraData: { type: "string", description: "Frontend extra (coin-margined)" },
    movingIndicatorType: { type: "string", description: "e.g. sma" },
    movingIndicatorInterval: { type: "string", description: "e.g. 1m, 15m" },
    movingIndicatorParam: { type: "string", description: "JSON params e.g. length" },
    movingTrailingUpParam: { type: "string", description: "SMA trailing up ratio" },
    cateType: {
      type: "string",
      enum: ["FULLY_HEDGING", "LOAN_GRID", "LEVERAGE_GRID", "FUTURE_GRID_COIN_MARGINED"],
      description: "Category type"
    },
    movingTop: { type: "string", description: "Moving grid upper limit" },
    movingBottom: { type: "string", description: "Moving grid lower limit" },
    enableFollowClosed: { type: "boolean", description: "Follow close" }
  }
};
var createFuturesGridCreateToolInputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["base", "quote", "buOrderData"],
  properties: {
    base: { type: "string", description: "Base currency (e.g. BTC); *.PERP normalized in handler" },
    quote: { type: "string", description: "Quote currency (e.g. USDT)" },
    copyFrom: { type: "string", description: "Optional. Copy source order ID" },
    copyType: { type: "string", description: "Optional. Copy type" },
    copyBotOrderId: { type: "string", description: "Optional. Copy bot order ID" },
    buOrderData: createFuturesGridOrderDataJsonSchema,
    __dryRun: { type: "boolean", description: "Internal: when true, return resolved body without POST" }
  }
};
var CREATE_SPOT_GRID_ORDER_DATA_KEYS = [
  "top",
  "bottom",
  "row",
  "gridType",
  "quoteTotalInvestment",
  "lossStopType",
  "lossStop",
  "lossStopDelay",
  "profitStopType",
  "profitStop",
  "profitStopDelay",
  "condition",
  "conditionDirection",
  "slippage",
  "closeSellModel"
];
var ORDER_DATA_KEY_SET2 = new Set(CREATE_SPOT_GRID_ORDER_DATA_KEYS);
function asNonEmptyString2(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid "${field}": expected non-empty string.`);
  }
  return value.trim();
}
function asFiniteNumber2(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid "${field}": expected finite number.`);
  }
  return value;
}
function asPositiveNumber2(value, field) {
  const n = asFiniteNumber2(value, field);
  if (n <= 0) throw new Error(`Invalid "${field}": expected number > 0.`);
  return n;
}
function asPositiveInteger2(value, field) {
  const n = asPositiveNumber2(value, field);
  if (!Number.isInteger(n)) {
    throw new Error(`Invalid "${field}": expected positive integer.`);
  }
  return n;
}
function asNonNegativeInteger(value, field) {
  const n = asFiniteNumber2(value, field);
  if (n < 0 || !Number.isInteger(n)) {
    throw new Error(`Invalid "${field}": expected non-negative integer.`);
  }
  return n;
}
function assertEnum2(value, field, allowed) {
  if (!allowed.includes(value)) {
    throw new Error(`Invalid "${field}": expected one of ${allowed.join(", ")}.`);
  }
}
function asPositiveDecimalStringLoose2(value, field) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return String(value);
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid "${field}": expected positive decimal string.`);
  }
  const s = value.trim();
  if (!/^\d+(\.\d+)?$/.test(s)) {
    throw new Error(`Invalid "${field}": expected positive decimal string.`);
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid "${field}": expected positive decimal string.`);
  }
  return s;
}
function asOptionalString2(value, field) {
  if (typeof value !== "string") {
    throw new Error(`Invalid "${field}": expected string.`);
  }
  return value;
}
function parseAndValidateCreateSpotGridBuOrderData(raw) {
  const data = { ...raw };
  for (const k of Object.keys(data)) {
    if (!ORDER_DATA_KEY_SET2.has(k)) {
      throw new Error(`Unknown buOrderData property "${k}". Allowed keys: ${CREATE_SPOT_GRID_ORDER_DATA_KEYS.join(", ")}.`);
    }
  }
  const top = asPositiveDecimalStringLoose2(data.top, "buOrderData.top");
  const bottom = asPositiveDecimalStringLoose2(data.bottom, "buOrderData.bottom");
  if (Number(top) <= Number(bottom)) {
    throw new Error('Invalid "buOrderData.top": expected top > bottom.');
  }
  const row = asPositiveInteger2(data.row, "buOrderData.row");
  if (row < 2 || row > 200) {
    throw new Error('Invalid "buOrderData.row": expected integer between 2 and 200.');
  }
  const gridType = asNonEmptyString2(data.gridType, "buOrderData.gridType");
  assertEnum2(gridType, "buOrderData.gridType", ["arithmetic", "geometric"]);
  const quoteTotalInvestment = asPositiveDecimalStringLoose2(data.quoteTotalInvestment, "buOrderData.quoteTotalInvestment");
  const out = {
    top,
    bottom,
    row,
    gridType,
    quoteTotalInvestment
  };
  if (data.lossStopType != null) {
    const v = asNonEmptyString2(data.lossStopType, "buOrderData.lossStopType");
    assertEnum2(v, "buOrderData.lossStopType", ["price", "profit_amount", "profit_ratio"]);
    out.lossStopType = v;
  }
  if (data.lossStop != null) out.lossStop = asOptionalString2(data.lossStop, "buOrderData.lossStop");
  if (data.lossStopDelay != null) out.lossStopDelay = asNonNegativeInteger(data.lossStopDelay, "buOrderData.lossStopDelay");
  if (data.profitStopType != null) {
    const v = asNonEmptyString2(data.profitStopType, "buOrderData.profitStopType");
    assertEnum2(v, "buOrderData.profitStopType", ["price", "profit_amount", "profit_ratio"]);
    out.profitStopType = v;
  }
  if (data.profitStop != null) out.profitStop = asOptionalString2(data.profitStop, "buOrderData.profitStop");
  if (data.profitStopDelay != null) out.profitStopDelay = asNonNegativeInteger(data.profitStopDelay, "buOrderData.profitStopDelay");
  if (data.condition != null) out.condition = asOptionalString2(data.condition, "buOrderData.condition");
  if (data.conditionDirection != null) {
    const v = asNonEmptyString2(data.conditionDirection, "buOrderData.conditionDirection");
    assertEnum2(v, "buOrderData.conditionDirection", ["-1", "1"]);
    out.conditionDirection = v;
  }
  if (data.slippage != null) out.slippage = asOptionalString2(data.slippage, "buOrderData.slippage");
  if (data.closeSellModel != null) {
    const v = asNonEmptyString2(data.closeSellModel, "buOrderData.closeSellModel");
    assertEnum2(v, "buOrderData.closeSellModel", ["NOT_SELL", "TO_QUOTE", "TO_USDT"]);
    out.closeSellModel = v;
  }
  return out;
}
var createSpotGridOrderDataJsonSchema = {
  type: "object",
  additionalProperties: false,
  description: "CreateSpotGridOrderData (openapi_bot.yaml PR #7). Required: top, bottom, row, gridType, quoteTotalInvestment.",
  required: ["top", "bottom", "row", "gridType", "quoteTotalInvestment"],
  properties: {
    top: { type: "string", description: "Grid upper price" },
    bottom: { type: "string", description: "Grid lower price" },
    row: { type: "number", description: "Number of grid levels (2\u2013200)" },
    gridType: {
      type: "string",
      enum: ["arithmetic", "geometric"],
      description: "Grid spacing: arithmetic (equal difference) or geometric (equal ratio)"
    },
    quoteTotalInvestment: { type: "string", description: "Total quote currency investment amount" },
    lossStopType: {
      type: "string",
      enum: ["price", "profit_amount", "profit_ratio"],
      description: "Stop loss type"
    },
    lossStop: { type: "string", description: "Stop loss threshold value" },
    lossStopDelay: { type: "number", description: "Seconds before executing stop loss (0=immediate)" },
    profitStopType: {
      type: "string",
      enum: ["price", "profit_amount", "profit_ratio"],
      description: "Take profit type"
    },
    profitStop: { type: "string", description: "Take profit threshold value" },
    profitStopDelay: { type: "number", description: "Seconds before executing take profit (0=immediate)" },
    condition: { type: "string", description: "Trigger price for conditional start" },
    conditionDirection: {
      type: "string",
      enum: ["-1", "1"],
      description: 'Trigger direction: "-1" drop below, "1" rise above'
    },
    slippage: { type: "string", description: "Slippage tolerance e.g. 0.01 = 1%" },
    closeSellModel: {
      type: "string",
      enum: ["NOT_SELL", "TO_QUOTE", "TO_USDT"],
      description: "Close sell model (default: NOT_SELL)"
    }
  }
};
var createSpotGridCreateToolInputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["base", "quote", "buOrderData"],
  properties: {
    base: { type: "string", description: "Base currency (e.g. BTC)" },
    quote: { type: "string", description: "Quote currency (e.g. USDT)" },
    note: { type: "string", description: "Optional order note" },
    buOrderData: createSpotGridOrderDataJsonSchema,
    __dryRun: { type: "boolean", description: "Internal: when true, return resolved body without POST" }
  }
};
function asNonEmptyString3(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid "${field}": expected non-empty string.`);
  }
  return value.trim();
}
function asFiniteNumber3(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid "${field}": expected finite number.`);
  }
  return value;
}
function asPositiveNumber3(value, field) {
  const n = asFiniteNumber3(value, field);
  if (n <= 0) throw new Error(`Invalid "${field}": expected number > 0.`);
  return n;
}
function asPositiveInteger3(value, field) {
  const n = asPositiveNumber3(value, field);
  if (!Number.isInteger(n)) {
    throw new Error(`Invalid "${field}": expected positive integer.`);
  }
  return n;
}
function asBoolean2(value, field) {
  if (typeof value !== "boolean") {
    throw new Error(`Invalid "${field}": expected boolean.`);
  }
  return value;
}
function assertEnum3(value, field, allowed) {
  if (!allowed.includes(value)) {
    throw new Error(`Invalid "${field}": expected one of ${allowed.join(", ")}.`);
  }
}
function asObject(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid "${field}": expected JSON object.`);
  }
  return value;
}
function asPositiveDecimalString2(value, field) {
  const s = asNonEmptyString3(value, field);
  if (!/^\d+(\.\d+)?$/.test(s)) {
    throw new Error(`Invalid "${field}": expected positive decimal string.`);
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid "${field}": expected positive decimal string.`);
  }
  return s;
}
function normalizePerpBase(base) {
  return base.endsWith(".PERP") ? base : `${base}.PERP`;
}
function parseSmartCopyBuOrderData(raw) {
  const quoteInvestment = asPositiveDecimalString2(raw.quoteInvestment, "buOrderData.quoteInvestment");
  const leverageType = asNonEmptyString3(raw.leverageType, "buOrderData.leverageType");
  assertEnum3(leverageType, "buOrderData.leverageType", ["follow", "fixed"]);
  if (leverageType === "fixed" && raw.leverage == null) {
    throw new Error('Invalid "buOrderData.leverage": required when leverageType is "fixed".');
  }
  const out = { quoteInvestment, leverageType };
  if (raw.leverage != null) out.leverage = asPositiveNumber3(raw.leverage, "buOrderData.leverage");
  if (raw.maxInvestPerOrder != null) out.maxInvestPerOrder = asPositiveDecimalString2(raw.maxInvestPerOrder, "buOrderData.maxInvestPerOrder");
  if (raw.copyMode != null) {
    const copyMode = asNonEmptyString3(raw.copyMode, "buOrderData.copyMode");
    assertEnum3(copyMode, "buOrderData.copyMode", ["fixed_amount", "fixed_ratio"]);
    out.copyMode = copyMode;
  }
  return out;
}
function registerBotTools() {
  return [
    {
      name: "pionex_bot_futures_grid_get_order",
      module: "bot",
      isWrite: false,
      description: "Get one futures grid bot order by buOrderId.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          buOrderId: { type: "string", description: "Futures grid bot order id." },
          lang: { type: "string", description: "Optional language code." }
        },
        required: ["buOrderId"]
      },
      async handler(args, { client }) {
        const buOrderId = String(args.buOrderId);
        const q = { buOrderId };
        if (args.lang != null) q.lang = String(args.lang);
        return (await client.signedGet("/api/v1/bot/orders/futuresGrid/order", q)).data;
      }
    },
    {
      name: "pionex_bot_futures_grid_create",
      module: "bot",
      isWrite: true,
      description: "Create a futures grid order (openapi_bot.yaml CreateFuturesGridRequest / CreateFuturesGridOrderData). https://github.com/pionex-official/pionex-open-api/blob/main/openapi_bot.yaml \u2014 Required: base, quote, buOrderData. Optional: copyFrom, copyType, copyBotOrderId. buOrderData required: top, bottom, row, grid_type, trend, leverage, quoteInvestment; unknown keys rejected.",
      inputSchema: createFuturesGridCreateToolInputSchema,
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot futures_grid create is disabled.");
        }
        const rawBase = asNonEmptyString3(args.base, "base");
        const base = normalizePerpBase(rawBase);
        const quote = asNonEmptyString3(args.quote, "quote");
        const buOrderDataOut = parseAndValidateCreateFuturesGridBuOrderData(asObject(args.buOrderData, "buOrderData"));
        const row = buOrderDataOut.row;
        const gridType = buOrderDataOut.grid_type;
        const leverage = buOrderDataOut.leverage;
        const body = {
          base,
          quote,
          buOrderData: buOrderDataOut
        };
        if (args.copyFrom != null) body.copyFrom = String(args.copyFrom);
        if (args.copyType != null) body.copyType = String(args.copyType);
        if (args.copyBotOrderId != null) body.copyBotOrderId = String(args.copyBotOrderId);
        if (args.__dryRun === true) {
          return {
            dryRun: true,
            note: "No order was sent. Body matches openapi_bot.yaml CreateFuturesGridRequest.",
            resolvedParams: {
              row,
              grid_type: gridType,
              leverage
            },
            resolvedBody: body
          };
        }
        return (await client.signedPost("/api/v1/bot/orders/futuresGrid/create", body)).data;
      }
    },
    {
      name: "pionex_bot_futures_grid_adjust_params",
      module: "bot",
      isWrite: true,
      description: "Adjust futures grid bot params (invest_in / adjust_params / invest_in_trigger).",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          buOrderId: { type: "string" },
          type: { type: "string", enum: ["invest_in", "adjust_params", "invest_in_trigger"] },
          quoteInvestment: { type: "number" },
          extraMargin: { type: "boolean" },
          bottom: { type: "string" },
          top: { type: "string" },
          row: { type: "number" },
          extraMarginAmount: { type: "number" },
          isRecommend: { type: "boolean" },
          isReinvest: { type: "boolean" },
          investCoin: { type: "string" },
          investmentFrom: { type: "string", enum: ["USER", "LOCK_ACTIVITY"] },
          condition: { type: "string" },
          conditionDirection: { type: "string", enum: ["1", "-1"] },
          slippage: { type: "string" },
          adjustParamsScene: { type: "string" }
        },
        required: ["buOrderId", "type", "extraMargin"]
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot futures_grid adjust_params is disabled.");
        }
        const buOrderId = asNonEmptyString3(args.buOrderId, "buOrderId");
        const type = asNonEmptyString3(args.type, "type");
        assertEnum3(type, "type", ["invest_in", "adjust_params", "invest_in_trigger"]);
        const extraMargin = asBoolean2(args.extraMargin, "extraMargin");
        if (type === "invest_in" && args.quoteInvestment != null) {
          asPositiveNumber3(args.quoteInvestment, "quoteInvestment");
        }
        if (type === "adjust_params") {
          const bottom = asPositiveDecimalString2(args.bottom, "bottom");
          const top = asPositiveDecimalString2(args.top, "top");
          if (Number(top) <= Number(bottom)) {
            throw new Error('Invalid "top": expected top > bottom.');
          }
          asPositiveInteger3(args.row, "row");
        }
        if (type === "invest_in_trigger") {
          asPositiveDecimalString2(args.condition, "condition");
          const conditionDirection = asNonEmptyString3(args.conditionDirection, "conditionDirection");
          assertEnum3(conditionDirection, "conditionDirection", ["1", "-1"]);
        }
        const body = {
          buOrderId,
          type,
          extraMargin
        };
        if (args.quoteInvestment != null) body.quoteInvestment = asFiniteNumber3(args.quoteInvestment, "quoteInvestment");
        if (args.bottom != null) body.bottom = asPositiveDecimalString2(args.bottom, "bottom");
        if (args.top != null) body.top = asPositiveDecimalString2(args.top, "top");
        if (args.row != null) body.row = asPositiveInteger3(args.row, "row");
        if (args.extraMarginAmount != null) body.extraMarginAmount = asFiniteNumber3(args.extraMarginAmount, "extraMarginAmount");
        if (args.isRecommend != null) body.isRecommend = asBoolean2(args.isRecommend, "isRecommend");
        if (args.isReinvest != null) body.isReinvest = asBoolean2(args.isReinvest, "isReinvest");
        if (args.investCoin != null) body.investCoin = String(args.investCoin);
        if (args.investmentFrom != null) {
          const investmentFrom = asNonEmptyString3(args.investmentFrom, "investmentFrom");
          assertEnum3(investmentFrom, "investmentFrom", ["USER", "LOCK_ACTIVITY"]);
          body.investmentFrom = investmentFrom;
        }
        if (args.condition != null) body.condition = asPositiveDecimalString2(args.condition, "condition");
        if (args.conditionDirection != null) {
          const conditionDirection = asNonEmptyString3(args.conditionDirection, "conditionDirection");
          assertEnum3(conditionDirection, "conditionDirection", ["1", "-1"]);
          body.conditionDirection = conditionDirection;
        }
        if (args.slippage != null) body.slippage = String(args.slippage);
        if (args.adjustParamsScene != null) body.adjustParamsScene = String(args.adjustParamsScene);
        return (await client.signedPost("/api/v1/bot/orders/futuresGrid/adjustParams", body)).data;
      }
    },
    {
      name: "pionex_bot_futures_grid_reduce",
      module: "bot",
      isWrite: true,
      description: "Reduce futures grid bot position.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          buOrderId: { type: "string" },
          reduceNum: { type: "number" },
          slippage: { type: "string" },
          condition: { type: "string" },
          conditionDirection: { type: "string", enum: ["1", "-1"] }
        },
        required: ["buOrderId", "reduceNum"]
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot futures_grid reduce is disabled.");
        }
        const buOrderId = asNonEmptyString3(args.buOrderId, "buOrderId");
        const reduceNum = asPositiveInteger3(args.reduceNum, "reduceNum");
        const body = {
          buOrderId,
          reduceNum
        };
        if (args.slippage != null) body.slippage = String(args.slippage);
        if (args.condition != null) body.condition = String(args.condition);
        if (args.conditionDirection != null) {
          const conditionDirection = asNonEmptyString3(args.conditionDirection, "conditionDirection");
          assertEnum3(conditionDirection, "conditionDirection", ["1", "-1"]);
          body.conditionDirection = conditionDirection;
        }
        return (await client.signedPost("/api/v1/bot/orders/futuresGrid/reduce", body)).data;
      }
    },
    {
      name: "pionex_bot_futures_grid_check_params",
      module: "bot",
      isWrite: false,
      description: "Validate futures grid bot parameters before creating an order. Uses the same buOrderData structure as futures_grid_create. On FailedWithData error the response includes min_investment, max_investment, slippage. Endpoint: POST /api/v1/bot/orders/futuresGrid/checkParams",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base", "quote", "buOrderData"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC); *.PERP normalized in handler" },
          quote: { type: "string", description: "Quote currency (e.g. USDT)" },
          buOrderData: createFuturesGridOrderDataJsonSchema
        }
      },
      async handler(args, { client }) {
        const base = normalizePerpBase(asNonEmptyString3(args.base, "base"));
        const quote = asNonEmptyString3(args.quote, "quote");
        const buOrderDataOut = parseAndValidateCreateFuturesGridBuOrderData(asObject(args.buOrderData, "buOrderData"));
        return (await client.signedPost("/api/v1/bot/orders/futuresGrid/checkParams", { base, quote, buOrderData: buOrderDataOut })).data;
      }
    },
    {
      name: "pionex_bot_order_list",
      module: "bot",
      isWrite: false,
      description: "List bot orders with optional filters and pagination. status: 'running' (default) or 'finished'. buOrderTypes: one or more of futures_grid, spot_grid, smart_copy. Endpoint: GET /api/v1/bot/orders",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          status: {
            type: "string",
            enum: ["running", "finished"],
            description: "Filter by order status. Default: 'running'."
          },
          base: { type: "string", description: "Base currency filter (e.g. BTC)." },
          quote: { type: "string", description: "Quote currency filter (e.g. USDT)." },
          pageToken: { type: "string", description: "Pagination token from a previous response." },
          buOrderTypes: {
            type: "array",
            items: { type: "string", enum: ["futures_grid", "spot_grid", "smart_copy"] },
            description: "Bot type filter: futures_grid, spot_grid, smart_copy. Omit to return all types."
          }
        },
        required: []
      },
      async handler(args, { client }) {
        const q = {};
        if (args.status != null) q.status = String(args.status);
        if (args.base != null) q.base = String(args.base);
        if (args.quote != null) q.quote = String(args.quote);
        if (args.pageToken != null) q.pageToken = String(args.pageToken);
        if (Array.isArray(args.buOrderTypes) && args.buOrderTypes.length > 0) {
          q.buOrderTypes = args.buOrderTypes.join(",");
        }
        return (await client.signedGet("/api/v1/bot/orders", q)).data;
      }
    },
    {
      name: "pionex_bot_futures_grid_cancel",
      module: "bot",
      isWrite: true,
      description: "Cancel and close a futures grid bot order.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          buOrderId: { type: "string" },
          closeNote: { type: "string" },
          closeSellModel: { type: "string", enum: ["TO_QUOTE", "TO_USDT"] },
          immediate: { type: "boolean" },
          closeSlippage: { type: "string" }
        },
        required: ["buOrderId"]
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot futures_grid cancel is disabled.");
        }
        const buOrderId = asNonEmptyString3(args.buOrderId, "buOrderId");
        const body = { buOrderId };
        if (args.closeNote != null) body.closeNote = String(args.closeNote);
        if (args.closeSellModel != null) {
          const closeSellModel = asNonEmptyString3(args.closeSellModel, "closeSellModel");
          assertEnum3(closeSellModel, "closeSellModel", ["TO_QUOTE", "TO_USDT"]);
          body.closeSellModel = closeSellModel;
        }
        if (args.immediate != null) body.immediate = asBoolean2(args.immediate, "immediate");
        if (args.closeSlippage != null) body.closeSlippage = String(args.closeSlippage);
        return (await client.signedPost("/api/v1/bot/orders/futuresGrid/cancel", body)).data;
      }
    },
    {
      name: "pionex_bot_spot_grid_get_order",
      module: "bot",
      isWrite: false,
      description: "Get one spot grid bot order by buOrderId.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          buOrderId: { type: "string", description: "Spot grid bot order id." }
        },
        required: ["buOrderId"]
      },
      async handler(args, { client }) {
        const buOrderId = asNonEmptyString3(args.buOrderId, "buOrderId");
        const q = { buOrderId };
        return (await client.signedGet("/api/v1/bot/orders/spotGrid/order", q)).data;
      }
    },
    {
      name: "pionex_bot_spot_grid_get_ai_strategy",
      module: "bot",
      isWrite: false,
      description: "Retrieve AI-recommended spot grid strategy parameters for a trading pair.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC)" },
          quote: { type: "string", description: "Quote currency (e.g. USDT)" }
        },
        required: ["base", "quote"]
      },
      async handler(args, { client }) {
        const base = asNonEmptyString3(args.base, "base");
        const quote = asNonEmptyString3(args.quote, "quote");
        return (await client.signedGet("/api/v1/bot/orders/spotGrid/aiStrategy", { base, quote })).data;
      }
    },
    {
      name: "pionex_bot_spot_grid_check_params",
      module: "bot",
      isWrite: false,
      description: "Validate spot grid bot parameters before creating an order. Uses the same buOrderData structure as spot_grid_create. On FailedWithData error the response includes min_investment, max_investment, slippage. Endpoint: POST /api/v1/bot/orders/spotGrid/checkParams",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base", "quote", "buOrderData"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC)" },
          quote: { type: "string", description: "Quote currency (e.g. USDT)" },
          buOrderData: createSpotGridOrderDataJsonSchema
        }
      },
      async handler(args, { client }) {
        const base = asNonEmptyString3(args.base, "base");
        const quote = asNonEmptyString3(args.quote, "quote");
        const buOrderDataOut = parseAndValidateCreateSpotGridBuOrderData(asObject(args.buOrderData, "buOrderData"));
        return (await client.signedPost("/api/v1/bot/orders/spotGrid/checkParams", { base, quote, buOrderData: buOrderDataOut })).data;
      }
    },
    {
      name: "pionex_bot_spot_grid_create",
      module: "bot",
      isWrite: true,
      description: "Create a spot grid bot order (openapi_bot.yaml CreateSpotGridRequest / CreateSpotGridOrderData). Required: base, quote, buOrderData. Optional: note. buOrderData required: top, bottom, row, gridType, quoteTotalInvestment; unknown keys rejected.",
      inputSchema: createSpotGridCreateToolInputSchema,
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot spot_grid create is disabled.");
        }
        const base = asNonEmptyString3(args.base, "base");
        const quote = asNonEmptyString3(args.quote, "quote");
        const buOrderDataOut = parseAndValidateCreateSpotGridBuOrderData(asObject(args.buOrderData, "buOrderData"));
        const body = { base, quote, buOrderData: buOrderDataOut };
        if (args.note != null) body.note = String(args.note);
        if (args.__dryRun === true) {
          return {
            dryRun: true,
            note: "No order was sent. Body matches openapi_bot.yaml CreateSpotGridRequest.",
            resolvedBody: body
          };
        }
        return (await client.signedPost("/api/v1/bot/orders/spotGrid/create", body)).data;
      }
    },
    {
      name: "pionex_bot_spot_grid_adjust_params",
      module: "bot",
      isWrite: true,
      description: "Adjust spot grid bot range or investment parameters.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          buOrderId: { type: "string" },
          top: { type: "string", description: "New upper price" },
          bottom: { type: "string", description: "New lower price" },
          row: { type: "number", description: "New number of grid levels" },
          quoteInvest: { type: "string", description: "Additional quote investment amount" }
        },
        required: ["buOrderId"]
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot spot_grid adjust_params is disabled.");
        }
        const buOrderId = asNonEmptyString3(args.buOrderId, "buOrderId");
        const body = { buOrderId };
        if (args.top != null) body.top = asPositiveDecimalString2(args.top, "top");
        if (args.bottom != null) body.bottom = asPositiveDecimalString2(args.bottom, "bottom");
        if (args.row != null) body.row = asPositiveInteger3(args.row, "row");
        if (args.quoteInvest != null) body.quoteInvest = asPositiveDecimalString2(args.quoteInvest, "quoteInvest");
        return (await client.signedPost("/api/v1/bot/orders/spotGrid/adjustParams", body)).data;
      }
    },
    {
      name: "pionex_bot_spot_grid_invest_in",
      module: "bot",
      isWrite: true,
      description: "Add additional quote investment to a running spot grid bot.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          buOrderId: { type: "string" },
          quoteInvest: { type: "string", description: "Quote amount to invest" }
        },
        required: ["buOrderId", "quoteInvest"]
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot spot_grid invest_in is disabled.");
        }
        const buOrderId = asNonEmptyString3(args.buOrderId, "buOrderId");
        const quoteInvest = asPositiveDecimalString2(args.quoteInvest, "quoteInvest");
        return (await client.signedPost("/api/v1/bot/orders/spotGrid/investIn", { buOrderId, quoteInvest })).data;
      }
    },
    {
      name: "pionex_bot_spot_grid_cancel",
      module: "bot",
      isWrite: true,
      description: "Cancel and close a spot grid bot order.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          buOrderId: { type: "string" },
          closeSellModel: { type: "string", enum: ["NOT_SELL", "TO_QUOTE", "TO_USDT"] },
          slippage: { type: "string" }
        },
        required: ["buOrderId"]
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot spot_grid cancel is disabled.");
        }
        const buOrderId = asNonEmptyString3(args.buOrderId, "buOrderId");
        const body = { buOrderId };
        if (args.closeSellModel != null) {
          const closeSellModel = asNonEmptyString3(args.closeSellModel, "closeSellModel");
          assertEnum3(closeSellModel, "closeSellModel", ["NOT_SELL", "TO_QUOTE", "TO_USDT"]);
          body.closeSellModel = closeSellModel;
        }
        if (args.slippage != null) body.slippage = String(args.slippage);
        return (await client.signedPost("/api/v1/bot/orders/spotGrid/cancel", body)).data;
      }
    },
    {
      name: "pionex_bot_spot_grid_profit",
      module: "bot",
      isWrite: true,
      description: "Extract accumulated grid profit from a spot grid bot order.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          buOrderId: { type: "string" },
          amount: { type: "string", description: "Amount of profit to extract" }
        },
        required: ["buOrderId", "amount"]
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot spot_grid profit is disabled.");
        }
        const buOrderId = asNonEmptyString3(args.buOrderId, "buOrderId");
        const amount = asPositiveDecimalString2(args.amount, "amount");
        return (await client.signedPost("/api/v1/bot/orders/spotGrid/profit", { buOrderId, amount })).data;
      }
    },
    // ── Smart Copy ────────────────────────────────────────────────────────────
    {
      name: "pionex_bot_smart_copy_get_order",
      module: "bot",
      isWrite: false,
      description: "Get one smart copy bot order by buOrderId.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          buOrderId: { type: "string", description: "Smart copy bot order ID." }
        },
        required: ["buOrderId"]
      },
      async handler(args, { client }) {
        const buOrderId = asNonEmptyString3(args.buOrderId, "buOrderId");
        return (await client.signedGet("/api/v1/bot/orders/smartCopy/order", { buOrderId })).data;
      }
    },
    {
      name: "pionex_bot_smart_copy_check_params",
      module: "bot",
      isWrite: false,
      description: "Validate smart copy bot parameters before creating an order. Uses the same buOrderData structure as smart_copy_create. On FailedWithData error the response includes min_investment, max_investment. Endpoint: POST /api/v1/bot/orders/smartCopy/checkParams",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base", "quote", "buOrderData"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC)" },
          quote: { type: "string", description: "Quote currency (e.g. USDT)" },
          buOrderData: {
            type: "object",
            additionalProperties: false,
            required: ["quoteInvestment", "leverageType"],
            properties: {
              quoteInvestment: { type: "string", description: "Investment amount in quote currency." },
              leverageType: { type: "string", enum: ["follow", "fixed"], description: "Follow signal provider's leverage or use fixed value." },
              leverage: { type: "number", description: "Custom leverage (required when leverageType is 'fixed')." },
              maxInvestPerOrder: { type: "string", description: "Maximum investment per replicated order." },
              copyMode: { type: "string", enum: ["fixed_amount", "fixed_ratio"], description: "Copy mode." }
            }
          }
        }
      },
      async handler(args, { client }) {
        const base = asNonEmptyString3(args.base, "base");
        const quote = asNonEmptyString3(args.quote, "quote");
        const buOrderData = parseSmartCopyBuOrderData(asObject(args.buOrderData, "buOrderData"));
        return (await client.signedPost("/api/v1/bot/orders/smartCopy/checkParams", { base, quote, buOrderData })).data;
      }
    },
    {
      name: "pionex_bot_smart_copy_create",
      module: "bot",
      isWrite: true,
      description: "Create a smart copy bot order. Required: base, quote, buOrderData (quoteInvestment, leverageType). Optional top-level: copyFrom (signal source ID), copyBotOrderId. buOrderData optional: leverage (required if leverageType=fixed), maxInvestPerOrder, copyMode.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base", "quote", "buOrderData"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC)" },
          quote: { type: "string", description: "Quote currency (e.g. USDT)" },
          buOrderData: {
            type: "object",
            additionalProperties: false,
            required: ["quoteInvestment", "leverageType"],
            properties: {
              quoteInvestment: { type: "string", description: "Investment amount in quote currency." },
              leverageType: { type: "string", enum: ["follow", "fixed"], description: "Follow signal provider's leverage or use fixed value." },
              leverage: { type: "number", description: "Custom leverage (required when leverageType is 'fixed')." },
              maxInvestPerOrder: { type: "string", description: "Maximum investment per replicated order." },
              copyMode: { type: "string", enum: ["fixed_amount", "fixed_ratio"], description: "Copy mode." }
            }
          },
          copyFrom: { type: "string", description: "Signal source / trader ID to copy from." },
          copyBotOrderId: { type: "string", description: "Reference bot order ID for copying settings." },
          __dryRun: { type: "boolean", description: "If true, validate and return resolved body without placing an order." }
        }
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot smart_copy create is disabled.");
        }
        const base = asNonEmptyString3(args.base, "base");
        const quote = asNonEmptyString3(args.quote, "quote");
        const buOrderData = parseSmartCopyBuOrderData(asObject(args.buOrderData, "buOrderData"));
        const body = { base, quote, buOrderData };
        if (args.copyFrom != null) body.copyFrom = String(args.copyFrom);
        if (args.copyBotOrderId != null) body.copyBotOrderId = String(args.copyBotOrderId);
        if (args.__dryRun === true) {
          return {
            dryRun: true,
            note: "No order was sent. Body matches smartCopy/create request.",
            resolvedBody: body
          };
        }
        return (await client.signedPost("/api/v1/bot/orders/smartCopy/create", body)).data;
      }
    },
    {
      name: "pionex_bot_smart_copy_cancel",
      module: "bot",
      isWrite: true,
      description: "Cancel and close a smart copy bot order.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["buOrderId"],
        properties: {
          buOrderId: { type: "string", description: "Smart copy bot order ID." },
          closeSellModel: { type: "string", enum: ["NOT_SELL", "TO_QUOTE", "TO_USDT"], description: "How to handle the base asset on close." }
        }
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot smart_copy cancel is disabled.");
        }
        const buOrderId = asNonEmptyString3(args.buOrderId, "buOrderId");
        const body = { buOrderId };
        if (args.closeSellModel != null) {
          const closeSellModel = asNonEmptyString3(args.closeSellModel, "closeSellModel");
          assertEnum3(closeSellModel, "closeSellModel", ["NOT_SELL", "TO_QUOTE", "TO_USDT"]);
          body.closeSellModel = closeSellModel;
        }
        return (await client.signedPost("/api/v1/bot/orders/smartCopy/cancel", body)).data;
      }
    },
    // ── Signal ────────────────────────────────────────────────────────────────
    {
      name: "pionex_bot_signal_add_listener",
      module: "bot",
      isWrite: true,
      description: "Subscribe to a signal provider / add a signal listener. Endpoint: POST /api/v1/bot/signal/listener",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["signalSourceId"],
        properties: {
          signalSourceId: { type: "string", description: "Signal provider ID to subscribe to." },
          listenMode: { type: "string", description: "Subscription mode." }
        }
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot signal add_listener is disabled.");
        }
        const signalSourceId = asNonEmptyString3(args.signalSourceId, "signalSourceId");
        const body = { signalSourceId };
        if (args.listenMode != null) body.listenMode = String(args.listenMode);
        return (await client.signedPost("/api/v1/bot/signal/listener", body)).data;
      }
    }
  ];
}
function registerEarnDualTools() {
  return [
    // ─── Public endpoints ────────────────────────────────────────────────────
    {
      name: "pionex_earn_dual_symbols",
      module: "earn_dual",
      isWrite: false,
      description: "List all trading pairs supported by Dual Investment, optionally filtered by base currency. Supported quote currencies: USDT, USDC, USD, USDXO. No authentication required.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          base: { type: "string", description: "Base currency filter (e.g. BTC, ETH). Omit to return all supported pairs." }
        }
      },
      async handler(args, { client }) {
        const base = args.base;
        return (await client.publicGet("/api/v1/earn/dual/symbols", base ? { base } : {})).data;
      }
    },
    {
      name: "pionex_earn_dual_open_products",
      module: "earn_dual",
      isWrite: false,
      description: "List currently open Dual Investment products for a specific trading pair and direction. DUAL_BASE: invest in base currency (e.g. BTC); DUAL_CURRENCY: invest in investment currency (e.g. USDT). Product ID format: {BASE}-{QUOTE}-{YYMMDD}-{STRIKE}-{C|P}-{CURRENCY}, where C=DUAL_BASE, P=DUAL_CURRENCY. For BTC/ETH use quote=USDXO with currency=USDT or USDC. For other bases use quote=USDT with currency=USDT. No authentication required.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base", "quote", "type"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC, ETH, XRP)" },
          quote: { type: "string", enum: ["USDT", "USDC", "USDXO"], description: "Quote currency. Use USDXO for BTC/ETH; use USDT for all other base currencies." },
          type: { type: "string", enum: ["DUAL_BASE", "DUAL_CURRENCY"], description: "DUAL_BASE: invest in base currency (product ID suffix C); DUAL_CURRENCY: invest in investment currency (product ID suffix P)" },
          currency: { type: "string", description: "Investment currency filter. For BTC/ETH: USDT or USDC. For other pairs: USDT." }
        }
      },
      async handler(args, { client }) {
        const base = args.base;
        const quote = args.quote;
        const type = args.type;
        const currency = args.currency;
        const query = { base, quote, type };
        if (currency) query.currency = currency;
        return (await client.publicGet("/api/v1/earn/dual/openProducts", query)).data;
      }
    },
    {
      name: "pionex_earn_dual_prices",
      module: "earn_dual",
      isWrite: false,
      description: "Get latest yield rates and investability status for Dual Investment products. All three parameters (base, quote, productIds) are required. Use USDXO for BTC/ETH pairs; use USDT for all other base currencies. When canInvest is false, profit and baseSize will be empty strings. Always call this before placing an order \u2014 the profit value returned here must be passed unchanged to pionex_earn_dual_invest. No authentication required.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base", "quote", "productIds"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC, ETH, LRC)" },
          quote: { type: "string", enum: ["USDT", "USDC", "USDXO"], description: "Quote currency. Use USDXO for BTC/ETH pairs; use USDT for all other base currencies." },
          productIds: {
            type: "array",
            items: { type: "string" },
            description: 'List of product IDs obtained from pionex_earn_dual_open_products (e.g. ["ETH-USDXO-260410-3000-C-USDT", "ETH-USDXO-260410-2900-C-USDT"]).'
          }
        }
      },
      async handler(args, { client }) {
        const base = args.base;
        const quote = args.quote;
        const productIds = args.productIds;
        const query = { base, quote };
        if (productIds && productIds.length > 0) query.productIds = productIds.join(",");
        return (await client.publicGet("/api/v1/earn/dual/prices", query)).data;
      }
    },
    {
      name: "pionex_earn_dual_index",
      module: "earn_dual",
      isWrite: false,
      description: "Get real-time index price for a Dual Investment underlying asset. Both base and quote are required. Use USDXO for BTC/ETH pairs; use USDT for all other base currencies. The index price is the reference price used at settlement to determine payout direction. No authentication required.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base", "quote"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC, ETH, LRC)" },
          quote: { type: "string", enum: ["USDT", "USDC", "USDXO"], description: "Quote currency. Use USDXO for BTC/ETH pairs; use USDT for all other base currencies." }
        }
      },
      async handler(args, { client }) {
        const base = args.base;
        const quote = args.quote;
        return (await client.publicGet("/api/v1/earn/dual/index", { base, quote })).data;
      }
    },
    {
      name: "pionex_earn_dual_delivery_prices",
      module: "earn_dual",
      isWrite: false,
      description: "Get historical settlement delivery prices for a Dual Investment pair. base is required; quote is optional but recommended to narrow results. Use USDXO for BTC/ETH pairs; use USDT for all other base currencies. The delivery price is the index price recorded at expiry, used to determine the settlement direction. No authentication required.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC, XRP)" },
          quote: { type: "string", enum: ["USDT", "USDC", "USDXO"], description: "Quote currency filter. Use USDXO for BTC/ETH pairs; use USDT for all other base currencies." },
          startTime: { type: "integer", description: "Start timestamp in milliseconds" },
          endTime: { type: "integer", description: "End timestamp in milliseconds" }
        }
      },
      async handler(args, { client }) {
        const base = args.base;
        const quote = args.quote;
        const startTime = args.startTime;
        const endTime = args.endTime;
        const query = { base };
        if (quote) query.quote = quote;
        if (startTime != null) query.startTime = String(startTime);
        if (endTime != null) query.endTime = String(endTime);
        return (await client.publicGet("/api/v1/earn/dual/deliveryPrices", query)).data;
      }
    },
    // ─── View endpoints (authentication required) ────────────────────────────
    {
      name: "pionex_earn_dual_balances",
      module: "earn_dual",
      isWrite: false,
      description: "Get authenticated user's Dual Investment account balances. Requires View permission (API key + secret).",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          merge: { type: "boolean", description: "When true, merges balances with the same coin across different base currencies." }
        }
      },
      async handler(args, { client }) {
        const merge = args.merge;
        const query = {};
        if (merge != null) query.merge = String(merge);
        return (await client.signedGet("/api/v1/earn/dual/balances", query)).data;
      }
    },
    {
      name: "pionex_earn_dual_get_invests",
      module: "earn_dual",
      isWrite: false,
      description: "Batch query Dual Investment orders by client order IDs. Requires View permission (API key + secret).",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC)" },
          clientDualIds: {
            type: "array",
            items: { type: "string" },
            description: "List of client-assigned dual investment order IDs to query."
          }
        }
      },
      async handler(args, { client }) {
        const base = args.base;
        const clientDualIds = args.clientDualIds;
        const body = {};
        if (base) body.base = base;
        if (clientDualIds) body.clientDualIds = clientDualIds;
        return (await client.signedPost("/api/v1/earn/dual/invests", body)).data;
      }
    },
    {
      name: "pionex_earn_dual_records",
      module: "earn_dual",
      isWrite: false,
      description: "Get paginated Dual Investment history for the authenticated user. Requires View permission (API key + secret).",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base", "endTime"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC)" },
          quote: { type: "string", description: "Quote currency filter. Use USDXO for BTC/ETH; use USDT for others." },
          currency: { type: "string", description: "Investment currency filter (e.g. USDT, BTC)" },
          filter: { type: "string", description: "Status filter" },
          startTime: { type: "integer", description: "Start timestamp in milliseconds" },
          endTime: { type: "integer", description: "End timestamp in milliseconds (required)" },
          limit: { type: "integer", description: "Maximum number of records per page (e.g. 20)" }
        }
      },
      async handler(args, { client }) {
        const base = args.base;
        const endTime = args.endTime;
        const quote = args.quote;
        const currency = args.currency;
        const filter = args.filter;
        const startTime = args.startTime;
        const limit = args.limit;
        const query = { base, endTime: String(endTime) };
        if (quote) query.quote = quote;
        if (currency) query.currency = currency;
        if (filter) query.filter = filter;
        if (startTime != null) query.startTime = String(startTime);
        if (limit != null) query.limit = String(limit);
        return (await client.signedGet("/api/v1/earn/dual/records", query)).data;
      }
    },
    // ─── Earn/write endpoints (authentication required) ──────────────────────
    {
      name: "pionex_earn_dual_invest",
      module: "earn_dual",
      isWrite: true,
      description: "Create a new Dual Investment order. Requires Earn permission (API key + secret). Provide either baseAmount (invest in base currency) or currencyAmount (invest in investment currency), not both. profit must be obtained from pionex_earn_dual_prices and passed unchanged \u2014 a stale or mismatched value will be rejected. Product ID format: {BASE}-{QUOTE}-{YYMMDD}-{STRIKE}-{C|P}-{CURRENCY}, where C=DUAL_BASE, P=DUAL_CURRENCY.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC)" },
          productId: { type: "string", description: "Product ID to invest in (e.g. BTC-USDXO-260402-68000-P-USDT). Obtain from pionex_earn_dual_open_products." },
          clientDualId: { type: "string", description: "Client-assigned order ID used as an idempotency key. Recommended to avoid duplicate orders." },
          baseAmount: { type: "string", description: "Investment amount in base currency (e.g. '0.01'). Mutually exclusive with currencyAmount." },
          currencyAmount: { type: "string", description: "Investment amount in investment currency (e.g. '100'). Mutually exclusive with baseAmount." },
          profit: { type: "string", description: "Yield rate from pionex_earn_dual_prices (e.g. '0.0039'). Must be current \u2014 stale values are rejected." }
        }
      },
      async handler(args, { client }) {
        const body = { base: args.base };
        if (args.productId) body.productId = args.productId;
        if (args.clientDualId) body.clientDualId = args.clientDualId;
        if (args.baseAmount) body.baseAmount = args.baseAmount;
        if (args.currencyAmount) body.currencyAmount = args.currencyAmount;
        if (args.profit) body.profit = args.profit;
        return (await client.signedPost("/api/v1/earn/dual/invest", body)).data;
      }
    },
    {
      name: "pionex_earn_dual_revoke_invest",
      module: "earn_dual",
      isWrite: true,
      description: "Revoke a pending Dual Investment order before it is matched. Requires Earn permission (API key + secret). Parameters are sent as a JSON request body. Only orders in a pending/unmatched state can be revoked.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base", "productId", "clientDualId"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC)" },
          clientDualId: { type: "string", description: "Client-assigned dual investment order ID" },
          productId: { type: "string", description: "Product ID of the order to revoke (e.g. BTC-USDXO-260402-68000-P-USDT)" }
        }
      },
      async handler(args, { client }) {
        const body = {
          base: args.base,
          productId: args.productId,
          clientDualId: args.clientDualId
        };
        return (await client.signedDelete("/api/v1/earn/dual/invest", body)).data;
      }
    },
    {
      name: "pionex_earn_dual_collect",
      module: "earn_dual",
      isWrite: true,
      description: "Collect settled Dual Investment earnings into the user's spot account. Requires Earn permission (API key + secret). Only orders in a settled state can be collected.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base", "clientDualId", "productId"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC)" },
          clientDualId: { type: "string", description: "Client-assigned dual investment order ID to collect" },
          productId: { type: "string", description: "Product ID (e.g. BTC-USDXO-260402-68000-P-USDT)" }
        }
      },
      async handler(args, { client }) {
        const body = {
          base: args.base,
          clientDualId: args.clientDualId,
          productId: args.productId
        };
        return (await client.signedPost("/api/v1/earn/dual/collect", body)).data;
      }
    }
  ];
}
function allToolSpecs() {
  return [...registerMarketTools(), ...registerAccountTools(), ...registerOrdersTools(), ...registerBotTools(), ...registerEarnDualTools()];
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
import { readFileSync as readFileSync2 } from "fs";
import { fileURLToPath } from "url";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
var SERVER_NAME = "pionex-trade-mcp";
function resolveServerVersion() {
  try {
    const pkgPath = fileURLToPath(new URL("../package.json", import.meta.url));
    const parsed = JSON.parse(readFileSync2(pkgPath, "utf8"));
    return typeof parsed.version === "string" && parsed.version.length > 0 ? parsed.version : "0.0.0-unknown";
  } catch {
    return "0.0.0-unknown";
  }
}
var SERVER_VERSION = resolveServerVersion();
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
                       Available: market, account, orders, bot
                       Special: "all" loads all modules
                       Default: market,account,orders,bot

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