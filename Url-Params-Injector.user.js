// ==UserScript==
// @name         URL 参数注入器（可视化配置版）
// @namespace    https://github.com/saiyajiang/Url-Params-Injector
// @version      1.1.0
// @description  本脚本由 AI 辅助编写。为指定域名自动追加 / 覆盖 / 删除 URL 查询参数，自带可视化配置面板，支持通配域名、动态变量、规则导入导出
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
   * 1. 配置读写
   * ========================================================== */
  let rules = loadRules();

  function loadRules() {
    try {
      const raw = GM_getValue(STORE_KEY, null);
      if (!raw) return clone(DEFAULT_RULES);
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('[UPI] 配置解析失败，回退到默认规则', e);
      return clone(DEFAULT_RULES);
    }
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
   * 2. 域名匹配（支持 *.example.com 通配）
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

    for (const rule of rules) {
      if (!rule || rule.enabled === false) continue;
      if (!matchHost(url.hostname, rule.host)) continue;

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

      if (rule.reload) needReload = true;
    }

    if (!changed) return;

    applying = true;
    try {
      if (needReload) {
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
@media (prefers-color-scheme: dark) {
  #${PANEL_ID} .upi-box { background: #22272e; color: #e6edf3; }
  #${PANEL_ID} .upi-rule { background: #2a3038; border-color: #444c56; }
  #${PANEL_ID} input[type=text], #${PANEL_ID} textarea { background: #22272e; color: #e6edf3; border-color: #444c56; }
  #${PANEL_ID} button { background: #2f353d; color: #e6edf3; border-color: #444c56; }
  #${PANEL_ID} button:hover { background: #3a4149; }
  #${PANEL_ID} code { background: #2f353d; }
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
          <input type="text" style="flex:1;min-width:220px" placeholder="example.com 或 *.example.com" value="${esc(r.host)}" data-rule="${i}" data-field="host">
          <label class="chk"><input type="checkbox" data-rule="${i}" data-field="enabled" ${r.enabled === false ? '' : 'checked'}>启用</label>
          <button class="danger" data-act="del-rule" data-rule="${i}">删除规则</button>
        </div>
        <div class="upi-row" style="margin-top:8px">
          <label class="chk"><input type="checkbox" data-rule="${i}" data-field="overwrite" ${r.overwrite ? 'checked' : ''}>覆盖已有同名参数</label>
          <label class="chk"><input type="checkbox" data-rule="${i}" data-field="reload" ${r.reload ? 'checked' : ''}>写入后强制刷新页面</label>
        </div>
        <div class="upi-head4">要添加的参数</div>
        ${params || '<div style="color:#6a737d">（暂无，点击下方按钮添加）</div>'}
        <button style="margin-top:6px" data-act="add-param" data-rule="${i}">+ 添加参数</button>
        <div class="upi-head4">要删除的参数（逗号分隔，可留空）</div>
        <input type="text" style="width:100%;box-sizing:border-box" placeholder="utm_source,utm_medium" value="${esc((r.remove || []).join(','))}" data-rule="${i}" data-field="remove">
      </div>`;
  }

  function panelHtml(draft) {
    return `
      <div class="upi-box">
        <span class="upi-close" data-act="close">×</span>
        <h3>URL 参数注入器 · 规则配置</h3>
        <div class="upi-sub">当前站点：<code>${esc(win.location.hostname)}</code></div>
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
· 域名支持通配，如 *.example.com 会匹配 a.example.com 与 example.com
· 值支持动态变量：{ts} 毫秒时间戳、{ts_sec} 秒级、{date} 当天日期、{random} 随机串
· 动态变量在同一次页面访问内固定，不会导致反复跳转
· 「写入后强制刷新」用于参数需要被服务端读取的场景；否则只改地址栏，不刷新
</div>
      </div>`;
  }

  let draft = null;

  function renderPanel() {
    const root = doc.getElementById(PANEL_ID);
    if (!root) return;
    root.innerHTML = panelHtml(draft);
  }

  function openPanel() {
    ensureStyle();
    closePanel();
    draft = clone(rules);

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
      draft.push({ id: uid(), host: '', enabled: true, overwrite: false, reload: false, remove: [], params: [{ key: '', value: '' }] });
      return renderPanel();
    }

    if (act === 'add-current') {
      draft.push({ id: uid(), host: win.location.hostname, enabled: true, overwrite: false, reload: false, remove: [], params: [{ key: '', value: '' }] });
      return renderPanel();
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
        .map(r => ({
          id: r.id || uid(),
          host: String(r.host).trim(),
          enabled: r.enabled !== false,
          overwrite: !!r.overwrite,
          reload: !!r.reload,
          remove: (r.remove || []).map(s => String(s).trim()).filter(Boolean),
          params: (r.params || []).filter(p => p && String(p.key || '').trim())
            .map(p => ({ key: String(p.key).trim(), value: String(p.value == null ? '' : p.value) }))
        }));
      rules = clone(draft);
      saveRules(rules);
      dynCache.clear();
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
    const field = el.getAttribute('data-field');
    if (!field || !draft) return;
    const ri = parseInt(el.getAttribute('data-rule'), 10);
    if (isNaN(ri) || !draft[ri]) return;

    if (field === 'key' || field === 'value') {
      const pi = parseInt(el.getAttribute('data-pi'), 10);
      if (draft[ri].params && draft[ri].params[pi]) draft[ri].params[pi][field] = el.value;
    } else if (field === 'remove') {
      draft[ri].remove = el.value.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      draft[ri][field] = el.value;
    }
  }

  function onChange(e) {
    const el = e.target;
    if (el.type !== 'checkbox' || !draft) return;
    const field = el.getAttribute('data-field');
    const ri = parseInt(el.getAttribute('data-rule'), 10);
    if (!field || isNaN(ri) || !draft[ri]) return;
    draft[ri][field] = el.checked;
    if (field === 'enabled') renderPanel();
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
  }

  /* ============================================================
   * 7. 启动
   * ========================================================== */
  function boot() {
    applyRules();
    installHooks();

    GM_registerMenuCommand('⚙️ 配置 URL 参数规则', openPanel);

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
})();
