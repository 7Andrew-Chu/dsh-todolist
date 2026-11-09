/**
 * Client half of the Todo List bundle (dsh-todolist).
 *
 * Registers a floating glass to-do card into `shell.overlay` (a frame-wide,
 * click-through layer). The card can be dragged anywhere on the page and
 * folded away behind a small launcher. All state is plugin-owned and kept in
 * localStorage; no session data is read or written.
 *
 * The composer at the bottom is a three-part bar: task input, a searchable
 * category dropdown (which can create a category in place), and the confirm
 * button. Deleting a row files it under Cancelled; deleting it there removes
 * it for good.
 */
window.__ModuleLoader__.load({
  id: 'dsh-todolist',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useEffect, useRef, useState } = React;

    const NS = 'dsh-todolist';
    const STORAGE_KEY = 'dsh.todo-widget.v1';
    const POSITION_KEY = 'dsh.todolist.position.v1';
    const HIDDEN_KEY = 'dsh.todolist.hidden.v1';
    const SIZE_KEY = 'dsh.todolist.size.v1';

    const EN = {
      'title': 'Todo List',
      'tab.todo': 'To-do',
      'tab.pending': 'Pending',
      'tab.completed': 'Completed',
      'tab.cancelled': 'Cancelled',
      'placeholder': 'Add new todo',
      'add': 'Add todo',
      'category': 'Category',
      'searchCategory': 'Search categories',
      'newCategory': 'New category',
      'categoryName': 'Category name',
      'create': 'Create',
      'cancel': 'Cancel',
      'noCategoryMatch': 'No matching category',
      'noCategories': 'No categories yet',
      'delete': 'Move to cancelled',
      'deleteForever': 'Delete permanently',
      'toggle': 'Toggle completion',
      'collapse': 'Collapse group',
      'empty.todo': 'Nothing to do',
      'empty.pending': 'Nothing pending',
      'empty.completed': 'Nothing completed',
      'empty.cancelled': 'Nothing cancelled',
      'emptyGroup': 'Nothing here yet',
      'drag': 'Press and hold to drag',
      'hide': 'Hide',
      'show': 'Show todo list',
      'mode.minimal': 'Minimal',
      'mode.matrix': 'Quadrants',
      'quadrant.q1': 'DO',
      'quadrant.q2': 'PLAN',
      'quadrant.q3': 'DELEGATE',
      'quadrant.q4': 'DROP',
      'quadrant.empty': 'No tasks',
      'quadrant.addTo': 'Add to',
      'quadrant.pick.q1': 'Q1 · DO',
      'quadrant.pick.q2': 'Q2 · PLAN',
      'quadrant.pick.q3': 'Q3 · DELEGATE',
      'quadrant.pick.q4': 'Q4 · DROP',
    };

    const ZH = {
      'title': '待办',
      'tab.todo': '待办',
      'tab.pending': '进行中',
      'tab.completed': '已完成',
      'tab.cancelled': '已消失',
      'placeholder': '添加新待办',
      'add': '添加待办',
      'category': '分类',
      'searchCategory': '搜索分类',
      'newCategory': '新建分类',
      'categoryName': '分类名称',
      'create': '创建',
      'cancel': '取消',
      'noCategoryMatch': '没有匹配的分类',
      'noCategories': '暂无分类',
      'delete': '移到已消失',
      'deleteForever': '彻底删除',
      'toggle': '切换完成状态',
      'collapse': '折叠分组',
      'empty.todo': '暂无待办',
      'empty.pending': '暂无进行中的事项',
      'empty.completed': '暂无已完成事项',
      'empty.cancelled': '暂无已消失的事项',
      'emptyGroup': '暂无待办',
      'drag': '长按拖动',
      'hide': '隐藏',
      'show': '显示待办清单',
      'mode.minimal': '极简',
      'mode.matrix': '四象限',
      'quadrant.q1': 'DO',
      'quadrant.q2': 'PLAN',
      'quadrant.q3': 'DELEGATE',
      'quadrant.q4': 'DROP',
      'quadrant.empty': '暂无任务',
      'quadrant.addTo': '添加到',
      'quadrant.pick.q1': 'Q1 · DO',
      'quadrant.pick.q2': 'Q2 · PLAN',
      'quadrant.pick.q3': 'Q3 · DELEGATE',
      'quadrant.pick.q4': 'Q4 · DROP',
    };

    const TABS = ['todo', 'pending', 'completed', 'cancelled'];
    const HOLD_MS = 80;
    const MODE_KEY = 'dsh.todolist.mode.v1';
    const QUADRANTS = [
      { id: 'q1', label: 'quadrant.q1' },
      { id: 'q2', label: 'quadrant.q2' },
      { id: 'q3', label: 'quadrant.q3' },
      { id: 'q4', label: 'quadrant.q4' },
    ];
    const QUADRANT_IDS = QUADRANTS.map((quadrant) => quadrant.id);
    const TAB_LABEL = {
      todo: 'tab.todo',
      pending: 'tab.pending',
      completed: 'tab.completed',
      cancelled: 'tab.cancelled',
    };

    const CSS = `
.dsh-todo-card{
  --todo-fg:var(--dsw-alias-label-primary,#3a3a3c);
  --todo-muted:var(--dsw-alias-label-secondary,#8b8b90);
  --todo-accent:#f3e2a6;
  --todo-accent-ink:#5a5136;
  --todo-hover:color-mix(in srgb, var(--dsw-alias-label-primary,#000000) 6%, transparent);
  pointer-events:auto;
  position:fixed;
  right:24px;
  top:50%;
  translate:0 -50%;
  width:340px;
  max-height:min(560px, calc(100vh - 96px));
  display:flex;
  flex-direction:column;
  padding:14px 14px 10px;
  border-radius:22px;
  font-family:-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  font-size:13px;
  line-height:1.45;
  color:var(--todo-fg);
  -webkit-font-smoothing:antialiased;
  background:linear-gradient(165deg,
    color-mix(in srgb, var(--dsw-alias-bg-layer-1,#ffffff) 46%, transparent),
    color-mix(in srgb, var(--dsw-alias-bg-layer-1,#ffffff) 22%, transparent));
  -webkit-backdrop-filter:blur(24px) saturate(180%);
  backdrop-filter:blur(24px) saturate(180%);
  border:1px solid color-mix(in srgb, #ffffff 58%, transparent);
  box-shadow:
    0 24px 56px -16px rgba(18,18,22,.20),
    0 2px 8px rgba(18,18,22,.05),
    inset 0 1px 0 rgba(255,255,255,.62),
    inset 0 0 24px rgba(255,255,255,.12);
  animation:dsh-todo-in .34s cubic-bezier(.22,.75,.3,1) both;
}
.dsh-todo-card *{box-sizing:border-box;}
.dsh-todo-card button{font:inherit;color:inherit;border:0;background:none;padding:0;cursor:pointer;}
.dsh-todo-card button:focus-visible,
.dsh-todo-card input:focus-visible{outline:2px solid color-mix(in srgb, var(--todo-accent) 85%, #b9a45c);outline-offset:2px;}
.dsh-todo-head{position:relative;display:flex;align-items:center;justify-content:center;min-height:16px;padding:2px 0 10px;}
.dsh-todo-date{font-size:11px;letter-spacing:.02em;color:var(--todo-muted);}
.dsh-todo-head{cursor:grab;touch-action:none;user-select:none;}
.dsh-todo-head:active{cursor:grabbing;}
.dsh-todo-hide{position:absolute;left:0;top:0;width:18px;height:18px;border-radius:6px;display:grid;place-items:center;font-size:14px;line-height:1;color:var(--todo-muted);transition:background-color .16s ease,color .16s ease;}
.dsh-todo-hide:hover{background:var(--todo-hover);color:var(--todo-fg);}
.dsh-todo-card.is-positioned{right:auto;translate:none;}
.dsh-todo-card.is-dragging{animation:none;cursor:grabbing;}
.dsh-todo-card.is-matrix{height:min(560px, calc(100vh - 96px));}
.dsh-todo-mode{position:absolute;right:0;top:-1px;display:flex;width:58px;height:20px;padding:2px;border-radius:7px;background:color-mix(in srgb, var(--dsw-alias-label-primary,#000000) 6%, transparent);}
.dsh-todo-mode-pill{position:absolute;top:2px;bottom:2px;left:2px;width:calc((100% - 4px) / 2);border-radius:5px;background:var(--todo-accent);box-shadow:0 1px 2px rgba(90,81,54,.16);transition:transform .24s cubic-bezier(.34,1.1,.4,1);}
.dsh-todo-mode-pill.is-right{transform:translateX(100%);}
.dsh-todo-mode-btn{position:relative;z-index:1;flex:1 1 0;display:grid;place-items:center;border-radius:5px;color:var(--todo-muted);transition:color .18s ease;}
.dsh-todo-mode-btn.is-active{color:var(--todo-accent-ink);}
.dsh-todo-mode-btn svg{width:12px;height:12px;}
.dsh-todo-tabs{position:relative;display:flex;padding:3px;border-radius:11px;background:color-mix(in srgb, var(--dsw-alias-label-primary,#000000) 6%, transparent);}
.dsh-todo-pill{position:absolute;top:3px;bottom:3px;left:3px;width:calc((100% - 6px) / 4);border-radius:8px;background:var(--todo-accent);box-shadow:0 1px 2px rgba(90,81,54,.16);transition:transform .32s cubic-bezier(.34,1.1,.4,1);}
.dsh-todo-tab{position:relative;z-index:1;flex:1 1 0;padding:4px 0 5px;border-radius:8px;font-size:11.5px;letter-spacing:.01em;color:var(--todo-muted);transition:color .2s ease;}
.dsh-todo-tab.is-active{color:var(--todo-accent-ink);font-weight:600;}
.dsh-todo-list{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;margin:10px -4px 0;padding:0 4px 2px;display:flex;flex-direction:column;gap:12px;scrollbar-width:thin;scrollbar-color:rgba(120,120,128,.24) transparent;}
.dsh-todo-list::-webkit-scrollbar{width:6px;}
.dsh-todo-list::-webkit-scrollbar-thumb{background:rgba(120,120,128,.22);border-radius:3px;}
.dsh-todo-list::-webkit-scrollbar-track{background:transparent;}
.dsh-todo-group{display:flex;flex-direction:column;gap:2px;}
.dsh-todo-group-head{display:flex;align-items:center;gap:6px;padding:2px 4px 3px;border-radius:8px;font-size:11px;letter-spacing:.04em;color:var(--todo-muted);transition:color .16s ease;}
.dsh-todo-group-head:hover{color:var(--todo-fg);}
.dsh-todo-chevron{display:inline-flex;transition:transform .22s ease;}
.dsh-todo-chevron.is-collapsed{transform:rotate(-90deg);}
.dsh-todo-count{margin-left:auto;font-size:10.5px;font-variant-numeric:tabular-nums;opacity:.65;}
.dsh-todo-group-empty{padding:2px 8px 4px 22px;font-size:10.5px;color:var(--todo-muted);opacity:.7;}
.dsh-todo-row{display:flex;align-items:center;gap:9px;min-height:30px;padding:4px 8px 4px 7px;border-radius:10px;transition:background-color .16s ease;}
.dsh-todo-row:hover{background:var(--todo-hover);}
.dsh-todo-check{flex:0 0 auto;width:17px;height:17px;border-radius:5px;border:1px solid color-mix(in srgb, var(--todo-accent) 82%, #b49c55);background:color-mix(in srgb, var(--todo-accent) 56%, transparent);display:grid;place-items:center;transition:background-color .18s ease, border-color .18s ease, transform .12s ease;}
.dsh-todo-check:hover{background:color-mix(in srgb, var(--todo-accent) 88%, transparent);border-color:var(--todo-accent);}
.dsh-todo-check:active{transform:scale(.9);}
.dsh-todo-check.is-done{background:var(--todo-accent);border-color:color-mix(in srgb, var(--todo-accent) 90%, #cbb56f);}
.dsh-todo-check svg{display:block;width:11px;height:11px;}
.dsh-todo-text{flex:1 1 auto;min-width:0;font-size:12.5px;overflow-wrap:anywhere;}
.dsh-todo-row.is-done .dsh-todo-text{color:var(--todo-muted);text-decoration:line-through;text-decoration-thickness:1px;}
.dsh-todo-del{flex:0 0 auto;width:18px;height:18px;border-radius:6px;display:grid;place-items:center;font-size:15px;line-height:1;color:var(--todo-muted);opacity:0;transition:opacity .16s ease, background-color .16s ease, color .16s ease;}
.dsh-todo-row:hover .dsh-todo-del,
.dsh-todo-del:focus-visible{opacity:1;}
.dsh-todo-del:hover{background:color-mix(in srgb, var(--dsw-alias-label-primary,#000000) 8%, transparent);color:var(--todo-fg);}
.dsh-todo-empty{padding:26px 0 22px;text-align:center;font-size:11.5px;color:var(--todo-muted);}
.dsh-todo-composer{position:relative;flex:0 0 auto;}
.dsh-todo-foot{display:flex;align-items:center;gap:5px;margin-top:10px;padding-top:7px;border-top:1px solid color-mix(in srgb, var(--dsw-alias-label-primary,#000000) 8%, transparent);}
.dsh-todo-input{flex:1 1 auto;min-width:0;border:0;outline:0;background:transparent;font:inherit;font-size:12.5px;color:var(--todo-fg);padding:6px 4px;}
.dsh-todo-input::placeholder{color:color-mix(in srgb, var(--dsw-alias-label-secondary,#8b8b90) 78%, transparent);}
.dsh-todo-select{display:flex;align-items:center;gap:2px;flex:0 1 auto;max-width:104px;padding:3px 5px 3px 8px;border-radius:8px;font-size:11.5px;color:var(--todo-fg);background:color-mix(in srgb, var(--dsw-alias-label-primary,#000000) 5%, transparent);transition:background-color .16s ease;}
.dsh-todo-select:hover{background:color-mix(in srgb, var(--dsw-alias-label-primary,#000000) 9%, transparent);}
.dsh-todo-select.is-open{background:color-mix(in srgb, var(--todo-accent) 55%, transparent);color:var(--todo-accent-ink);}
.dsh-todo-select-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dsh-todo-select-caret{display:inline-flex;flex:0 0 auto;opacity:.7;transition:transform .2s ease;}
.dsh-todo-select.is-open .dsh-todo-select-caret{transform:rotate(180deg);}
.dsh-todo-menu{position:absolute;left:0;right:0;bottom:calc(100% + 6px);z-index:4;display:flex;flex-direction:column;max-height:238px;padding:8px;border-radius:14px;
  background:linear-gradient(165deg,
    color-mix(in srgb, var(--dsw-alias-bg-layer-1,#ffffff) 80%, transparent),
    color-mix(in srgb, var(--dsw-alias-bg-layer-1,#ffffff) 58%, transparent));
  -webkit-backdrop-filter:blur(20px) saturate(175%);
  backdrop-filter:blur(20px) saturate(175%);
  border:1px solid color-mix(in srgb, #ffffff 55%, transparent);
  box-shadow:0 18px 40px -14px rgba(18,18,22,.24), inset 0 1px 0 rgba(255,255,255,.6);
  animation:dsh-todo-menu-in .16s ease both;
}
.dsh-todo-search{width:100%;border:0;outline:0;background:color-mix(in srgb, var(--dsw-alias-label-primary,#000000) 5%, transparent);border-radius:8px;padding:5px 8px;margin-bottom:6px;font:inherit;font-size:11.5px;color:var(--todo-fg);}
.dsh-todo-search::placeholder{color:color-mix(in srgb, var(--dsw-alias-label-secondary,#8b8b90) 80%, transparent);}
.dsh-todo-options{display:flex;flex-direction:column;gap:1px;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding-right:2px;scrollbar-width:thin;scrollbar-color:rgba(120,120,128,.24) transparent;}
.dsh-todo-options::-webkit-scrollbar{width:5px;}
.dsh-todo-options::-webkit-scrollbar-thumb{background:rgba(120,120,128,.22);border-radius:3px;}
.dsh-todo-option{display:flex;align-items:center;gap:7px;width:100%;padding:6px 8px;border-radius:8px;font-size:12px;text-align:left;color:var(--todo-fg);transition:background-color .14s ease;}
.dsh-todo-option:hover{background:var(--todo-hover);}
.dsh-todo-option.is-selected{background:color-mix(in srgb, var(--todo-accent) 42%, transparent);color:var(--todo-accent-ink);font-weight:600;}
.dsh-todo-option-dot{flex:0 0 auto;width:5px;height:5px;border-radius:50%;background:currentColor;opacity:.45;}
.dsh-todo-option-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dsh-todo-menu-empty{padding:10px 6px;font-size:11px;color:var(--todo-muted);text-align:center;}
.dsh-todo-newcat{display:flex;align-items:center;gap:5px;width:100%;margin-top:6px;padding:7px 8px 2px;border-top:1px solid color-mix(in srgb, var(--dsw-alias-label-primary,#000000) 9%, transparent);font-size:11.5px;color:var(--todo-muted);text-align:left;transition:color .14s ease;}
.dsh-todo-newcat:hover{color:var(--todo-fg);}
.dsh-todo-create{display:flex;align-items:center;gap:5px;margin-top:6px;padding-top:7px;border-top:1px solid color-mix(in srgb, var(--dsw-alias-label-primary,#000000) 9%, transparent);}
.dsh-todo-create input{flex:1 1 auto;min-width:0;border:0;outline:0;background:color-mix(in srgb, var(--dsw-alias-label-primary,#000000) 5%, transparent);border-radius:8px;padding:5px 8px;font:inherit;font-size:11.5px;color:var(--todo-fg);}
.dsh-todo-create input::placeholder{color:color-mix(in srgb, var(--dsw-alias-label-secondary,#8b8b90) 80%, transparent);}
.dsh-todo-create-ok{flex:0 0 auto;width:24px;height:24px;border-radius:7px;display:grid;place-items:center;background:var(--todo-accent);color:var(--todo-accent-ink);font-size:14px;line-height:1;transition:opacity .16s ease, transform .12s ease;}
.dsh-todo-create-ok:active{transform:scale(.92);}
.dsh-todo-create-ok:disabled{opacity:.35;cursor:default;transform:none;}
.dsh-todo-create-cancel{flex:0 0 auto;padding:3px 6px;border-radius:6px;font-size:10.5px;color:var(--todo-muted);}
.dsh-todo-create-cancel:hover{background:var(--todo-hover);color:var(--todo-fg);}
.dsh-todo-add{flex:0 0 auto;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:16px;line-height:1;background:var(--todo-accent);color:var(--todo-accent-ink);opacity:.6;transition:opacity .18s ease, transform .12s ease;}
.dsh-todo-add:hover{opacity:1;}
.dsh-todo-add:active{transform:scale(.92);}
.dsh-todo-add:disabled{opacity:.32;cursor:default;transform:none;}
.dsh-todo-matrix{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:6px;margin:10px -4px 0;padding:0 4px 2px;}
.dsh-todo-quadrant{position:relative;display:flex;flex-direction:column;min-height:0;border-radius:10px;border:1px solid color-mix(in srgb, var(--dsw-alias-label-primary,#000000) 8%, transparent);background:color-mix(in srgb, var(--dsw-alias-label-primary,#000000) 2.5%, transparent);overflow:hidden;transition:border-color .16s ease, background-color .16s ease;}
.dsh-todo-quadrant.is-active{border-color:color-mix(in srgb, var(--todo-accent) 92%, #b49c55);}
.dsh-todo-quadrant.is-over{border-color:var(--todo-accent);background:color-mix(in srgb, var(--todo-accent) 20%, transparent);}
.dsh-todo-quadrant-label{position:absolute;z-index:1;max-width:calc(100% - 8px);padding:0 2px;border-radius:4px;font-size:8.5px;line-height:1.25;letter-spacing:.02em;color:var(--todo-muted);opacity:.45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:opacity .16s ease;}
.dsh-todo-quadrant-label:hover{opacity:.9;}
.dsh-todo-quadrant--q1 .dsh-todo-quadrant-label{right:5px;bottom:4px;}
.dsh-todo-quadrant--q2 .dsh-todo-quadrant-label{left:5px;bottom:4px;}
.dsh-todo-quadrant--q3 .dsh-todo-quadrant-label{right:5px;top:4px;}
.dsh-todo-quadrant--q4 .dsh-todo-quadrant-label{left:5px;top:4px;}
.dsh-todo-quadrant-body{flex:1 1 auto;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:1px;scrollbar-width:thin;scrollbar-color:rgba(120,120,128,.24) transparent;}
.dsh-todo-quadrant-body::-webkit-scrollbar{width:5px;}
.dsh-todo-quadrant-body::-webkit-scrollbar-thumb{background:rgba(120,120,128,.22);border-radius:3px;}
.dsh-todo-quadrant--q1 .dsh-todo-quadrant-body{padding:5px 5px 16px;}
.dsh-todo-quadrant--q2 .dsh-todo-quadrant-body{padding:5px 5px 16px;}
.dsh-todo-quadrant--q3 .dsh-todo-quadrant-body{padding:16px 5px 5px;}
.dsh-todo-quadrant--q4 .dsh-todo-quadrant-body{padding:16px 5px 5px;}
.dsh-todo-row.is-compact{min-height:24px;gap:6px;padding:2px 3px;border-radius:7px;cursor:grab;user-select:none;}
.dsh-todo-row.is-compact:active{cursor:grabbing;}
.dsh-todo-row.is-compact .dsh-todo-check{width:14px;height:14px;border-radius:4px;}
.dsh-todo-row.is-compact .dsh-todo-check svg{width:9px;height:9px;}
.dsh-todo-row.is-compact .dsh-todo-text{font-size:11px;line-height:1.35;}
.dsh-todo-row.is-compact .dsh-todo-del{width:16px;height:16px;font-size:13px;opacity:.55;}
.dsh-todo-row.is-compact:hover .dsh-todo-del{opacity:1;}
.dsh-todo-row.is-done{opacity:.55;}
.dsh-todo-resize{position:absolute;z-index:7;touch-action:none;}
.dsh-todo-resize--n{top:-3px;left:12px;right:12px;height:7px;cursor:ns-resize;}
.dsh-todo-resize--s{bottom:-3px;left:12px;right:12px;height:7px;cursor:ns-resize;}
.dsh-todo-resize--e{right:-3px;top:12px;bottom:12px;width:7px;cursor:ew-resize;}
.dsh-todo-resize--w{left:-3px;top:12px;bottom:12px;width:7px;cursor:ew-resize;}
.dsh-todo-resize--ne{top:-4px;right:-4px;width:14px;height:14px;cursor:nesw-resize;}
.dsh-todo-resize--nw{top:-4px;left:-4px;width:14px;height:14px;cursor:nwse-resize;}
.dsh-todo-resize--se{bottom:-4px;right:-4px;width:14px;height:14px;cursor:nwse-resize;}
.dsh-todo-resize--sw{bottom:-4px;left:-4px;width:14px;height:14px;cursor:nesw-resize;}
.dsh-todo-launcher{
  --todo-accent:#f3e2a6;
  --todo-accent-ink:#5a5136;
  pointer-events:auto;position:fixed;right:24px;top:50%;translate:0 -50%;z-index:4;
  width:36px;height:36px;border-radius:12px;display:grid;place-items:center;padding:0;
  font:inherit;border:0;cursor:grab;touch-action:none;user-select:none;
  background:color-mix(in srgb, var(--todo-accent) 88%, transparent);
  border:1px solid color-mix(in srgb, #ffffff 55%, transparent);
  box-shadow:0 12px 28px -10px rgba(18,18,22,.28), inset 0 1px 0 rgba(255,255,255,.6);
  -webkit-backdrop-filter:blur(18px) saturate(170%);
  backdrop-filter:blur(18px) saturate(170%);
  animation:dsh-todo-in .24s ease both;
  transition:transform .12s ease, box-shadow .16s ease;
}
.dsh-todo-launcher:hover{box-shadow:0 16px 34px -10px rgba(18,18,22,.34), inset 0 1px 0 rgba(255,255,255,.7);}
.dsh-todo-launcher:active{transform:scale(.94);}
.dsh-todo-launcher.is-positioned{right:auto;translate:none;}
.dsh-todo-launcher.is-dragging{cursor:grabbing;}
.dsh-todo-launcher.is-dragging:active{transform:none;}
.dsh-todo-launcher svg{width:15px;height:15px;}
@keyframes dsh-todo-in{from{opacity:0;transform:translateY(10px) scale(.985);}to{opacity:1;transform:none;}}
@keyframes dsh-todo-menu-in{from{opacity:0;transform:translateY(5px);}to{opacity:1;transform:none;}}
@media (max-width:760px){
  .dsh-todo-card{right:12px;width:min(340px, calc(100vw - 24px));}
}
@media (prefers-reduced-motion:reduce){
  .dsh-todo-card,.dsh-todo-menu{animation:none;}
  .dsh-todo-pill,.dsh-todo-del,.dsh-todo-check,.dsh-todo-chevron,.dsh-todo-row,.dsh-todo-add,.dsh-todo-tab,.dsh-todo-select,.dsh-todo-select-caret{transition:none;}
}
`;

    function newId(prefix) {
      return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }

    function defaultGroups() {
      return [
        { id: 'work', title: 'work' },
        { id: 'life', title: 'life' },
        { id: 'study', title: 'study' },
        { id: 'other', title: '其他' },
      ];
    }

    function defaultStore() {
      return {
        version: 1,
        groups: defaultGroups(),
        // Every install starts with empty lists; nothing personal ships here.
        items: [],
      };
    }

    /** Keeps data written by an older widget version readable, and always
     *  exposes every current category (notably 其他) to the composer menu. */
    function normalizeStore(parsed) {
      const groups = [];
      if (parsed && Array.isArray(parsed.groups)) {
        for (const group of parsed.groups) {
          if (!group || typeof group.id !== 'string') continue;
          if (groups.some((existing) => existing.id === group.id)) continue;
          groups.push({ id: group.id, title: typeof group.title === 'string' && group.title ? group.title : group.id });
        }
      }
      for (const group of defaultGroups()) {
        if (!groups.some((existing) => existing.id === group.id)) groups.push(group);
      }
      const known = groups.map((group) => group.id);
      const items = [];
      if (parsed && Array.isArray(parsed.items)) {
        for (const item of parsed.items) {
          if (!item || typeof item.id !== 'string' || typeof item.text !== 'string') continue;
          items.push({
            id: item.id,
            group: known.indexOf(item.group) >= 0 ? item.group : 'other',
            board: item.board === 'matrix' ? 'matrix' : 'list',
            text: item.text,
            status: TABS.indexOf(item.status) >= 0 ? item.status : 'todo',
            quadrant: QUADRANT_IDS.indexOf(item.quadrant) >= 0 ? item.quadrant : 'q1',
          });
        }
      }
      return { version: 1, groups, items };
    }

    function loadStore() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) return normalizeStore(JSON.parse(raw));
      } catch (error) {
        /* Unreadable or corrupt storage falls back to the seeded lists. */
      }
      return normalizeStore(defaultStore());
    }

    function loadMode() {
      try {
        const raw = window.localStorage.getItem(MODE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            mode: parsed && parsed.mode === 'matrix' ? 'matrix' : 'minimal',
            activeQuadrant:
              parsed && QUADRANT_IDS.indexOf(parsed.activeQuadrant) >= 0
                ? parsed.activeQuadrant
                : 'q1',
          };
        }
      } catch (error) {
        /* an unreadable preference just falls back to the minimal view */
      }
      return { mode: 'minimal', activeQuadrant: 'q1' };
    }

    function loadPosition() {
      try {
        const raw = window.localStorage.getItem(POSITION_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
            return { x: parsed.x, y: parsed.y };
          }
        }
      } catch (error) {
        /* an unreadable saved position just falls back to the default seat */
      }
      return null;
    }

    function loadHidden() {
      try {
        return window.localStorage.getItem(HIDDEN_KEY) === '1';
      } catch (error) {
        return false;
      }
    }

    function loadSize() {
      try {
        const raw = window.localStorage.getItem(SIZE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Number.isFinite(parsed.w) && Number.isFinite(parsed.h)) {
            return { w: Math.round(parsed.w), h: Math.round(parsed.h) };
          }
        }
      } catch (error) {
        /* an unreadable size just falls back to the default width */
      }
      return null;
    }

    function clampToViewport(point, element, fallbackWidth, fallbackHeight) {
      const width = element ? element.offsetWidth : fallbackWidth;
      const height = element ? element.offsetHeight : fallbackHeight;
      const maxX = Math.max(8, window.innerWidth - width - 8);
      const maxY = Math.max(8, window.innerHeight - height - 8);
      return { x: Math.min(Math.max(8, point.x), maxX), y: Math.min(Math.max(8, point.y), maxY) };
    }

    function activeLocaleId(ctx) {
      try {
        const snapshot = ctx.locale.getLocale();
        return snapshot && typeof snapshot.active === 'string' ? snapshot.active : 'en';
      } catch (error) {
        return 'en';
      }
    }

    function formatToday(localeId) {
      const options = { weekday: 'long', month: 'long', day: 'numeric' };
      try {
        return new Intl.DateTimeFormat(localeId, options).format(new Date());
      } catch (error) {
        return new Intl.DateTimeFormat('en-US', options).format(new Date());
      }
    }

    function groupChevron() {
      return h(
        'svg',
        { viewBox: '0 0 10 10', width: 8, height: 8, 'aria-hidden': true },
        h('path', {
          d: 'M1.6 3.2 L5 6.7 L8.4 3.2',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      );
    }

    function caret() {
      return h(
        'svg',
        { viewBox: '0 0 10 6', width: 8, height: 5, 'aria-hidden': true },
        h('path', {
          d: 'M1 1.4 L5 4.7 L9 1.4',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.3,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      );
    }

    function checkMark() {
      return h(
        'svg',
        { viewBox: '0 0 10 10', 'aria-hidden': true },
        h('path', {
          d: 'M1.8 5.2 L4.1 7.5 L8.2 2.8',
          fill: 'none',
          stroke: 'var(--todo-accent-ink, #5a5136)',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      );
    }

    function listIcon() {
      return h(
        'svg',
        { viewBox: '0 0 12 12', 'aria-hidden': true },
        h('path', {
          d: 'M2 3 H10 M2 6 H10 M2 9 H10',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.3,
          strokeLinecap: 'round',
        }),
      );
    }

    function gridIcon() {
      return h(
        'svg',
        { viewBox: '0 0 12 12', 'aria-hidden': true },
        h('path', {
          d: 'M2.2 2.2 H5.4 V5.4 H2.2 Z M6.6 2.2 H9.8 V5.4 H6.6 Z M2.2 6.6 H5.4 V9.8 H2.2 Z M6.6 6.6 H9.8 V9.8 H6.6 Z',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.2,
          strokeLinejoin: 'round',
        }),
      );
    }

    function createWidget(ctx, t) {
      function tr(key) {
        let value;
        try {
          value = t(key);
        } catch (error) {
          value = key;
        }
        return typeof value === 'string' && value !== key ? value : EN[key] || key;
      }

      return function TodoWidget() {
        const [store, setStore] = useState(loadStore);
        const [tab, setTab] = useState('todo');
        const [prefs, setPrefs] = useState(loadMode);
        const [dragOverQuadrant, setDragOverQuadrant] = useState(null);
        const [draft, setDraft] = useState('');
        const [selectedGroupId, setSelectedGroupId] = useState(null);
        const [menuOpen, setMenuOpen] = useState(false);
        const [query, setQuery] = useState('');
        const [creating, setCreating] = useState(false);
        const [newTitle, setNewTitle] = useState('');
        const [collapsed, setCollapsed] = useState({});
        const [position, setPosition] = useState(loadPosition);
        const [size, setSize] = useState(loadSize);
        const [hidden, setHidden] = useState(loadHidden);
        const [dragging, setDragging] = useState(false);
        const [, setLocaleRevision] = useState(0);

        const composerRef = useRef(null);
        const inputRef = useRef(null);
        const cardRef = useRef(null);
        const dragRef = useRef(null);
        const positionRef = useRef(position);
        const launcherRef = useRef(null);
        const draggedRef = useRef(false);
        const pendingRef = useRef(null);
        const resizeRef = useRef(null);

        useEffect(() => {
          let off;
          try {
            off = ctx.locale.subscribe(() => setLocaleRevision((value) => value + 1));
          } catch (error) {
            off = undefined;
          }
          return () => {
            try {
              if (off) off();
            } catch (error) {
              /* already disposed */
            }
          };
        }, []);

        useEffect(() => {
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
          } catch (error) {
            /* storage may be unavailable; the in-memory state still works */
          }
        }, [store]);

        useEffect(() => {
          if (!menuOpen) return undefined;
          function onPointerDown(event) {
            if (composerRef.current && !composerRef.current.contains(event.target)) closeMenu();
          }
          document.addEventListener('mousedown', onPointerDown);
          return () => document.removeEventListener('mousedown', onPointerDown);
        }, [menuOpen]);

        useEffect(() => {
          try {
            window.localStorage.setItem(HIDDEN_KEY, hidden ? '1' : '0');
          } catch (error) {
            /* the in-memory state still hides the card */
          }
        }, [hidden]);

        useEffect(() => {
          try {
            window.localStorage.setItem(MODE_KEY, JSON.stringify(prefs));
          } catch (error) {
            /* the preference stays for this session only */
          }
        }, [prefs]);

        useEffect(() => {
          try {
            if (size) window.localStorage.setItem(SIZE_KEY, JSON.stringify(size));
            else window.localStorage.removeItem(SIZE_KEY);
          } catch (error) {
            /* the size stays for this session only */
          }
        }, [size]);

        useEffect(() => {
          // Keep the saved spot on screen: measured against the card when it
          // is open and against the small launcher when it is folded away.
          const settle = () => {
            setPosition((current) =>
              current
                ? clampToViewport(
                    current,
                    cardRef.current,
                    hidden ? 36 : 340,
                    hidden ? 36 : 420,
                  )
                : current,
            );
            setSize((current) => {
              if (!current) return current;
              const w = Math.min(current.w, Math.max(300, window.innerWidth - 16));
              const h = Math.min(current.h, Math.max(280, window.innerHeight - 16));
              return w === current.w && h === current.h ? current : { w, h };
            });
          };
          settle();
          window.addEventListener('resize', settle);
          return () => window.removeEventListener('resize', settle);
        }, [hidden, prefs.mode]);

        useEffect(
          () => () => {
            cancelPendingDrag();
            finishResize();
          },
          [],
        );

        const dateText = formatToday(activeLocaleId(ctx));
        const tabIndex = Math.max(0, TABS.indexOf(tab));
        const mode = prefs.mode;
        const activeQuadrant = prefs.activeQuadrant;

        const selectedGroup =
          store.groups.find((group) => group.id === selectedGroupId) || store.groups[0];

        const needle = query.trim().toLowerCase();
        const filteredGroups = needle
          ? store.groups.filter((group) => group.title.toLowerCase().indexOf(needle) >= 0)
          : store.groups;

        // In the To-do view every category stays visible (so 其他 and any
        // newly created one are always discoverable); other views only list
        // categories that have matches.
        const visibleGroups = store.groups
          .map((group) => ({
            id: group.id,
            title: group.title,
            items: store.items.filter(
              (item) =>
                item.board !== 'matrix' &&
                item.group === group.id &&
                item.status === tab,
            ),
          }))
          .filter((group) => tab === 'todo' || group.items.length > 0);

        function closeMenu() {
          setMenuOpen(false);
          setQuery('');
          setCreating(false);
          setNewTitle('');
        }

        function openMenu() {
          setMenuOpen(true);
          setQuery('');
          setCreating(false);
          setNewTitle('');
        }

        function selectTab(id) {
          setTab(id);
          closeMenu();
        }

        function switchMode(next) {
          closeMenu();
          setPrefs((prev) => ({ ...prev, mode: next }));
        }

        function setActiveQuadrant(id) {
          setPrefs((prev) => ({ ...prev, activeQuadrant: id }));
        }

        function assignQuadrant(itemId, quadrant) {
          setStore((prev) => ({
            ...prev,
            items: prev.items.map((item) =>
              item.id === itemId ? { ...item, quadrant } : item,
            ),
          }));
          setActiveQuadrant(quadrant);
        }

        function toggleItem(id) {
          setStore((prev) => ({
            ...prev,
            items: prev.items.map((item) => {
              if (item.id !== id) return item;
              // Ticking a completed or cancelled row restores it to To-do.
              const closed = item.status === 'completed' || item.status === 'cancelled';
              return { ...item, status: closed ? 'todo' : 'completed' };
            }),
          }));
        }

        // × in To-do / Pending / Completed files the row under Cancelled.
        function cancelItem(id) {
          setStore((prev) => ({
            ...prev,
            items: prev.items.map((item) =>
              item.id === id ? { ...item, status: 'cancelled' } : item,
            ),
          }));
        }

        // × inside the Cancelled view finally forgets the row.
        function purgeItem(id) {
          setStore((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== id) }));
        }

        function toggleGroup(id) {
          setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
        }

        function cancelPendingDrag() {
          const pending = pendingRef.current;
          if (!pending) return;
          pendingRef.current = null;
          window.clearTimeout(pending.timer);
          try {
            (pending.capture || pending.element).releasePointerCapture(pending.pointerId);
          } catch (error) {
            /* already released */
          }
        }

        // A drag only starts after the left button is held down on the
        // handle for HOLD_MS without moving. Anything else stays a click.
        function beginDrag(event, element) {
          if (event.button !== 0) return;
          if (element === cardRef.current && event.target.closest('button')) return;
          cancelPendingDrag();
          const pending = {
            element,
            capture: event.currentTarget,
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            lastX: event.clientX,
            lastY: event.clientY,
            buttons: event.buttons,
            timer: 0,
          };
          try {
            // Capture on the element that owns the handlers (the header, or
            // the launcher) so move/up keep reaching them after a drag starts.
            pending.capture.setPointerCapture(event.pointerId);
          } catch (error) {
            /* the hold still works while the pointer stays on the handle */
          }
          pending.timer = window.setTimeout(() => {
            if (pendingRef.current !== pending) return;
            pendingRef.current = null;
            // The button must still be down: a missed pointerup must never
            // turn a plain click into a drag.
            if ((pending.buttons & 1) === 0) return;
            const live = element.getBoundingClientRect();
            dragRef.current = {
              offsetX: pending.lastX - live.left,
              offsetY: pending.lastY - live.top,
              width: live.width,
              height: live.height,
              originX: pending.lastX,
              originY: pending.lastY,
            };
            // Merely entering drag mode is not a drag: the click that ends a
            // press without movement must still toggle the widget.
            draggedRef.current = false;
            positionRef.current = { x: live.left, y: live.top };
            setDragging(true);
          }, HOLD_MS);
          pendingRef.current = pending;
        }

        function startDrag(event) {
          if (cardRef.current) beginDrag(event, cardRef.current);
        }

        function startLauncherDrag(event) {
          if (launcherRef.current) beginDrag(event, launcherRef.current);
        }

        function moveDrag(event) {
          const pending = pendingRef.current;
          if (pending) {
            pending.lastX = event.clientX;
            pending.lastY = event.clientY;
            pending.buttons = event.buttons;
            if (
              (event.buttons & 1) === 0 ||
              Math.abs(event.clientX - pending.startX) > 5 ||
              Math.abs(event.clientY - pending.startY) > 5
            ) {
              cancelPendingDrag();
            }
            return;
          }
          const drag = dragRef.current;
          if (!drag) return;
          if ((event.buttons & 1) === 0) {
            endDrag(event);
            return;
          }
          if (
            Math.abs(event.clientX - drag.originX) > 3 ||
            Math.abs(event.clientY - drag.originY) > 3
          ) {
            draggedRef.current = true;
          }
          const next = clampToViewport(
            { x: event.clientX - drag.offsetX, y: event.clientY - drag.offsetY },
            null,
            drag.width,
            drag.height,
          );
          positionRef.current = next;
          setPosition(next);
        }

        function endDrag(event) {
          cancelPendingDrag();
          try {
            event.currentTarget.releasePointerCapture(event.pointerId);
          } catch (error) {
            /* already released */
          }
          if (!dragRef.current) {
            setDragging(false);
            return;
          }
          dragRef.current = null;
          setDragging(false);
          const final = positionRef.current;
          if (final) {
            try {
              window.localStorage.setItem(POSITION_KEY, JSON.stringify(final));
            } catch (error) {
              /* the position is remembered for this session only */
            }
          }
        }

        function onResizeMove(event) {
          const start = resizeRef.current;
          if (!start) return;
          const dx = event.clientX - start.startX;
          const dy = event.clientY - start.startY;
          let width = start.width;
          let height = start.height;
          let left = start.left;
          let top = start.top;
          if (start.direction.indexOf('e') >= 0) width = start.width + dx;
          if (start.direction.indexOf('w') >= 0) {
            width = start.width - dx;
            left = start.left + dx;
          }
          if (start.direction.indexOf('s') >= 0) height = start.height + dy;
          if (start.direction.indexOf('n') >= 0) {
            height = start.height - dy;
            top = start.top + dy;
          }
          width = Math.max(300, Math.min(width, window.innerWidth - 16));
          height = Math.max(280, Math.min(height, window.innerHeight - 16));
          left = Math.min(Math.max(8, left), Math.max(8, window.innerWidth - width - 8));
          top = Math.min(Math.max(8, top), Math.max(8, window.innerHeight - height - 8));
          setSize({ w: width, h: height });
          setPosition({ x: left, y: top });
          positionRef.current = { x: left, y: top };
        }

        function finishResize() {
          if (!resizeRef.current) return;
          resizeRef.current = null;
          window.removeEventListener('pointermove', onResizeMove);
          window.removeEventListener('pointerup', finishResize);
          window.removeEventListener('pointercancel', finishResize);
          const finalPosition = positionRef.current;
          if (finalPosition) {
            try {
              window.localStorage.setItem(POSITION_KEY, JSON.stringify(finalPosition));
            } catch (error) {
              /* the position is remembered for this session only */
            }
          }
        }

        function startResize(event, direction) {
          if (event.button !== 0) return;
          const element = cardRef.current;
          if (!element) return;
          event.preventDefault();
          event.stopPropagation();
          const rect = element.getBoundingClientRect();
          resizeRef.current = {
            direction,
            startX: event.clientX,
            startY: event.clientY,
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          };
          window.addEventListener('pointermove', onResizeMove);
          window.addEventListener('pointerup', finishResize);
          window.addEventListener('pointercancel', finishResize);
        }

        function hideCard() {
          closeMenu();
          draggedRef.current = false;
          setHidden(true);
        }

        function restoreCard() {
          // A drag on the launcher ends with a click; that click must not
          // reopen the card, only the drop position should be remembered.
          if (draggedRef.current) {
            draggedRef.current = false;
            return;
          }
          setPosition((current) =>
            current ? clampToViewport(current, null, 340, 420) : current,
          );
          setHidden(false);
        }

        function addItem() {
          const text = draft.trim();
          if (!text || !selectedGroup) return;
          const item = {
            id: newId('i'),
            group: selectedGroup.id,
            board: mode === 'matrix' ? 'matrix' : 'list',
            text,
            status: 'todo',
            quadrant: activeQuadrant,
          };
          setStore((prev) => ({ ...prev, items: prev.items.concat(item) }));
          setDraft('');
          closeMenu();
          setTab('todo');
          if (inputRef.current) inputRef.current.focus();
        }

        function createCategory() {
          const title = newTitle.trim();
          if (!title) return;
          const existing = store.groups.find(
            (group) => group.title.toLowerCase() === title.toLowerCase(),
          );
          if (existing) {
            setSelectedGroupId(existing.id);
            closeMenu();
            return;
          }
          const id = newId('g');
          const text = draft.trim();
          // The task in the input joins the brand-new category right away.
          setStore((prev) => {
            const groups = prev.groups.slice();
            const otherIndex = groups.findIndex((group) => group.id === 'other');
            const entry = { id, title };
            if (otherIndex >= 0) groups.splice(otherIndex, 0, entry);
            else groups.push(entry);
            const items = text
              ? prev.items.concat({
                  id: newId('i'),
                  group: id,
                  board: 'list',
                  text,
                  status: 'todo',
                  quadrant: activeQuadrant,
                })
              : prev.items;
            return { ...prev, groups, items };
          });
          setSelectedGroupId(id);
          if (text) setDraft('');
          closeMenu();
          setTab('todo');
          if (text && inputRef.current) inputRef.current.focus();
        }

        function chooseGroup(id) {
          setSelectedGroupId(id);
          closeMenu();
          if (inputRef.current) inputRef.current.focus();
        }

        function renderRow(item, compact) {
          const done = item.status === 'completed';
          const inTrash = !compact && tab === 'cancelled';
          return h(
            'div',
            {
              key: item.id,
              className:
                'dsh-todo-row' + (compact ? ' is-compact' : '') + (done ? ' is-done' : ''),
              draggable: compact ? true : undefined,
              onDragStart: compact
                ? (event) => {
                    event.dataTransfer.setData('text/plain', item.id);
                    event.dataTransfer.effectAllowed = 'move';
                  }
                : undefined,
              onDragEnd: compact ? () => setDragOverQuadrant(null) : undefined,
            },
            h(
              'button',
              {
                type: 'button',
                role: 'checkbox',
                'aria-checked': done,
                'aria-label': tr('toggle'),
                title: tr('toggle'),
                className: 'dsh-todo-check' + (done ? ' is-done' : ''),
                onClick: () => toggleItem(item.id),
              },
              done ? checkMark() : null,
            ),
            h('span', { className: 'dsh-todo-text' }, item.text),
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-todo-del',
                'aria-label': inTrash ? tr('deleteForever') : tr('delete'),
                title: inTrash ? tr('deleteForever') : tr('delete'),
                onClick: () => (inTrash ? purgeItem(item.id) : cancelItem(item.id)),
              },
              '×',
            ),
          );
        }

        function renderGroup(group) {
          const isCollapsed = Boolean(collapsed[group.id]);
          const body = isCollapsed
            ? null
            : group.items.length
              ? group.items.map((item) => renderRow(item))
              : h('div', { className: 'dsh-todo-group-empty' }, tr('emptyGroup'));
          return h(
            'div',
            { key: group.id, className: 'dsh-todo-group' },
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-todo-group-head',
                'aria-expanded': !isCollapsed,
                'aria-label': group.title + ' — ' + tr('collapse'),
                onClick: () => toggleGroup(group.id),
              },
              h('span', { className: 'dsh-todo-chevron' + (isCollapsed ? ' is-collapsed' : '') }, groupChevron()),
              h('span', { className: 'dsh-todo-group-title' }, group.title),
              h('span', { className: 'dsh-todo-count' }, String(group.items.length)),
            ),
            body,
          );
        }

        function renderQuadrant(cell) {
          // The matrix has its own tasks: completed rows stay visible but dim.
          const items = store.items.filter(
            (item) =>
              item.board === 'matrix' &&
              item.quadrant === cell.id &&
              (item.status === 'todo' || item.status === 'completed'),
          );
          const isActive = activeQuadrant === cell.id;
          const isOver = dragOverQuadrant === cell.id;
          return h(
            'section',
            {
              key: cell.id,
              className:
                'dsh-todo-quadrant dsh-todo-quadrant--' +
                cell.id +
                (isActive ? ' is-active' : '') +
                (isOver ? ' is-over' : ''),
              onDragOver: (event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                if (dragOverQuadrant !== cell.id) setDragOverQuadrant(cell.id);
              },
              onDrop: (event) => {
                event.preventDefault();
                setDragOverQuadrant(null);
                const id = event.dataTransfer.getData('text/plain');
                if (id) assignQuadrant(id, cell.id);
              },
            },
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-todo-quadrant-label',
                title: tr(cell.label),
                onClick: () => setActiveQuadrant(cell.id),
              },
              tr(cell.label),
            ),
            h(
              'div',
              { className: 'dsh-todo-quadrant-body' },
              items.length ? items.map((item) => renderRow(item, true)) : null,
            ),
          );
        }

        function renderMenu() {
          if (!menuOpen) return null;
          if (mode === 'matrix') {
            return h(
              'div',
              { className: 'dsh-todo-menu', role: 'dialog', 'aria-label': tr('category') },
              h(
                'div',
                { className: 'dsh-todo-options', role: 'listbox', 'aria-label': tr('category') },
                QUADRANTS.map((cell) =>
                  h(
                    'button',
                    {
                      key: cell.id,
                      type: 'button',
                      role: 'option',
                      'aria-selected': activeQuadrant === cell.id,
                      className:
                        'dsh-todo-option' +
                        (activeQuadrant === cell.id ? ' is-selected' : ''),
                      onClick: () => {
                        setActiveQuadrant(cell.id);
                        closeMenu();
                      },
                    },
                    h('span', { className: 'dsh-todo-option-dot', 'aria-hidden': true }),
                    h('span', { className: 'dsh-todo-option-name' }, tr('quadrant.pick.' + cell.id)),
                  ),
                ),
              ),
            );
          }
          return h(
            'div',
            { className: 'dsh-todo-menu', role: 'dialog', 'aria-label': tr('category') },
            h('input', {
              className: 'dsh-todo-search',
              type: 'text',
              value: query,
              placeholder: tr('searchCategory'),
              'aria-label': tr('searchCategory'),
              autoFocus: true,
              onChange: (event) => setQuery(event.target.value),
              onKeyDown: (event) => {
                if (event.key === 'Escape') {
                  event.stopPropagation();
                  closeMenu();
                } else if (event.key === 'Enter' && filteredGroups.length === 1) {
                  event.preventDefault();
                  chooseGroup(filteredGroups[0].id);
                }
              },
            }),
            h(
              'div',
              { className: 'dsh-todo-options', role: 'listbox', 'aria-label': tr('category') },
              filteredGroups.length
                ? filteredGroups.map((group) =>
                    h(
                      'button',
                      {
                        key: group.id,
                        type: 'button',
                        role: 'option',
                        'aria-selected': selectedGroup && selectedGroup.id === group.id,
                        className:
                          'dsh-todo-option' +
                          (selectedGroup && selectedGroup.id === group.id ? ' is-selected' : ''),
                        onClick: () => chooseGroup(group.id),
                      },
                      h('span', { className: 'dsh-todo-option-dot', 'aria-hidden': true }),
                      h('span', { className: 'dsh-todo-option-name' }, group.title),
                    ),
                  )
                : h(
                    'div',
                    { className: 'dsh-todo-menu-empty' },
                    query ? tr('noCategoryMatch') : tr('noCategories'),
                  ),
            ),
            creating
              ? h(
                  'div',
                  { className: 'dsh-todo-create' },
                  h('input', {
                    type: 'text',
                    value: newTitle,
                    placeholder: tr('categoryName'),
                    'aria-label': tr('categoryName'),
                    autoFocus: true,
                    maxLength: 24,
                    onChange: (event) => setNewTitle(event.target.value),
                    onKeyDown: (event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        createCategory();
                      } else if (event.key === 'Escape') {
                        event.stopPropagation();
                        setCreating(false);
                        setNewTitle('');
                      }
                    },
                  }),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'dsh-todo-create-ok',
                      title: tr('create'),
                      'aria-label': tr('create'),
                      disabled: !newTitle.trim(),
                      onClick: createCategory,
                    },
                    '+',
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'dsh-todo-create-cancel',
                      onClick: () => {
                        setCreating(false);
                        setNewTitle('');
                      },
                    },
                    tr('cancel'),
                  ),
                )
              : h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsh-todo-newcat',
                    onClick: () => {
                      setCreating(true);
                      // Carry a typed query over as the draft category name.
                      setNewTitle(query.trim());
                    },
                  },
                  '+ ' + tr('newCategory'),
                ),
          );
        }

        const cardClass =
          'dsh-todo-card' +
          (position ? ' is-positioned' : '') +
          (dragging ? ' is-dragging' : '') +
          (mode === 'matrix' ? ' is-matrix' : '');
        const cardStyle = {
          ...(position ? { left: position.x + 'px', top: position.y + 'px' } : null),
          ...(size ? { width: size.w + 'px', height: size.h + 'px', maxHeight: 'none' } : null),
        };
        const launcherStyle = position
          ? {
              left: Math.min(Math.max(8, position.x), Math.max(8, window.innerWidth - 48)),
              top: Math.min(Math.max(8, position.y), Math.max(8, window.innerHeight - 48)),
              right: 'auto',
              translate: 'none',
            }
          : { right: 24, top: '50%', translate: '0 -50%' };

        if (hidden) {
          return h(
            React.Fragment,
            null,
            h('style', null, CSS),
            h(
              'button',
              {
                ref: launcherRef,
                type: 'button',
                className:
                  'dsh-todo-launcher' +
                  (position ? ' is-positioned' : '') +
                  (dragging ? ' is-dragging' : ''),
                style: {
                  position: 'fixed',
                  zIndex: 60,
                  width: 40,
                  height: 40,
                  borderRadius: 13,
                  display: 'grid',
                  placeItems: 'center',
                  padding: 0,
                  border: '1px solid rgba(255,255,255,.6)',
                  background: '#f3e2a6',
                  boxShadow: '0 12px 28px -10px rgba(18,18,22,.35)',
                  cursor: 'grab',
                  pointerEvents: 'auto',
                  ...launcherStyle,
                },
                'aria-label': tr('show'),
                title: tr('show'),
                onPointerDown: startLauncherDrag,
                onPointerMove: moveDrag,
                onPointerUp: endDrag,
                onPointerCancel: endDrag,
                onClick: restoreCard,
              },
              checkMark(),
            ),
          );
        }

        return h(
          'section',
          { ref: cardRef, className: cardClass, style: cardStyle, 'aria-label': tr('title') },
          h('style', null, CSS),
          h(
            'header',
            {
              className: 'dsh-todo-head',
              title: tr('drag'),
              onPointerDown: startDrag,
              onPointerMove: moveDrag,
              onPointerUp: endDrag,
              onPointerCancel: endDrag,
            },
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-todo-hide',
                'aria-label': tr('hide'),
                title: tr('hide'),
                onClick: hideCard,
              },
              '–',
            ),
            h('span', { className: 'dsh-todo-date' }, dateText),
            h(
              'div',
              {
                className: 'dsh-todo-mode',
                role: 'group',
                'aria-label': tr('mode.minimal') + ' / ' + tr('mode.matrix'),
                onPointerDown: (event) => event.stopPropagation(),
              },
              h('span', {
                className: 'dsh-todo-mode-pill' + (mode === 'matrix' ? ' is-right' : ''),
                'aria-hidden': true,
              }),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsh-todo-mode-btn' + (mode === 'minimal' ? ' is-active' : ''),
                  'aria-pressed': mode === 'minimal',
                  title: tr('mode.minimal'),
                  'aria-label': tr('mode.minimal'),
                  onClick: () => switchMode('minimal'),
                },
                listIcon(),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsh-todo-mode-btn' + (mode === 'matrix' ? ' is-active' : ''),
                  'aria-pressed': mode === 'matrix',
                  title: tr('mode.matrix'),
                  'aria-label': tr('mode.matrix'),
                  onClick: () => switchMode('matrix'),
                },
                gridIcon(),
              ),
            ),
          ),
          mode === 'matrix'
            ? h(
                'div',
                { className: 'dsh-todo-matrix', role: 'group', 'aria-label': tr('mode.matrix') },
                QUADRANTS.map((cell) => renderQuadrant(cell)),
              )
            : h(
                React.Fragment,
                null,
                h(
                  'div',
                  { className: 'dsh-todo-tabs', role: 'tablist', 'aria-label': tr('title') },
                  h('span', {
                    className: 'dsh-todo-pill',
                    'aria-hidden': true,
                    style: { transform: 'translateX(' + tabIndex * 100 + '%)' },
                  }),
                  TABS.map((id) =>
                    h(
                      'button',
                      {
                        key: id,
                        type: 'button',
                        role: 'tab',
                        'aria-selected': tab === id,
                        className: 'dsh-todo-tab' + (tab === id ? ' is-active' : ''),
                        onClick: () => selectTab(id),
                      },
                      tr(TAB_LABEL[id]),
                    ),
                  ),
                ),
                h(
                  'div',
                  { className: 'dsh-todo-list', role: 'tabpanel' },
                  visibleGroups.length
                    ? visibleGroups.map(renderGroup)
                    : h('div', { className: 'dsh-todo-empty' }, tr('empty.' + tab)),
                ),
              ),
          h(
            'div',
            { className: 'dsh-todo-composer', ref: composerRef },
            renderMenu(),
            h(
              'form',
              {
                className: 'dsh-todo-foot',
                onSubmit: (event) => {
                  event.preventDefault();
                  addItem();
                },
              },
              h('input', {
                ref: inputRef,
                className: 'dsh-todo-input',
                type: 'text',
                value: draft,
                placeholder: tr('placeholder'),
                'aria-label': tr('placeholder'),
                onChange: (event) => setDraft(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Escape') closeMenu();
                },
              }),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsh-todo-select' + (menuOpen ? ' is-open' : ''),
                  'aria-haspopup': 'listbox',
                  'aria-expanded': menuOpen,
                  title: tr('category'),
                  onClick: () => (menuOpen ? closeMenu() : openMenu()),
                },
                h(
                  'span',
                  { className: 'dsh-todo-select-label' },
                  mode === 'matrix'
                    ? tr('quadrant.pick.' + activeQuadrant)
                    : selectedGroup
                      ? selectedGroup.title
                      : tr('category'),
                ),
                h('span', { className: 'dsh-todo-select-caret' }, caret()),
              ),
              h(
                'button',
                {
                  type: 'submit',
                  className: 'dsh-todo-add',
                  'aria-label': tr('add'),
                  title: tr('add'),
                  disabled: !draft.trim(),
                },
                '+',
              ),
            ),
          ),
          ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map((dir) =>
            h('div', {
              key: 'resize-' + dir,
              className: 'dsh-todo-resize dsh-todo-resize--' + dir,
              onPointerDown: (event) => startResize(event, dir),
            }),
          ),
        );
      };
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => {
          const disposers = [];
          const dictionaries = [
            ['en', EN],
            ['zh', ZH],
            ['zh-CN', ZH],
            ['zh-Hans', ZH],
          ];
          for (const [locale, dict] of dictionaries) {
            try {
              disposers.push(ctx.locale.register(NS, locale, dict));
            } catch (error) {
              /* A duplicate registration leaves the earlier dictionary in place. */
            }
          }
          return () => {
            for (const dispose of disposers) {
              try {
                dispose();
              } catch (error) {
                /* already disposed */
              }
            }
          };
        });

        const t = ctx.locale.bind(NS);
        const Widget = createWidget(ctx, t);

        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register({ name: 'shell.overlay', id: 'todolist', order: 30 }, Widget),
        );
      },
    };
  },
});
