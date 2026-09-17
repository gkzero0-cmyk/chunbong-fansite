from pathlib import Path


def replace_once(path, old, new):
    file_path = Path(path)
    text = file_path.read_text()
    if old not in text:
        raise SystemExit(f"expected source block not found in {path}: {old[:120]!r}")
    file_path.write_text(text.replace(old, new, 1))


replace_once(
    "chuntris.html",
    '<div id="chuntris-harddrop-fx" class="chuntris-harddrop-fx" aria-hidden="true"></div><div id="chuntris-clear-label"',
    '<div id="chuntris-harddrop-fx" class="chuntris-harddrop-fx" aria-hidden="true"></div><div id="chuntris-line-fx" class="chuntris-line-fx" aria-hidden="true"></div><div id="chuntris-clear-label"',
)

replace_once(
    "chuntris-engine.js",
    "this.applyClearEvent({ lines: cleared.lines, tSpin }, nowMs);",
    "this.applyClearEvent({ lines: cleared.lines, tSpin, clearedRows: cleared.clearedRows }, nowMs);",
)
replace_once(
    "chuntris-engine.js",
    "applyClearEvent({ lines = 0, tSpin = false } = {}, nowMs = Date.now()) {",
    "applyClearEvent({ lines = 0, tSpin = false, clearedRows = [] } = {}, nowMs = Date.now()) {",
)
replace_once(
    "chuntris-engine.js",
    "        backToBack: result.b2bApplied, at: nowMs\n      };",
    "        backToBack: result.b2bApplied, at: nowMs,\n        clearedRows: Array.isArray(clearedRows) ? clearedRows.filter(row => Number.isInteger(row) && row >= 0 && row < BOARD_ROWS).slice(0, 4) : []\n      };",
)

replace_once(
    "chuntris.js",
    "    clearLabel:document.getElementById('chuntris-clear-label'), hardDropFx:document.getElementById('chuntris-harddrop-fx')",
    "    clearLabel:document.getElementById('chuntris-clear-label'), hardDropFx:document.getElementById('chuntris-harddrop-fx'),\n    lineFx:document.getElementById('chuntris-line-fx')",
)

js_path = Path("chuntris.js")
js = js_path.read_text()
start = js.index("  function showHardDropEffect(){")
end = js.index("  function observeEvents(state){", start)
block = """  function showHardDropEffect(detail={}){
    const active=detail.active||null;
    const landingY=Number.isFinite(detail.landingY)?detail.landingY:(active?.y??0);
    const startCells=active?Engine.cellsFor(active):[];
    const landingCells=active?Engine.cellsFor({...active,y:landingY}):[];
    const xCells=landingCells.length?landingCells:startCells;
    const xPct=xCells.length?(xCells.reduce((sum,[x])=>sum+x+.5,0)/xCells.length/Engine.BOARD_WIDTH)*100:50;
    const startRows=startCells.filter(([,y])=>y>=Engine.HIDDEN_ROWS).map(([,y])=>y-Engine.HIDDEN_ROWS);
    const endRows=landingCells.filter(([,y])=>y>=Engine.HIDDEN_ROWS).map(([,y])=>y-Engine.HIDDEN_ROWS);
    const startPct=startRows.length?(Math.min(...startRows)/Engine.VISIBLE_ROWS)*100:0;
    const endPct=endRows.length?((Math.max(...endRows)+1)/Engine.VISIBLE_ROWS)*100:95;
    if(els.hardDropFx){
      els.hardDropFx.style.setProperty('--drop-x',`${Math.max(2,Math.min(98,xPct))}%`);
      els.hardDropFx.style.setProperty('--drop-start',`${Math.max(0,Math.min(95,startPct))}%`);
      els.hardDropFx.style.setProperty('--drop-end',`${Math.max(5,Math.min(100,endPct))}%`);
      restartAnimation(els.hardDropFx,'is-active');
      clearTimeout(hardDropTimer);
      hardDropTimer=setTimeout(()=>els.hardDropFx?.classList.remove('is-active'),260);
    }
    if(els.boardWrap){restartAnimation(els.boardWrap,'is-impact');setTimeout(()=>els.boardWrap?.classList.remove('is-impact'),220);}
  }
  function showClearEffect(lines,clearDetail={}){
    const label=CLEAR_LABELS[lines];
    if(!label||!els.clearLabel)return;
    els.clearLabel.textContent=label;
    els.clearLabel.className=`chuntris-clear-label is-${label.toLowerCase()}`;
    restartAnimation(els.clearLabel,'is-visible');
    if(els.lineFx){
      els.lineFx.replaceChildren();
      const rows=Array.isArray(clearDetail.clearedRows)?clearDetail.clearedRows:[];
      const visibleRows=rows.filter(row=>Number.isInteger(row)&&row>=Engine.HIDDEN_ROWS&&row<Engine.BOARD_ROWS);
      const count=Math.max(0,Math.min(4,Number(lines)||0));
      const effectRows=visibleRows.length?visibleRows:Array.from({length:count},(_,index)=>Engine.BOARD_ROWS-1-index);
      effectRows.forEach(row=>{
        const visualRow=row-Engine.HIDDEN_ROWS;
        if(visualRow<0||visualRow>=Engine.VISIBLE_ROWS)return;
        const flash=document.createElement('span');
        flash.className=`chuntris-line-flash is-${label.toLowerCase()}`;
        flash.style.top=`${(visualRow/Engine.VISIBLE_ROWS)*100}%`;
        els.lineFx.append(flash);
      });
    }
    clearTimeout(clearTimer);
    clearTimer=setTimeout(()=>{
      if(els.clearLabel){els.clearLabel.classList.remove('is-visible');els.clearLabel.textContent='';}
      els.lineFx?.replaceChildren();
    },950);
  }
"""
js = js[:start] + block + js[end:]
if "showClearEffect(clear.lines);" not in js:
    raise SystemExit("clear-effect dispatch source block not found")
js = js.replace("showClearEffect(clear.lines);", "showClearEffect(clear.lines,clear);", 1)
old_harddrop = "else if(action==='hard-drop'){game.hardDrop(Date.now());changed=true;showHardDropEffect();if(root.ChuntrisAudio)root.ChuntrisAudio.play('harddrop');}"
new_harddrop = "else if(action==='hard-drop'){const before=game.getSnapshot();const active=before.active?{...before.active}:null;const landingY=active?Engine.ghostY(before.board,active):null;game.hardDrop(Date.now());changed=true;showHardDropEffect({active,landingY});if(root.ChuntrisAudio)root.ChuntrisAudio.play('harddrop');}"
if old_harddrop not in js:
    raise SystemExit("hard-drop action source block not found")
js_path.write_text(js.replace(old_harddrop, new_harddrop, 1))

css_path = Path("chuntris-immersive.css")
css = css_path.read_text()
marker = "/* positional-impact-effects-v1 */"
if marker in css:
    raise SystemExit("positional effect CSS already present")
css += r'''

/* positional-impact-effects-v1 */
.chuntris-line-fx{position:absolute;inset:0;pointer-events:none;z-index:4;overflow:hidden}
.chuntris-harddrop-fx{--drop-x:50%;--drop-start:10%;--drop-end:92%;overflow:hidden}
.chuntris-harddrop-fx::before{content:"";position:absolute;left:var(--drop-x);top:var(--drop-start);bottom:calc(100% - var(--drop-end));width:clamp(8px,5%,20px);min-height:10px;transform:translateX(-50%) scaleY(.15);transform-origin:bottom;border-radius:999px;background:linear-gradient(180deg,rgba(255,171,86,0),rgba(255,143,48,.18) 25%,rgba(255,113,24,.92));box-shadow:0 0 18px rgba(255,119,25,.6);opacity:0}
.chuntris-harddrop-fx::after{content:"";position:absolute;left:var(--drop-x);top:var(--drop-end);width:clamp(44px,28%,112px);aspect-ratio:1;border:2px solid rgba(255,174,84,.95);border-radius:50%;transform:translate(-50%,-50%) scale(.35);box-shadow:0 0 22px rgba(255,119,25,.7),inset 0 0 18px rgba(255,198,116,.35);opacity:0}
.chuntris-harddrop-fx.is-active::before{animation:chuntrisDropTrail .22s cubic-bezier(.2,.75,.25,1) both}
.chuntris-harddrop-fx.is-active::after{animation:chuntrisDropRing .24s ease-out both}
.chuntris-line-flash{position:absolute;left:-5%;right:-5%;height:5%;pointer-events:none;transform-origin:center;background:linear-gradient(90deg,rgba(255,110,24,0),rgba(255,229,199,.96) 22%,#fff 50%,rgba(255,175,95,.96) 78%,rgba(255,110,24,0));box-shadow:0 0 16px rgba(255,127,35,.72);animation:chuntrisLineSweep .58s cubic-bezier(.16,.78,.25,1) both}
.chuntris-line-flash.is-double{filter:brightness(1.08);box-shadow:0 0 20px rgba(255,132,34,.82)}
.chuntris-line-flash.is-triple{filter:brightness(1.16);box-shadow:0 0 24px rgba(255,155,48,.9)}
.chuntris-line-flash.is-quad{background:linear-gradient(90deg,rgba(255,132,24,0),rgba(255,213,115,.98) 20%,#fff7d1 50%,rgba(255,188,63,.98) 80%,rgba(255,132,24,0));box-shadow:0 0 30px rgba(255,178,54,.98)}
@keyframes chuntrisDropTrail{0%{opacity:0;transform:translateX(-50%) scaleY(.12)}28%{opacity:.95}62%{opacity:.8;transform:translateX(-50%) scaleY(1)}100%{opacity:0;transform:translateX(-50%) scaleY(1)}}
@keyframes chuntrisDropRing{0%{opacity:0;transform:translate(-50%,-50%) scale(.25)}30%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(1.28)}}
@keyframes chuntrisLineSweep{0%{opacity:0;transform:scaleX(.15)}20%{opacity:1;transform:scaleX(1.04)}58%{opacity:.96;transform:scaleX(1)}100%{opacity:0;transform:scaleX(.04)}}
@media(prefers-reduced-motion:reduce){.chuntris-harddrop-fx.is-active::before{animation:chuntrisReducedImpact .12s linear both}.chuntris-harddrop-fx.is-active::after{animation:chuntrisReducedImpact .12s linear both}.chuntris-line-flash{animation:chuntrisReducedLine .18s linear both}@keyframes chuntrisReducedImpact{0%{opacity:0}45%{opacity:.72}100%{opacity:0}}@keyframes chuntrisReducedLine{0%{opacity:0}35%{opacity:.9}100%{opacity:0}}}
'''
css_path.write_text(css)

print("Applied positional Chuntris impact effects")
