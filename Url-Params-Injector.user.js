// ==UserScript==
// @name         URL 参数注入器（可视化配置版）
// @namespace    https://github.com/saiyajiang/Url-Params-Injector
// @version      1.5.0
// @description  本脚本由 AI 辅助编写。为指定域名自动追加 / 覆盖 / 删除 URL 查询参数，内置 Steam 专属板块（界面语言、商店区域、语言防护一键配置）与通用规则面板
// @author       悲歌
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-start
// @license      MIT
// @homepageURL  https://github.com/saiyajiang/Url-Params-Injector
// @supportURL   https://github.com/saiyajiang/Url-Params-Injector/issues
// @updateURL    https://raw.githubusercontent.com/saiyajiang/Url-Params-Injector/main/Url-Params-Injector.user.js
// @downloadURL  https://raw.githubusercontent.com/saiyajiang/Url-Params-Injector/main/Url-Params-Injector.user.js
// ==/UserScript==

(function () {
  'use strict';

  /* ============================================================
   * 0. 基础环境
   * ========================================================== */
  const win = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
  const doc = win.document;

  const STORE_KEY = 'upi_rules_v1';
  const PANEL_ID = 'upi-panel-root';
  const STYLE_ID = 'upi-panel-style';

  const DEFAULT_RULES = [
    {
      id: 'demo-example',
      host: 'example.com',
      enabled: false,
      overwrite: false,
      reload: false,
      remove: [],
      params: [
        { key: 'from', value: 'greasyfork' },
        { key: 'lang', value: 'zh-CN' }
      ]
    }
  ];

  /* ============================================================
   * 0.1 常用站点预设库
   * mode: soft 只改地址栏 | reload 刷新 | early 抢在渲染前跳转
   * ========================================================== */
  // Steam 的两组域名：商店/客服在 steampowered.com，社区/市场/创意工坊在 steamcommunity.com
  const STEAM_STORE = '*.steampowered.com';
  const STEAM_COMMUNITY = 'steamcommunity.com';
  const STEAM_ALL = STEAM_STORE + ', ' + STEAM_COMMUNITY;

  const PRESETS = [
    {
      group: 'Steam 全站 · 界面语言（商店 + 社区）',
      items: [
        { name: 'Steam 全站 · 简体中文', host: STEAM_ALL, params: [{ key: 'l', value: 'schinese' }], mode: 'early', overwrite: true, note: '覆盖 store.steampowered.com 与 steamcommunity.com' },
        { name: 'Steam 全站 · 繁体中文', host: STEAM_ALL, params: [{ key: 'l', value: 'tchinese' }], mode: 'early', overwrite: true },
        { name: 'Steam 全站 · 英文', host: STEAM_ALL, params: [{ key: 'l', value: 'english' }], mode: 'early', overwrite: true },
        { name: 'Steam 全站 · 日文', host: STEAM_ALL, params: [{ key: 'l', value: 'japanese' }], mode: 'early', overwrite: true },
        { name: 'Steam 全站 · 韩文', host: STEAM_ALL, params: [{ key: 'l', value: 'koreana' }], mode: 'early', overwrite: true },
        { name: 'Steam 全站 · 俄文', host: STEAM_ALL, params: [{ key: 'l', value: 'russian' }], mode: 'early', overwrite: true },
        { name: 'Steam 全站 · 德文', host: STEAM_ALL, params: [{ key: 'l', value: 'german' }], mode: 'early', overwrite: true },
        { name: 'Steam 全站 · 法文', host: STEAM_ALL, params: [{ key: 'l', value: 'french' }], mode: 'early', overwrite: true }
      ]
    },
    {
      group: 'Steam 商店 · 界面语言（仅 steampowered.com）',
      items: [
        { name: 'Steam 商店 · 简体中文', host: STEAM_STORE, params: [{ key: 'l', value: 'schinese' }], mode: 'early', overwrite: true },
        { name: 'Steam 商店 · 繁体中文', host: STEAM_STORE, params: [{ key: 'l', value: 'tchinese' }], mode: 'early', overwrite: true },
        { name: 'Steam 商店 · 英文', host: STEAM_STORE, params: [{ key: 'l', value: 'english' }], mode: 'early', overwrite: true },
        { name: 'Steam 商店 · 日文', host: STEAM_STORE, params: [{ key: 'l', value: 'japanese' }], mode: 'early', overwrite: true },
        { name: 'Steam 商店 · 韩文', host: STEAM_STORE, params: [{ key: 'l', value: 'koreana' }], mode: 'early', overwrite: true },
        { name: 'Steam 商店 · 俄文', host: STEAM_STORE, params: [{ key: 'l', value: 'russian' }], mode: 'early', overwrite: true }
      ]
    },
    {
      group: 'Steam 社区 · 界面语言（仅 steamcommunity.com）',
      items: [
        { name: 'Steam 社区 · 简体中文', host: STEAM_COMMUNITY, params: [{ key: 'l', value: 'schinese' }], mode: 'early', overwrite: true, note: '社区、市场、创意工坊、讨论区' },
        { name: 'Steam 社区 · 繁体中文', host: STEAM_COMMUNITY, params: [{ key: 'l', value: 'tchinese' }], mode: 'early', overwrite: true },
        { name: 'Steam 社区 · 英文', host: STEAM_COMMUNITY, params: [{ key: 'l', value: 'english' }], mode: 'early', overwrite: true },
        { name: 'Steam 社区 · 日文', host: STEAM_COMMUNITY, params: [{ key: 'l', value: 'japanese' }], mode: 'early', overwrite: true },
        { name: 'Steam 社区 · 韩文', host: STEAM_COMMUNITY, params: [{ key: 'l', value: 'koreana' }], mode: 'early', overwrite: true },
        { name: 'Steam 社区 · 俄文', host: STEAM_COMMUNITY, params: [{ key: 'l', value: 'russian' }], mode: 'early', overwrite: true }
      ]
    },
    {
      group: 'Steam · 商店区域 / 货币（仅未登录时生效）',
      items: [
        { name: 'Steam · 国区 CNY', host: STEAM_ALL, params: [{ key: 'cc', value: 'cn' }], mode: 'early', overwrite: true, note: 'cc 参数仅在未登录状态下生效' },
        { name: 'Steam · 美区 USD', host: STEAM_ALL, params: [{ key: 'cc', value: 'us' }], mode: 'early', overwrite: true, note: 'cc 参数仅在未登录状态下生效' },
        { name: 'Steam · 港区 HKD', host: STEAM_ALL, params: [{ key: 'cc', value: 'hk' }], mode: 'early', overwrite: true, note: 'cc 参数仅在未登录状态下生效' },
        { name: 'Steam · 日区 JPY', host: STEAM_ALL, params: [{ key: 'cc', value: 'jp' }], mode: 'early', overwrite: true, note: 'cc 参数仅在未登录状态下生效' },
        { name: 'Steam · 俄区 RUB', host: STEAM_ALL, params: [{ key: 'cc', value: 'ru' }], mode: 'early', overwrite: true, note: 'cc 参数仅在未登录状态下生效' },
        { name: 'Steam · 英区 GBP', host: STEAM_ALL, params: [{ key: 'cc', value: 'uk' }], mode: 'early', overwrite: true, note: 'cc 参数仅在未登录状态下生效' },
        { name: 'Steam · 土区 TRY', host: STEAM_ALL, params: [{ key: 'cc', value: 'tr' }], mode: 'early', overwrite: true, note: 'cc 参数仅在未登录状态下生效' },
        { name: 'Steam · 阿区 ARS', host: STEAM_ALL, params: [{ key: 'cc', value: 'ar' }], mode: 'early', overwrite: true, note: 'cc 参数仅在未登录状态下生效' }
      ]
    },
    {
      group: 'Steam · 语言 + 区域组合',
      items: [
        { name: 'Steam 全站 · 简中 + 国区', host: STEAM_ALL, params: [{ key: 'l', value: 'schinese' }, { key: 'cc', value: 'cn' }], mode: 'early', overwrite: true },
        { name: 'Steam 全站 · 简中 + 美区（看美元价）', host: STEAM_ALL, params: [{ key: 'l', value: 'schinese' }, { key: 'cc', value: 'us' }], mode: 'early', overwrite: true, note: 'cc 仅未登录生效' },
        { name: 'Steam 全站 · 简中 + 港区', host: STEAM_ALL, params: [{ key: 'l', value: 'schinese' }, { key: 'cc', value: 'hk' }], mode: 'early', overwrite: true, note: 'cc 仅未登录生效' }
      ]
    },
    {
      group: '其他常用',
      items: [
        { name: 'SteamDB · 显示所有价格', host: 'steamdb.info', params: [{ key: 'all', value: '1' }], mode: 'soft', overwrite: false },
        { name: '去掉 utm 追踪参数', host: '*', params: [], mode: 'soft', overwrite: false, remove: ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'] },
        { name: '去掉 Steam 的 snr 追踪', host: STEAM_ALL, params: [], mode: 'soft', overwrite: false, remove: ['snr'] }
      ]
    }
  ];

  const MODE_TEXT = {
    soft: '仅改地址栏（不刷新）',
    reload: '刷新页面（参数可被服务端读到）',
    early: '抢在渲染前跳转（最快，适合 Steam）'
  };

  /* ============================================================
   * 0.2 Steam 专区：独立的语言 / 区域 / 防护配置
   *     规则用固定 id 存储，便于专区直接读写与覆盖
   * ========================================================== */
  const STEAM_SCOPE = {
    all:      { id: 'all',      host: STEAM_ALL,       label: '全站（商店 + 社区）' },
    store:    { id: 'store',    host: STEAM_STORE,     label: '仅商店 steampowered.com' },
    community:{ id: 'community',host: STEAM_COMMUNITY, label: '仅社区 steamcommunity.com' }
  };

  const STEAM_LANGS = [
    { v: 'schinese',  zh: '简体中文',  native: '简体中文 (Simplified Chinese)' },
    { v: 'tchinese',  zh: '繁体中文',  native: '繁體中文 (Traditional Chinese)' },
    { v: 'english',   zh: '英语',      native: 'English' },
    { v: 'japanese',  zh: '日语',      native: '日本語' },
    { v: 'koreana',   zh: '韩语',      native: '한국어' },
    { v: 'russian',   zh: '俄语',      native: 'Русский' },
    { v: 'german',    zh: '德语',      native: 'Deutsch' },
    { v: 'french',    zh: '法语',      native: 'Français' },
    { v: 'spanish',   zh: '西班牙语',  native: 'Español' },
    { v: 'thai',      zh: '泰语',      native: 'ไทย' },
    { v: 'vietnamese',zh: '越南语',    native: 'Tiếng Việt' },
    { v: 'ukrainian', zh: '乌克兰语',  native: 'Українська' }
  ];

  const STEAM_REGIONS = [
    { v: 'us', zh: '美区', cur: 'USD $' },
    { v: 'cn', zh: '国区', cur: 'CNY ¥' },
    { v: 'hk', zh: '港区', cur: 'HKD HK$' },
    { v: 'jp', zh: '日区', cur: 'JPY ¥' },
    { v: 'ru', zh: '俄区', cur: 'RUB ₽' },
    { v: 'uk', zh: '英区', cur: 'GBP £' },
    { v: 'tr', zh: '土区', cur: 'TRY ₺' },
    { v: 'ar', zh: '阿区', cur: 'ARS $' },
    { v: 'de', zh: '德区', cur: 'EUR €' },
    { v: 'fr', zh: '法区', cur: 'EUR €' },
    { v: 'kr', zh: '韩区', cur: 'KRW ₩' },
    { v: 'tw', zh: '台区', cur: 'TWD NT$' }
  ];

  // 专区管理的三条固定规则 id
  const STEAM_RULE_LANG  = 'steam-lang';
  const STEAM_RULE_CC    = 'steam-cc';
  const STEAM_RULE_CLEAN = 'steam-clean';

  /* ============================================================
   * 1. 配置读写
   * ========================================================== */
  let rules = loadRules();

  function loadRules() {
    try {
      const raw = GM_getValue(STORE_KEY, null);
      if (!raw) return clone(DEFAULT_RULES);
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(normalizeRule) : [];
    } catch (e) {
      console.warn('[UPI] 配置解析失败，回退到默认规则', e);
      return clone(DEFAULT_RULES);
    }
  }

  /**
   * 规范化规则：补齐字段，并把 1.1.0 之前的 reload 布尔升级为 mode 三档
   */
  function normalizeRule(r) {
    if (!r || typeof r !== 'object') return null;
    let mode = r.mode;
    if (mode !== 'soft' && mode !== 'reload' && mode !== 'early') {
      mode = r.reload ? 'reload' : 'soft';
    }
    return {
      id: r.id || uid(),
      host: String(r.host || '').trim(),
      path: String(r.path || '').trim(),
      enabled: r.enabled !== false,
      overwrite: !!r.overwrite,
      mode: mode,
      reload: mode === 'reload' || mode === 'early',
      remove: (r.remove || []).map(s => String(s).trim()).filter(Boolean),
      params: (r.params || []).filter(p => p && String(p.key || '').trim())
        .map(p => ({ key: String(p.key).trim(), value: String(p.value == null ? '' : p.value) }))
    };
  }

  function saveRules(list) {
    GM_setValue(STORE_KEY, JSON.stringify(list));
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function uid() {
    return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /* ============================================================
   * 2. 域名匹配（支持 *.example.com 通配，支持逗号分隔多个域名）
   * ========================================================== */
  function matchHost(hostname, pattern) {
    if (!pattern) return false;
    const p = String(pattern).trim().toLowerCase();
    const h = String(hostname).toLowerCase();
    if (p === '*') return true;
    if (p.startsWith('*.')) {
      const base = p.slice(2);
      return h === base || h.endsWith('.' + base);
    }
    return h === p;
  }

  /**
   * 一条规则可填多个域名，用逗号分隔
   * 例：*.steampowered.com, steamcommunity.com
   */
  function matchHosts(hostname, hostField) {
    const list = String(hostField || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!list.length) return false;
    return list.some(p => matchHost(hostname, p));
  }

  /**
   * 路径匹配：留空表示匹配全部路径
   * 支持前缀匹配 /app/ ，与 * 结尾的模糊匹配
   */
  function matchPath(pathname, pattern) {
    const p = String(pattern || '').trim();
    if (!p || p === '*') return true;
    const h = pathname || '/';
    if (p.indexOf('*') !== -1) {
      const re = new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
      return re.test(h);
    }
    return h === p || h.indexOf(p) === 0;
  }

  /* ============================================================
   * 2.5 Steam 专区：规则读写
   * ========================================================== */
  function findSteamRule(list, id) {
    return (list || []).find(r => r && r.id === id) || null;
  }

  /** 从语言规则里反查当前生效的语言值与覆盖范围 */
  function readSteamLang(list) {
    const r = findSteamRule(list, STEAM_RULE_LANG);
    if (!r || r.enabled === false) return { value: '', scope: 'all', enabled: false };
    const p = (r.params || []).find(x => x && x.key === 'l');
    const hosts = String(r.host || '');
    let scope = 'all';
    if (hosts.indexOf('steamcommunity.com') === -1) scope = 'store';
    else if (hosts.indexOf('steampowered.com') === -1) scope = 'community';
    return { value: p ? p.value : '', scope: scope, enabled: true };
  }

  /** 从区域规则里反查当前生效的区域值 */
  function readSteamCc(list) {
    const r = findSteamRule(list, STEAM_RULE_CC);
    if (!r || r.enabled === false) return { value: '', enabled: false };
    const p = (r.params || []).find(x => x && x.key === 'cc');
    return { value: p ? p.value : '', enabled: true };
  }

  function readSteamClean(list) {
    const r = findSteamRule(list, STEAM_RULE_CLEAN);
    return { enabled: !!(r && r.enabled !== false) };
  }

  /* 专区里的待应用选择：点 chip 只更新这里，点「应用」才落盘 */
  let steamPendingLang = '';
  let steamPendingCc = '';
  let steamPendingScope = 'all';

  function syncSteamPending() {
    const l = readSteamLang(draft);
    steamPendingLang = l.enabled ? l.value : '';
    steamPendingScope = l.scope || 'all';
    const c = readSteamCc(draft);
    steamPendingCc = c.enabled ? c.value : '';
  }

  /** 新标签页打开（比 window.open 在油猴沙盒里更可靠） */
  function openUrl(url) {
    try {
      const a = doc.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      doc.body.appendChild(a);
      a.click();
      setTimeout(() => { try { a.remove(); } catch (e) {} }, 0);
    } catch (e) {
      try { win.open(url, '_blank'); } catch (e2) { console.warn('[UPI] 打开链接失败', e2); }
    }
  }

  /** 专区改动落盘：保存 → 应用 → 重绘 */
  function commitSteam(msg) {
    draft = draft.filter(r => String(r.host || '').trim())
      .map(normalizeRule)
      .filter(Boolean);
    rules = clone(draft);
    saveRules(rules);
    dynCache.clear();
    syncSteamPending();
    applyRules();
    renderPanel();
    toast(msg);
  }

  /** 写入（或删除）一条专区规则；value 为空表示移除该规则 */
  function writeSteamRule(list, id, host, params, remove) {
    let next = (list || []).slice();
    const idx = next.findIndex(r => r && r.id === id);
    const keep = (params && params.length) || (remove && remove.length);

    if (!keep) {
      if (idx !== -1) next.splice(idx, 1);
      return next;
    }

    const rule = {
      id: id,
      host: host,
      path: '',
      enabled: true,
      overwrite: true,
      mode: 'early',
      reload: true,
      remove: remove || [],
      params: params || []
    };
    if (idx === -1) next.push(rule);
    else next[idx] = rule;
    return next;
  }

  /* ============================================================
   * 3. 动态变量（缓存，避免每次变化导致死循环）
   *    支持： {ts} 时间戳 | {date} 日期 | {ts_sec} 秒级 | {random} 随机串
   * ========================================================== */
  const dynCache = new Map();

  function resolveValue(host, path, key, tpl) {
    const raw = String(tpl == null ? '' : tpl);
    if (raw.indexOf('{') === -1) return raw;

    const ck = host + path + '|' + key;
    if (dynCache.has(ck)) return dynCache.get(ck);

    const val = raw
      .replace(/\{ts\}/g, String(Date.now()))
      .replace(/\{ts_sec\}/g, String(Math.floor(Date.now() / 1000)))
      .replace(/\{date\}/g, new Date().toISOString().slice(0, 10))
      .replace(/\{random\}/g, Math.random().toString(36).slice(2, 10));

    dynCache.set(ck, val);
    return val;
  }

  /* ============================================================
   * 4. 核心：应用规则
   * ========================================================== */
  let applying = false;
  let timer = null;

  function applyRules() {
    if (applying) return;

    let url;
    try {
      url = new URL(win.location.href);
    } catch (e) {
      return;
    }

    let changed = false;
    let needReload = false;
    let needEarly = false;

    for (const rule of rules) {
      if (!rule || rule.enabled === false) continue;
      if (!matchHosts(url.hostname, rule.host)) continue;
      if (!matchPath(url.pathname, rule.path)) continue;

      for (const p of (rule.params || [])) {
        if (!p || !p.key) continue;
        const val = resolveValue(url.hostname, url.pathname, p.key, p.value);
        if (rule.overwrite || !url.searchParams.has(p.key)) {
          if (url.searchParams.get(p.key) !== val) {
            url.searchParams.set(p.key, val);
            changed = true;
          }
        }
      }

      for (const k of (rule.remove || [])) {
        const key = String(k || '').trim();
        if (key && url.searchParams.has(key)) {
          url.searchParams.delete(key);
          changed = true;
        }
      }

      if (rule.mode === 'early') needEarly = true;
      else if (rule.reload) needReload = true;
    }

    if (!changed) return;

    // 防死循环：10 秒内重定向超过 6 次说明站点在反复剥离参数，暂停注入
    if ((needEarly || needReload) && tooManyRedirects()) {
      console.warn('[UPI] 检测到频繁重定向，本轮暂停注入以防死循环');
      return;
    }

    applying = true;
    try {
      // early：页面尚未渲染完成时，先中止原请求再跳，避免白等一整页
      const isEarlyStage = !doc || doc.readyState === 'loading' || !doc.body;
      if (needEarly && isEarlyStage) {
        try { win.stop(); } catch (e) { /* 部分浏览器不支持，忽略 */ }
        win.location.replace(url.href);
      } else if (needEarly || needReload) {
        win.location.replace(url.href);
      } else {
        win.history.replaceState(win.history.state, '', url.href);
      }
    } catch (e) {
      console.warn('[UPI] 应用规则失败', e);
    } finally {
      setTimeout(() => { applying = false; }, 0);
    }
  }

  function scheduleApply() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      applyRules();
    }, 60);
  }

  /* ============================================================
   * 5. SPA 路由劫持（Vue / React 等前端路由也能补参）
   * ========================================================== */
  function installHooks() {
    const h = win.history;
    if (!h || h.__upiHooked) return;
    h.__upiHooked = true;

    const push = h.pushState;
    const replace = h.replaceState;

    h.pushState = function () {
      const r = push.apply(this, arguments);
      scheduleApply();
      return r;
    };
    h.replaceState = function () {
      const r = replace.apply(this, arguments);
      scheduleApply();
      return r;
    };

    win.addEventListener('popstate', scheduleApply);
    win.addEventListener('hashchange', scheduleApply);
  }

  /* ============================================================
   * 5.5 语言偏好防护：拦截站点自发保存语言的请求
   *     典型场景：给 Steam 加了 ?l=schinese 后，Steam 会主动 POST
   *     /account/setlanguage 与 /account/savelanguagepreferences
   *     把语言写回账户与 cookie。本模块拦下这些请求，做到
   *     「本次以中文显示，但不改动账户语言设置」。
   * ========================================================== */
  const GUARD_KEY = 'upi_guard_v1';

  const DEFAULT_GUARD = {
    enabled: false,
    mode: 'swallow',      // swallow 吞掉不回调 | respond 伪造成功响应
    blockCookie: true,    // 同时阻止写入 steam_language cookie
    log: true,            // 控制台输出拦截日志
    patterns: [
      '/account/setlanguage',
      '/account/savelanguagepreferences',
      '/actions/SetLanguage',
      '/account/ajaxsetlanguage',
      '/languagepreferences',
      'savelanguagepreferences'
    ]
  };

  let guard = loadGuard();
  let blockedCount = 0;

  function loadGuard() {
    try {
      const raw = GM_getValue(GUARD_KEY, null);
      if (!raw) return clone(DEFAULT_GUARD);
      const g = JSON.parse(raw);
      if (!g || typeof g !== 'object') return clone(DEFAULT_GUARD);
      return normalizeGuard(g);
    } catch (e) {
      console.warn('[UPI] 防护配置解析失败，回退默认', e);
      return clone(DEFAULT_GUARD);
    }
  }

  function normalizeGuard(g) {
    return {
      enabled: !!g.enabled,
      mode: (g.mode === 'respond') ? 'respond' : 'swallow',
      blockCookie: g.blockCookie !== false,
      log: g.log !== false,
      patterns: (Array.isArray(g.patterns) ? g.patterns : DEFAULT_GUARD.patterns)
        .map(s => String(s || '').trim()).filter(Boolean)
    };
  }

  function saveGuard(g) {
    GM_setValue(GUARD_KEY, JSON.stringify(g));
  }

  /** URL 是否命中拦截名单 */
  function isLangSaveUrl(url) {
    const u = String(url || '').toLowerCase();
    if (!u) return false;
    return guard.patterns.some(p => u.indexOf(String(p).toLowerCase()) !== -1);
  }

  function shouldBlock(method, url) {
    if (!guard.enabled) return false;
    // 只拦写操作，GET 查询类请求放行
    const m = String(method || 'GET').toUpperCase();
    if (m !== 'POST' && m !== 'PUT' && m !== 'PATCH' && m !== 'DELETE') return false;
    return isLangSaveUrl(url);
  }

  function onBlocked(kind, url) {
    blockedCount++;
    if (guard.log) {
      console.info('[UPI] 已拦截语言保存请求 #' + blockedCount + ' [' + kind + '] ' + url);
    }
    const tip = doc.getElementById('upi-guard-stat');
    if (tip) tip.innerHTML = '本次已拦截 <b>' + blockedCount + '</b> 次语言保存请求';
    if (blockedCount === 1) toast('🛡️ 已拦截 1 次语言保存请求（账户设置未被修改）');
  }

  /** XHR：吞掉 = 不发送、不触发任何回调（可避免 Steam 的后续跳转） */
  function patchXHR() {
    const OrigXHR = win.XMLHttpRequest;
    if (!OrigXHR || !OrigXHR.prototype || OrigXHR.prototype.__upiPatched) return;
    const P = OrigXHR.prototype;
    const origOpen = P.open;
    const origSend = P.send;

    P.open = function (m, u) {
      try {
        this.__upiMethod = String(m || 'GET').toUpperCase();
        this.__upiUrl = String(u == null ? '' : u);
      } catch (e) { /* 属性不可写时忽略 */ }
      return origOpen.apply(this, arguments);
    };

    P.send = function () {
      const m = this.__upiMethod || 'GET';
      const u = this.__upiUrl || '';
      if (shouldBlock(m, u)) {
        onBlocked(m, u);
        if (guard.mode === 'respond') {
          fakeXhrDone(this);
          return;
        }
        // swallow：直接丢弃，不发送、不回调
        try { this.__upiBlocked = true; } catch (e) {}
        return;
      }
      return origSend.apply(this, arguments);
    };

    P.__upiPatched = true;
  }

  /** 伪造一个「成功」的 XHR 响应，让页面逻辑继续走（可能触发 Steam 的跳转） */
  function fakeXhrDone(xhr) {
    try {
      const body = '{"success":1}';
      const def = (k, v) => {
        try { Object.defineProperty(xhr, k, { value: v, configurable: true, writable: true }); }
        catch (e) { try { xhr[k] = v; } catch (e2) {} }
      };
      def('readyState', 4);
      def('status', 200);
      def('statusText', 'OK');
      def('responseText', body);
      def('response', body);
      def('responseURL', xhr.__upiUrl || '');

      if (typeof xhr.onreadystatechange === 'function') xhr.onreadystatechange(new Event('readystatechange'));
      try { xhr.dispatchEvent(new Event('readystatechange')); } catch (e) {}
      try { xhr.dispatchEvent(new Event('load')); } catch (e) {}
      if (typeof xhr.onload === 'function') xhr.onload(new Event('load'));
      try { xhr.dispatchEvent(new Event('loadend')); } catch (e) {}
    } catch (e) {
      console.warn('[UPI] 伪造响应失败', e);
    }
  }

  /** fetch：respond 模式返回假 200；swallow 模式返回永不 settle 的 Promise */
  function patchFetch() {
    if (!win.fetch || win.fetch.__upiPatched) return;
    const origFetch = win.fetch;
    const patched = function (input, init) {
      let url = '', method = 'GET';
      try {
        if (typeof input === 'string') url = input;
        else if (input && input.url) url = String(input.url);
        method = ((init && init.method) || (input && input.method) || 'GET');
      } catch (e) { /* 忽略解析失败 */ }

      if (shouldBlock(method, url)) {
        onBlocked(String(method).toUpperCase(), url);
        if (guard.mode === 'respond') {
          const R = win.Response || Response;
          try {
            return Promise.resolve(new R('{"success":1}', {
              status: 200, statusText: 'OK', headers: { 'Content-Type': 'application/json' }
            }));
          } catch (e) {
            return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ success: 1 }), text: () => Promise.resolve('{"success":1}') });
          }
        }
        return new Promise(function () { /* 永不 settle，等同吞掉 */ });
      }
      return origFetch.apply(win, arguments);
    };
    patched.__upiPatched = true;
    try { Object.defineProperty(patched, 'name', { value: 'fetch', configurable: true }); } catch (e) {}
    win.fetch = patched;
  }

  /** sendBeacon：直接吞掉并返回 true */
  function patchBeacon() {
    const nav = win.navigator;
    if (!nav || !nav.sendBeacon || nav.sendBeacon.__upiPatched) return;
    const orig = nav.sendBeacon.bind(nav);
    const patched = function (url, data) {
      if (guard.enabled && isLangSaveUrl(url)) {
        onBlocked('BEACON', String(url));
        return true;
      }
      return orig(url, data);
    };
    patched.__upiPatched = true;
    try { nav.sendBeacon = patched; } catch (e) { /* 部分浏览器不可写 */ }
  }

  /** cookie：阻止写入 steam_language */
  function patchCookie() {
    const proto = win.Document && win.Document.prototype;
    if (!proto || proto.__upiCookiePatched) return;
    const d = Object.getOwnPropertyDescriptor(proto, 'cookie');
    if (!d || !d.set) return;
    Object.defineProperty(proto, 'cookie', {
      configurable: true,
      enumerable: d.enumerable,
      get: function () { return d.get.call(this); },
      set: function (v) {
        const s = String(v == null ? '' : v);
        if (guard.enabled && guard.blockCookie && /steam_language/i.test(s)) {
          onBlocked('COOKIE', s);
          return;
        }
        return d.set.call(this, v);
      }
    });
    proto.__upiCookiePatched = true;
  }

  function installGuards() {
    try {
      patchXHR();
      patchFetch();
      patchBeacon();
      patchCookie();
    } catch (e) {
      console.warn('[UPI] 安装防护失败', e);
    }
  }

  /* ============================================================
   * 5.6 防跳转死循环：短时间内重定向过多则暂停注入
   * ========================================================== */
  function tooManyRedirects() {
    try {
      const key = 'upi_redirect_log';
      const now = Date.now();
      let arr = [];
      try { arr = JSON.parse(win.sessionStorage.getItem(key) || '[]'); } catch (e) { arr = []; }
      if (!Array.isArray(arr)) arr = [];
      arr = arr.filter(t => now - t < 10000);
      arr.push(now);
      win.sessionStorage.setItem(key, JSON.stringify(arr));
      return arr.length > 6;
    } catch (e) {
      return false;
    }
  }

  /* ============================================================
   * 6. 可视化配置面板
   * ========================================================== */
  function ensureStyle() {
    if (doc.getElementById(STYLE_ID)) return;
    const s = doc.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
#${PANEL_ID} {
  position: fixed; inset: 0; z-index: 2147483647;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,.45);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px; line-height: 1.5;
}
#${PANEL_ID} .upi-box {
  width: min(880px, 94vw); max-height: 88vh; overflow: auto;
  background: #fff; color: #1f2328;
  border-radius: 12px; padding: 18px 20px;
  box-shadow: 0 20px 60px rgba(0,0,0,.32);
}
#${PANEL_ID} h3 { margin: 0 0 4px; font-size: 16px; }
#${PANEL_ID} .upi-sub { color: #6a737d; margin-bottom: 12px; }
#${PANEL_ID} .upi-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
#${PANEL_ID} label.chk { display: inline-flex; gap: 4px; align-items: center; cursor: pointer; user-select: none; }
#${PANEL_ID} input[type=text] {
  border: 1px solid #d0d7de; border-radius: 6px; padding: 5px 8px;
  font-size: 13px; outline: none; background: #fff; color: #1f2328;
}
#${PANEL_ID} input[type=text]:focus { border-color: #0969da; box-shadow: 0 0 0 3px rgba(9,105,218,.15); }
#${PANEL_ID} button {
  border: 1px solid #d0d7de; background: #f6f8fa; color: #1f2328;
  border-radius: 6px; padding: 5px 10px; cursor: pointer; font-size: 13px;
}
#${PANEL_ID} button:hover { background: #eaeef2; }
#${PANEL_ID} button.primary { background: #1f883d; border-color: #1f883d; color: #fff; }
#${PANEL_ID} button.primary:hover { background: #1a7f37; }
#${PANEL_ID} button.danger { color: #cf222e; }
#${PANEL_ID} .upi-rule {
  border: 1px solid #d0d7de; border-radius: 10px;
  padding: 12px; margin-bottom: 12px; background: #fafbfc;
}
#${PANEL_ID} .upi-rule.off { opacity: .55; }
#${PANEL_ID} .upi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
#${PANEL_ID} .upi-param { display: grid; grid-template-columns: 1fr 1.4fr auto; gap: 8px; margin-bottom: 6px; }
#${PANEL_ID} .upi-head4 { font-weight: 600; margin: 10px 0 6px; font-size: 13px; }
#${PANEL_ID} .upi-foot { display: flex; gap: 8px; flex-wrap: wrap; margin: 14px 0 8px; }
#${PANEL_ID} textarea {
  width: 100%; min-height: 90px; box-sizing: border-box;
  border: 1px solid #d0d7de; border-radius: 6px; padding: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px;
  background: #fff; color: #1f2328;
}
#${PANEL_ID} .upi-tip { color: #6a737d; margin-top: 8px; white-space: pre-line; }
#${PANEL_ID} .upi-close { float: right; cursor: pointer; font-size: 20px; line-height: 1; color: #6a737d; }
#${PANEL_ID} code { background: #eff1f3; padding: 1px 5px; border-radius: 4px; }

#${PANEL_ID} .upi-tabs { display: flex; gap: 6px; border-bottom: 1px solid #d0d7de; margin-bottom: 14px; }
#${PANEL_ID} .upi-tab {
  border: 1px solid transparent; border-bottom: none; background: transparent;
  border-radius: 8px 8px 0 0; padding: 7px 14px; cursor: pointer;
  color: #6a737d; position: relative; top: 1px; font-size: 13px;
}
#${PANEL_ID} .upi-tab.on {
  background: #fff; border-color: #d0d7de; color: #0969da; font-weight: 600;
}
#${PANEL_ID} .upi-tab:hover { color: #0969da; }

#${PANEL_ID} .upi-block { margin-bottom: 16px; }
#${PANEL_ID} .upi-tip2 { color: #6a737d; font-size: 12px; margin: 4px 0 8px; }
#${PANEL_ID} .upi-alert {
  background: #fff8c5; border: 1px solid #d4a72c66; border-radius: 8px;
  padding: 8px 10px; margin-top: 10px; font-size: 12px; line-height: 1.6;
}
#${PANEL_ID} .upi-chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
#${PANEL_ID} .upi-chip {
  border: 1px solid #d0d7de; background: #f6f8fa; border-radius: 999px;
  padding: 5px 12px; cursor: pointer; font-size: 12px; color: #1f2328;
}
#${PANEL_ID} .upi-chip:hover { border-color: #0969da; color: #0969da; }
#${PANEL_ID} .upi-chip.on {
  background: #0969da; border-color: #0969da; color: #fff; font-weight: 600;
}
#${PANEL_ID} .upi-radios { display: flex; flex-wrap: wrap; gap: 10px; margin: 6px 0 8px; }
#${PANEL_ID} .upi-radio { display: inline-flex; align-items: center; gap: 4px; cursor: pointer; font-size: 12px; user-select: none; }
#${PANEL_ID} .upi-radio.on { color: #0969da; font-weight: 600; }

#${PANEL_ID} .upi-steam-status {
  background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 10px;
  padding: 10px 12px; margin-bottom: 14px;
}
#${PANEL_ID} .upi-steam-status.active { background: #ddf4e4; border-color: #1f883d55; }
#${PANEL_ID} .upi-steam-badge { font-weight: 600; font-size: 13px; margin-bottom: 8px; }
#${PANEL_ID} .upi-steam-status.active .upi-steam-badge { color: #1a7f37; }
#${PANEL_ID} .upi-kv { display: flex; gap: 10px; font-size: 12px; padding: 2px 0; }
#${PANEL_ID} .upi-kv-k { min-width: 68px; color: #6a737d; }
#${PANEL_ID} .upi-kv-v.ok { color: #1a7f37; font-weight: 600; }
#${PANEL_ID} .upi-kv-v.off { color: #8c959f; }

#${PANEL_ID} .upi-switches { display: flex; flex-direction: column; gap: 8px; }
#${PANEL_ID} .upi-switch {
  display: grid; grid-template-columns: auto 1fr; gap: 2px 8px;
  border: 1px solid #d0d7de; border-radius: 8px; padding: 8px 10px; cursor: pointer;
}
#${PANEL_ID} .upi-switch:hover { border-color: #0969da; }
#${PANEL_ID} .upi-switch input { grid-row: span 2; align-self: start; margin-top: 2px; }
#${PANEL_ID} .upi-switch-t { font-size: 13px; font-weight: 600; }
#${PANEL_ID} .upi-switch-d { font-size: 12px; color: #6a737d; }
@media (prefers-color-scheme: dark) {
  #${PANEL_ID} .upi-box { background: #22272e; color: #e6edf3; }
  #${PANEL_ID} .upi-rule { background: #2a3038; border-color: #444c56; }
  #${PANEL_ID} input[type=text], #${PANEL_ID} textarea { background: #22272e; color: #e6edf3; border-color: #444c56; }
  #${PANEL_ID} select { background: #22272e !important; color: #e6edf3 !important; border-color: #444c56 !important; }
  #${PANEL_ID} button { background: #2f353d; color: #e6edf3; border-color: #444c56; }
  #${PANEL_ID} button:hover { background: #3a4149; }
  #${PANEL_ID} code { background: #2f353d; }
  #${PANEL_ID} .upi-tabs { border-color: #444c56; }
  #${PANEL_ID} .upi-tab.on { background: #22272e; border-color: #444c56; color: #58a6ff; }
  #${PANEL_ID} .upi-tab:hover { color: #58a6ff; }
  #${PANEL_ID} .upi-chip { background: #2f353d; border-color: #444c56; color: #e6edf3; }
  #${PANEL_ID} .upi-chip:hover { border-color: #58a6ff; color: #58a6ff; }
  #${PANEL_ID} .upi-chip.on { background: #1f6feb; border-color: #1f6feb; color: #fff; }
  #${PANEL_ID} .upi-radio.on { color: #58a6ff; }
  #${PANEL_ID} .upi-steam-status { background: #2a3038; border-color: #444c56; }
  #${PANEL_ID} .upi-steam-status.active { background: #1a3326; border-color: #2ea04355; }
  #${PANEL_ID} .upi-steam-status.active .upi-steam-badge { color: #3fb950; }
  #${PANEL_ID} .upi-kv-v.ok { color: #3fb950; }
  #${PANEL_ID} .upi-kv-v.off { color: #8b949e; }
  #${PANEL_ID} .upi-switch { border-color: #444c56; }
  #${PANEL_ID} .upi-switch:hover { border-color: #58a6ff; }
  #${PANEL_ID} .upi-alert { background: #3b2f0a; border-color: #9e6a03; color: #e6edf3; }
  #${PANEL_ID} .upi-toast { background: rgba(0,0,0,.9) !important; }
}
`;
    (doc.head || doc.documentElement).appendChild(s);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function ruleHtml(r, i) {
    const params = (r.params || []).map((p, pi) => `
      <div class="upi-param">
        <input type="text" placeholder="参数名 如 from" value="${esc(p.key)}" data-rule="${i}" data-pi="${pi}" data-field="key">
        <input type="text" placeholder="值，支持 {ts} {date} {random}" value="${esc(p.value)}" data-rule="${i}" data-pi="${pi}" data-field="value">
        <button class="danger" data-act="del-param" data-rule="${i}" data-pi="${pi}">删除</button>
      </div>`).join('');

    return `
      <div class="upi-rule ${r.enabled === false ? 'off' : ''}">
        <div class="upi-row">
          <span style="min-width:52px;color:#6a737d">域名</span>
          <input type="text" style="flex:1;min-width:260px" placeholder="域名，多个用逗号分隔：*.steampowered.com, steamcommunity.com" value="${esc(r.host)}" data-rule="${i}" data-field="host">
          <label class="chk"><input type="checkbox" data-rule="${i}" data-field="enabled" ${r.enabled === false ? '' : 'checked'}>启用</label>
          <button class="danger" data-act="del-rule" data-rule="${i}">删除规则</button>
        </div>
        <div class="upi-row" style="margin-top:8px">
          <span style="min-width:52px;color:#6a737d">路径</span>
          <input type="text" style="flex:1;min-width:180px" placeholder="留空=全部路径，如 /app/" value="${esc(r.path)}" data-rule="${i}" data-field="path">
          <span style="min-width:52px;color:#6a737d">模式</span>
          <select data-rule="${i}" data-field="mode">
            <option value="soft" ${r.mode === 'soft' ? 'selected' : ''}>${MODE_TEXT.soft}</option>
            <option value="reload" ${r.mode === 'reload' ? 'selected' : ''}>${MODE_TEXT.reload}</option>
            <option value="early" ${r.mode === 'early' ? 'selected' : ''}>${MODE_TEXT.early}</option>
          </select>
          <label class="chk"><input type="checkbox" data-rule="${i}" data-field="overwrite" ${r.overwrite ? 'checked' : ''}>覆盖同名参数</label>
        </div>
        <div class="upi-head4">要添加的参数</div>
        ${params || '<div style="color:#6a737d">（暂无，点击下方按钮添加）</div>'}
        <button style="margin-top:6px" data-act="add-param" data-rule="${i}">+ 添加参数</button>
        <div class="upi-head4">要删除的参数（逗号分隔，可留空）</div>
        <input type="text" style="width:100%;box-sizing:border-box" placeholder="utm_source,utm_medium" value="${esc((r.remove || []).join(','))}" data-rule="${i}" data-field="remove">
      </div>`;
  }

  function guardSectionHtml() {
    return `
      <div class="upi-head4">🛡️ 语言偏好防护（不改动站点/账户的语言设置）</div>
      <div class="upi-row">
        <label class="chk"><input type="checkbox" id="upi-guard-enabled" ${guard.enabled ? 'checked' : ''}>启用拦截</label>
        <select id="upi-guard-mode" style="padding:5px 8px;border-radius:6px;border:1px solid #d0d7de;background:#fff;color:#1f2328">
          <option value="swallow" ${guard.mode === 'swallow' ? 'selected' : ''}>吞掉请求（不回调，推荐）</option>
          <option value="respond" ${guard.mode === 'respond' ? 'selected' : ''}>伪造成功响应（页面可能跳转）</option>
        </select>
        <label class="chk"><input type="checkbox" id="upi-guard-cookie" ${guard.blockCookie ? 'checked' : ''}>阻止写 steam_language cookie</label>
        <label class="chk"><input type="checkbox" id="upi-guard-log" ${guard.log ? 'checked' : ''}>控制台日志</label>
      </div>
      <div style="margin-top:8px;color:#6a737d">拦截目标 URL 关键字（每行一个，不区分大小写）</div>
      <textarea id="upi-guard-patterns" style="min-height:80px">${esc(guard.patterns.join('\n'))}</textarea>
      <div class="upi-tip" id="upi-guard-stat">本次已拦截 <b>${blockedCount}</b> 次语言保存请求</div>
      <div class="upi-tip">· 只拦 POST/PUT/PATCH/DELETE，GET 查询放行
· 「吞掉」会让站点的回调不执行，因此 Steam 那个「保存后剥掉 l= 参数再跳转」的动作也不会发生，可避免反复跳转
· 「伪造成功」更贴近真实流程，但 Steam 随后会把地址栏的 l= 去掉，本脚本下一跳会再补，可能来回跳转
· 已内置 Steam 的三个端点：/account/setlanguage、/account/savelanguagepreferences、/actions/SetLanguage
</div>`;
  }

  /** Steam 专区：当前状态卡片（展示待应用选择，并提示是否尚未落盘） */
  function steamStatusHtml() {
    const savedLang = readSteamLang(draft);
    const savedCc = readSteamCc(draft);
    const clean = readSteamClean(draft);

    const dirty = (steamPendingLang !== (savedLang.enabled ? savedLang.value : ''))
      || (steamPendingCc !== (savedCc.enabled ? savedCc.value : ''))
      || (steamPendingLang && steamPendingScope !== savedLang.scope && savedLang.enabled);

    const langHit = STEAM_LANGS.find(x => x.v === steamPendingLang);
    const ccHit = STEAM_REGIONS.find(x => x.v === steamPendingCc);
    const on = !!steamPendingLang;

    const row = (k, v, ok) => `
      <div class="upi-kv">
        <span class="upi-kv-k">${k}</span>
        <span class="upi-kv-v ${ok ? 'ok' : 'off'}">${v}</span>
      </div>`;

    const badge = dirty ? '● 有改动待应用'
      : (on ? '● Steam 规则已生效' : '○ 尚未设置 Steam 语言');

    return `
      <div class="upi-steam-status ${on && !dirty ? 'active' : ''}">
        <div class="upi-steam-badge">${badge}</div>
        ${row('界面语言', steamPendingLang ? (esc(langHit ? langHit.zh : steamPendingLang) + ' <code>?l=' + esc(steamPendingLang) + '</code>') : '未设置', !!steamPendingLang)}
        ${row('生效范围', steamPendingLang ? esc(STEAM_SCOPE[steamPendingScope].label) : '—', !!steamPendingLang)}
        ${row('商店区域', steamPendingCc ? (esc(ccHit ? ccHit.zh : steamPendingCc) + ' <code>?cc=' + esc(steamPendingCc) + '</code>') : '未设置', !!steamPendingCc)}
        ${row('语言防护', guard.enabled ? '已开启（拦截 ' + blockedCount + ' 次）' : '未开启', guard.enabled)}
        ${row('去 snr 追踪', clean.enabled ? '已开启' : '未开启', clean.enabled)}
      </div>`;
  }

  /** Steam 专区：语言按钮组 */
  function steamLangHtml() {
    const scopeBtns = Object.keys(STEAM_SCOPE).map(k =>
      `<label class="upi-radio ${steamPendingScope === k ? 'on' : ''}">
         <input type="radio" name="upi-steam-scope" value="${k}" ${steamPendingScope === k ? 'checked' : ''}>
         ${esc(STEAM_SCOPE[k].label)}
       </label>`).join('');

    const langBtns = STEAM_LANGS.map(l =>
      `<button class="upi-chip ${steamPendingLang === l.v ? 'on' : ''}" data-act="steam-set-lang" data-v="${esc(l.v)}" title="${esc(l.native)}">${esc(l.zh)}</button>`
    ).join('');

    return `
      <div class="upi-block">
        <div class="upi-head4">① 界面语言 <code>?l=</code></div>
        <div class="upi-tip2">点选语言 → 选范围 → 点「应用语言设置」。再次点击同一语言可取消选择。</div>
        <div class="upi-chips">${langBtns}</div>
        <div class="upi-head4">生效范围</div>
        <div class="upi-radios">${scopeBtns}</div>
        <div class="upi-tip2">⚠️ 商店与社区是不同域名：<code>*.steampowered.com</code> ≠ <code>steamcommunity.com</code>。选「全站」才能两边都生效。</div>
        <div class="upi-row" style="margin-top:8px">
          <button class="primary" data-act="steam-apply-lang">应用语言设置</button>
          <button data-act="steam-clear-lang">清除语言规则</button>
        </div>
      </div>`;
  }

  /** Steam 专区：区域按钮组 */
  function steamRegionHtml() {
    const btns = STEAM_REGIONS.map(r =>
      `<button class="upi-chip ${steamPendingCc === r.v ? 'on' : ''}" data-act="steam-set-cc" data-v="${esc(r.v)}" title="${esc(r.cur)}">${esc(r.zh)}</button>`
    ).join('');

    return `
      <div class="upi-block">
        <div class="upi-head4">② 商店区域 / 货币 <code>?cc=</code></div>
        <div class="upi-chips">${btns}</div>
        <div class="upi-row" style="margin-top:8px">
          <button class="primary" data-act="steam-apply-cc">应用区域设置</button>
          <button data-act="steam-clear-cc">清除区域规则</button>
        </div>
        <div class="upi-alert">⚠️ <b>cc 参数仅在未登录状态下生效。</b>登录后 Steam 一律按账户所在国家/地区显示价格，这是官方规则，脚本无法绕过。想看外币价请用无痕窗口或先退出登录。</div>
      </div>`;
  }

  /** Steam 专区：配套开关 */
  function steamToolsHtml() {
    const clean = readSteamClean(draft);
    return `
      <div class="upi-block">
        <div class="upi-head4">③ 配套设置</div>
        <div class="upi-switches">
          <label class="upi-switch">
            <input type="checkbox" id="upi-steam-guard" ${guard.enabled ? 'checked' : ''}>
            <span class="upi-switch-t">🛡️ 语言偏好防护</span>
            <span class="upi-switch-d">拦截 Steam 保存语言的请求，只改本次显示、不改账户设置</span>
          </label>
          <label class="upi-switch">
            <input type="checkbox" data-act="steam-toggle-clean" ${clean.enabled ? 'checked' : ''}>
            <span class="upi-switch-t">🧹 去掉 snr 追踪参数</span>
            <span class="upi-switch-d">Steam 站内链接自带的 <code>?snr=1_5_9__429</code>，分享链接时更干净</span>
          </label>
          <label class="upi-switch">
            <input type="checkbox" id="upi-steam-guard-cookie" ${guard.blockCookie ? 'checked' : ''}>
            <span class="upi-switch-t">🍪 阻止写 steam_language cookie</span>
            <span class="upi-switch-d">防止语言被持久化到本地，关闭浏览器后仍回到原语言</span>
          </label>
        </div>
        <div class="upi-tip2">防护改动即时保存，<b>下次进入 Steam 生效</b>（必须在页面脚本运行前装好拦截器）。</div>
        <div class="upi-row" style="margin-top:10px">
          <button data-act="steam-open-site">打开 Steam 商店验证</button>
          <button data-act="steam-open-community">打开 Steam 社区验证</button>
          <button class="danger" data-act="steam-clear-all">清除全部 Steam 规则</button>
        </div>
      </div>`;
  }

  function steamSectionHtml() {
    return `
      <div class="upi-steam">
        ${steamStatusHtml()}
        ${steamLangHtml()}
        ${steamRegionHtml()}
        ${steamToolsHtml()}
        <div class="upi-block">
          <div class="upi-head4">说明</div>
          <div class="upi-tip">
· 语言参数 <code>l=</code> 由服务端渲染，必须用 <b>early</b>（抢在渲染前跳转）或 <b>reload</b> 模式，专区已自动设为 early
· 语言规则会同时写入 <code>steam_language</code> cookie，通常访问一次即生效
· 首次开启语言后建议顺手打开「语言偏好防护」，避免账户语言被一并改掉
· 本专区的所有设置最终都会落到通用规则里，可在「通用规则」页签查看与微调
</div>
        </div>
      </div>`;
  }

  function presetItemsHtml(gi) {
    const g = PRESETS[gi];
    if (!g) return '';
    return g.items.map((it, ii) =>
      `<option value="${ii}">${esc(it.name)} → ?${esc(it.params.map(p => p.key + '=' + p.value).join('&') || '(仅删除参数)')}</option>`
    ).join('');
  }

  function panelHtml(draft) {
    const tab = currentTab;
    return `
      <div class="upi-box">
        <span class="upi-close" data-act="close">×</span>
        <h3>URL 参数注入器 · 规则配置</h3>
        <div class="upi-sub">当前站点：<code>${esc(win.location.hostname)}${esc(win.location.pathname)}</code></div>
        <div class="upi-tabs">
          <button class="upi-tab ${tab === 'steam' ? 'on' : ''}" data-act="tab" data-tab="steam">🎮 Steam 专区</button>
          <button class="upi-tab ${tab === 'rules' ? 'on' : ''}" data-act="tab" data-tab="rules">📋 通用规则</button>
          <button class="upi-tab ${tab === 'guard' ? 'on' : ''}" data-act="tab" data-tab="guard">🛡️ 高级防护</button>
        </div>
        ${tab === 'steam' ? steamSectionHtml() : ''}
        ${tab === 'guard' ? guardSectionHtml() : ''}
        ${tab === 'rules' ? rulesSectionHtml(draft) : ''}
      </div>`;
  }

  function rulesSectionHtml(draft) {
    return `
      <div>
        <div class="upi-head4">📦 从预设一键添加</div>
        <div class="upi-row">
          <select id="upi-preset-group" style="padding:5px 8px;border-radius:6px;border:1px solid #d0d7de;background:#fff;color:#1f2328">
            ${PRESETS.map((g, gi) => `<option value="${gi}">${esc(g.group)}</option>`).join('')}
          </select>
          <select id="upi-preset-item" style="flex:1;min-width:220px;padding:5px 8px;border-radius:6px;border:1px solid #d0d7de;background:#fff;color:#1f2328">
            ${presetItemsHtml(0)}
          </select>
          <button data-act="add-preset">添加该预设</button>
          <button data-act="add-preset-current">按当前站点套用</button>
        </div>
        <div class="upi-tip" id="upi-preset-note"></div>
        ${guardSectionHtml()}
        <div class="upi-head4">📋 当前规则</div>
        <div id="upi-rules">${draft.map(ruleHtml).join('') || '<div style="color:#6a737d">暂无规则</div>'}</div>
        <div class="upi-foot">
          <button data-act="add-rule">+ 新增规则</button>
          <button data-act="add-current">为当前站点新增</button>
        </div>
        <div class="upi-foot">
          <button class="primary" data-act="save">保存并立即应用</button>
          <button data-act="cancel">取消</button>
          <button data-act="export">导出到文本框</button>
          <button data-act="download">下载 JSON</button>
          <button class="danger" data-act="reset">恢复默认</button>
        </div>
        <textarea id="upi-json" placeholder="在此粘贴规则 JSON 后点「从文本框导入」"></textarea>
        <div class="upi-foot">
          <button data-act="import">从文本框导入</button>
          <input type="file" id="upi-file" accept=".json,application/json">
        </div>
        <div class="upi-tip">提示：本脚本由 AI 辅助编写，使用前请自行验证效果。
· 域名支持通配，如 *.steampowered.com 会匹配 store.、help. 等子域
· 一条规则可填多个域名，逗号分隔：*.steampowered.com, steamcommunity.com
· 注意 Steam 商店与社区是不同域名：商品页在 steampowered.com，社区/市场/创意工坊在 steamcommunity.com
· 路径留空表示全部路径；填 /app/ 则只对该前缀生效
· 三种注入模式：soft 只改地址栏不刷新；reload 刷新一次；early 在页面渲染前抢先跳转
· Steam 的语言/地区必须由服务端渲染，务必选 early 或 reload，选 soft 看不到效果
· Steam 的 cc= 区域参数仅在未登录状态下生效，登录后会被账户地区覆盖
· 值支持动态变量：{ts} 毫秒时间戳、{ts_sec} 秒级、{date} 当天日期、{random} 随机串
· 动态变量在同一次页面访问内固定，不会导致反复跳转
</div>
      </div>`;
  }

  let draft = null;
  let currentTab = 'steam';

  function renderPanel() {
    const root = doc.getElementById(PANEL_ID);
    if (!root) return;
    root.innerHTML = panelHtml(draft);
  }

  function openPanel() {
    ensureStyle();
    closePanel();
    draft = clone(rules);
    syncSteamPending();

    const root = doc.createElement('div');
    root.id = PANEL_ID;
    doc.body.appendChild(root);
    root.innerHTML = panelHtml(draft);

    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);
    root.addEventListener('change', onChange);
  }

  function closePanel() {
    const old = doc.getElementById(PANEL_ID);
    if (old) old.remove();
    draft = null;
  }

  function onClick(e) {
    const btn = e.target.closest('[data-act]');
    if (!btn) {
      if (e.target.id === PANEL_ID) closePanel();
      return;
    }
    const act = btn.getAttribute('data-act');
    const ri = parseInt(btn.getAttribute('data-rule'), 10);
    const pi = parseInt(btn.getAttribute('data-pi'), 10);

    if (act === 'close' || act === 'cancel') return closePanel();

    if (act === 'add-rule') {
      draft.push({ id: uid(), host: '', path: '', enabled: true, overwrite: false, mode: 'soft', reload: false, remove: [], params: [{ key: '', value: '' }] });
      return renderPanel();
    }

    if (act === 'add-current') {
      draft.push({ id: uid(), host: win.location.hostname, path: '', enabled: true, overwrite: false, mode: 'soft', reload: false, remove: [], params: [{ key: '', value: '' }] });
      return renderPanel();
    }

    /* ---------- Steam 专区 ---------- */
    if (act === 'tab') {
      currentTab = btn.getAttribute('data-tab') || 'steam';
      return renderPanel();
    }

    if (act === 'steam-set-lang') {
      const v = btn.getAttribute('data-v');
      const cur = readSteamLang(draft);
      // 再次点击同一语言 = 取消
      steamPendingLang = (cur.value === v && cur.enabled) ? '' : v;
      renderPanel();
      return;
    }

    if (act === 'steam-set-cc') {
      const v = btn.getAttribute('data-v');
      const cur = readSteamCc(draft);
      steamPendingCc = (cur.value === v && cur.enabled) ? '' : v;
      renderPanel();
      return;
    }

    if (act === 'steam-apply-lang') {
      const scope = steamPendingScope;
      const host = STEAM_SCOPE[scope].host;
      const params = steamPendingLang ? [{ key: 'l', value: steamPendingLang }] : [];
      draft = writeSteamRule(draft, STEAM_RULE_LANG, host, params, []);
      commitSteam('界面语言已' + (steamPendingLang ? '设为 ' + steamPendingLang : '清除'));
      return;
    }

    if (act === 'steam-apply-cc') {
      const params = steamPendingCc ? [{ key: 'cc', value: steamPendingCc }] : [];
      draft = writeSteamRule(draft, STEAM_RULE_CC, STEAM_ALL, params, []);
      commitSteam('商店区域已' + (steamPendingCc ? '设为 ' + steamPendingCc : '清除'));
      return;
    }

    if (act === 'steam-clear-lang') {
      draft = writeSteamRule(draft, STEAM_RULE_LANG, '', [], []);
      steamPendingLang = '';
      commitSteam('已清除语言规则');
      return;
    }

    if (act === 'steam-clear-cc') {
      draft = writeSteamRule(draft, STEAM_RULE_CC, '', [], []);
      steamPendingCc = '';
      commitSteam('已清除区域规则');
      return;
    }

    if (act === 'steam-clear-all') {
      draft = draft.filter(r => !r || String(r.id || '').indexOf('steam-') !== 0);
      steamPendingLang = '';
      steamPendingCc = '';
      commitSteam('已清除全部 Steam 规则');
      return;
    }

    if (act === 'steam-toggle-clean') {
      const on = btn.checked;
      draft = writeSteamRule(draft, STEAM_RULE_CLEAN, STEAM_ALL, [], on ? ['snr'] : []);
      commitSteam(on ? '已开启去 snr 追踪' : '已关闭去 snr 追踪');
      return;
    }

    if (act === 'steam-open-site') {
      openUrl('https://store.steampowered.com/');
      return;
    }

    if (act === 'steam-open-community') {
      openUrl('https://steamcommunity.com/');
      return;
    }

    if (act === 'add-preset' || act === 'add-preset-current') {
      const gsel = doc.getElementById('upi-preset-group');
      const isel = doc.getElementById('upi-preset-item');
      if (!gsel || !isel) return;
      const g = PRESETS[parseInt(gsel.value, 10)];
      const it = g && g.items[parseInt(isel.value, 10)];
      if (!it) return toast('请先选择预设');

      // 当前站点若已属于该预设的域名组，则保留整组域名（如 Steam 商店+社区一起生效）
      let host = it.host;
      if (act === 'add-preset-current') {
        host = matchHosts(win.location.hostname, it.host) ? it.host : win.location.hostname;
      }
      draft.push({
        id: uid(),
        host: host,
        path: '',
        enabled: true,
        overwrite: it.overwrite !== false,
        mode: it.mode || 'soft',
        reload: it.mode === 'reload' || it.mode === 'early',
        remove: (it.remove || []).slice(),
        params: (it.params || []).map(p => ({ key: p.key, value: p.value }))
      });
      renderPanel();
      toast('已添加：' + it.name + '（记得点保存）');
      return;
    }

    if (act === 'del-rule') {
      draft.splice(ri, 1);
      return renderPanel();
    }

    if (act === 'add-param') {
      draft[ri].params = draft[ri].params || [];
      draft[ri].params.push({ key: '', value: '' });
      return renderPanel();
    }

    if (act === 'del-param') {
      draft[ri].params.splice(pi, 1);
      return renderPanel();
    }

    if (act === 'save') {
      draft = draft.filter(r => String(r.host || '').trim())
        .map(normalizeRule)
        .filter(Boolean);
      rules = clone(draft);
      saveRules(rules);
      dynCache.clear();
      syncSteamPending();
      applyRules();
      closePanel();
      toast('已保存并应用');
      return;
    }

    if (act === 'export') {
      const ta = doc.getElementById('upi-json');
      if (ta) ta.value = JSON.stringify(draft, null, 2);
      return;
    }

    if (act === 'import') {
      const ta = doc.getElementById('upi-json');
      if (!ta || !ta.value.trim()) return toast('请先粘贴 JSON');
      try {
        const parsed = JSON.parse(ta.value);
        if (!Array.isArray(parsed)) throw new Error('顶层必须是数组');
        draft = parsed;
        renderPanel();
        toast('已载入，确认无误后点「保存并立即应用」');
      } catch (err) {
        toast('JSON 解析失败：' + err.message);
      }
      return;
    }

    if (act === 'download') {
      try {
        const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
        const a = doc.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'upi-rules.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      } catch (err) {
        toast('下载失败：' + err.message);
      }
      return;
    }

    if (act === 'reset') {
      draft = clone(DEFAULT_RULES);
      renderPanel();
      return;
    }
  }

  function onInput(e) {
    const el = e.target;

    // 拦截名单：即时保存
    if (el.id === 'upi-guard-patterns') {
      guard.patterns = el.value.split('\n').map(s => s.trim()).filter(Boolean);
      saveGuard(guard);
      return;
    }

    const field = el.getAttribute('data-field');
    if (!field || !draft) return;
    const ri = parseInt(el.getAttribute('data-rule'), 10);
    if (isNaN(ri) || !draft[ri]) return;

    if (field === 'key' || field === 'value') {
      const pi = parseInt(el.getAttribute('data-pi'), 10);
      if (draft[ri].params && draft[ri].params[pi]) draft[ri].params[pi][field] = el.value;
    } else if (field === 'remove') {
      draft[ri].remove = el.value.split(',').map(s => s.trim()).filter(Boolean);
    } else if (field === 'path' || field === 'host') {
      draft[ri][field] = el.value.trim();
    } else {
      draft[ri][field] = el.value;
    }
  }

  function onChange(e) {
    const el = e.target;

    // 预设分组切换：联动刷新条目列表与说明
    if (el.id === 'upi-preset-group') {
      const isel = doc.getElementById('upi-preset-item');
      if (isel) isel.innerHTML = presetItemsHtml(parseInt(el.value, 10));
      updatePresetNote();
      return;
    }
    if (el.id === 'upi-preset-item') {
      updatePresetNote();
      return;
    }

    // 防护设置：即时保存，不受「保存」按钮影响
    if (el.id === 'upi-guard-enabled' || el.id === 'upi-steam-guard') {
      guard.enabled = el.checked;
      saveGuard(guard);
      if (guard.enabled) installGuards();
      toast('语言偏好防护：' + (guard.enabled ? '已开启' : '已关闭') + '（下次进入站点生效）');
      if (el.id === 'upi-steam-guard') renderPanel();
      return;
    }
    if (el.id === 'upi-guard-mode') {
      guard.mode = (el.value === 'respond') ? 'respond' : 'swallow';
      saveGuard(guard);
      return;
    }
    if (el.id === 'upi-guard-cookie' || el.id === 'upi-steam-guard-cookie') {
      guard.blockCookie = el.checked;
      saveGuard(guard);
      toast('steam_language cookie 防护：' + (guard.blockCookie ? '已开启' : '已关闭'));
      if (el.id === 'upi-steam-guard-cookie') renderPanel();
      return;
    }

    // Steam 范围单选：只更新待应用值，不落盘
    if (el.name === 'upi-steam-scope') {
      steamPendingScope = el.value || 'all';
      renderPanel();
      return;
    }
    if (el.id === 'upi-guard-log') {
      guard.log = el.checked;
      saveGuard(guard);
      return;
    }

    if (!draft) return;

    // 注入模式下拉
    if (el.tagName === 'SELECT') {
      const field = el.getAttribute('data-field');
      const ri = parseInt(el.getAttribute('data-rule'), 10);
      if (!field || isNaN(ri) || !draft[ri]) return;
      draft[ri][field] = el.value;
      draft[ri].reload = (el.value === 'reload' || el.value === 'early');
      return;
    }

    if (el.type !== 'checkbox') return;
    const field = el.getAttribute('data-field');
    const ri = parseInt(el.getAttribute('data-rule'), 10);
    if (!field || isNaN(ri) || !draft[ri]) return;
    draft[ri][field] = el.checked;
    if (field === 'enabled') renderPanel();
  }

  function updatePresetNote() {
    const gsel = doc.getElementById('upi-preset-group');
    const isel = doc.getElementById('upi-preset-item');
    const note = doc.getElementById('upi-preset-note');
    if (!gsel || !isel || !note) return;
    const g = PRESETS[parseInt(gsel.value, 10)];
    const it = g && g.items[parseInt(isel.value, 10)];
    if (!it) { note.textContent = ''; return; }
    const bits = [];
    if (it.note) bits.push('⚠️ ' + it.note);
    bits.push('模式：' + (MODE_TEXT[it.mode] || MODE_TEXT.soft));
    note.textContent = bits.join(' · ');
  }

  function onFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const parsed = JSON.parse(String(fr.result));
        if (!Array.isArray(parsed)) throw new Error('顶层必须是数组');
        draft = parsed;
        renderPanel();
        toast('文件已载入，记得点保存');
      } catch (err) {
        toast('文件解析失败：' + err.message);
      }
    };
    fr.readAsText(f);
  }

  let toastTimer = null;
  function toast(msg) {
    try {
      if (!doc || !doc.body || typeof doc.body.appendChild !== 'function') return;
      let el = doc.getElementById('upi-toast');
      if (!el) {
        el = doc.createElement('div');
        el.id = 'upi-toast';
        el.style.cssText = 'position:fixed;left:50%;bottom:40px;transform:translateX(-50%);z-index:2147483647;' +
          'background:rgba(0,0,0,.82);color:#fff;padding:8px 16px;border-radius:8px;font-size:13px;';
        doc.body.appendChild(el);
      }
      el.textContent = msg;
      el.style.display = 'block';
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { el.style.display = 'none'; }, 2200);
    } catch (e) { /* 页面环境异常时静默降级 */ }
  }

  /* ============================================================
   * 7. 启动
   * ========================================================== */
  function boot() {
    applyRules();
    installHooks();
    installGuards();

    GM_registerMenuCommand('⚙️ 配置 URL 参数规则', openPanel);
    GM_registerMenuCommand('🛡️ 开启 / 关闭语言偏好防护', function () {
      guard.enabled = !guard.enabled;
      saveGuard(guard);
      if (guard.enabled) installGuards();
      toast('语言偏好防护：' + (guard.enabled ? '已开启' : '已关闭') + '（下次进入站点生效）');
    });

    const fileInput = doc.getElementById('upi-file');
    if (fileInput) fileInput.addEventListener('change', onFile);
  }

  function ready(fn) {
    if (doc.body) fn();
    else doc.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  ready(() => {
    boot();
    // 面板里的文件选择框是动态渲染的，用事件委托兜底
    doc.addEventListener('change', (e) => {
      if (e.target && e.target.id === 'upi-file') onFile(e);
    });
  });

  // document-start 阶段先跑一次，SPA 场景靠 hooks 兜底
  applyRules();

  // 防护必须在页面脚本发出请求前装好，所以不等 DOMContentLoaded
  installGuards();
})();
