'use client';
import React, { useEffect, useState } from 'react';

type AnyFont = import('opentype.js').Font;
const WAWOFF = Symbol('wawoffModule');

async function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = (e) => reject(e);
    document.head.appendChild(s);
  });
}

async function getWawoffModule() {
  const win: any = window;
  if (!win[WAWOFF]) {
    const p = new Promise<void>((resolve) => (win[WAWOFF] = { onRuntimeInitialized: resolve }));
    await loadScript('https://unpkg.com/wawoff2@2.0.1/build/decompress_binding.js');
    await p;
  }
  return win[WAWOFF];
}

function enableHighDPICanvas(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  const pixelRatio = window.devicePixelRatio || 1;
  if (pixelRatio === 1) return;
  const oldWidth = canvas.width;
  const oldHeight = canvas.height;
  canvas.width = oldWidth * pixelRatio;
  canvas.height = oldHeight * pixelRatio;
  canvas.style.width = oldWidth + 'px';
  canvas.style.height = oldHeight + 'px';
  canvas.getContext('2d')?.scale(pixelRatio, pixelRatio);
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
function base64ToArrayBuffer(base64: string) {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

export default function OpentypeIndex(): React.JSX.Element {
  const [previewCanvas, setPreviewCanvas] = useState<HTMLCanvasElement | null>(null);
  const [snapCanvas, setSnapCanvas] = useState<HTMLCanvasElement | null>(null);
  const [glyphsEl, setGlyphsEl] = useState<HTMLElement | null>(null);

  const [font, setFont] = useState<AnyFont | null>(null);
  const [message, setMessage] = useState('');
  const [fontName, setFontName] = useState('');

  const [textField, setTextField] = useState('Hello, World!');
  const [fontSize, setFontSize] = useState(150);
  const [drawPoints, setDrawPoints] = useState(true);
  const [drawMetrics, setDrawMetrics] = useState(false);
  const [kerning, setKerning] = useState(true);
  const [ligatures, setLigatures] = useState(true);
  const [hinting] = useState(false); // disabled in original UI

  // snap controls
  const [snapStrength, setSnapStrength] = useState(80);
  const [snapDistance, setSnapDistance] = useState(53);
  const [snapX, setSnapX] = useState(0);
  const [snapY, setSnapY] = useState(0);

  // ensure high DPI canvases
  useEffect(() => { enableHighDPICanvas(previewCanvas); }, [previewCanvas]);
  useEffect(() => { enableHighDPICanvas(snapCanvas); }, [snapCanvas]);

  // helper to get draw options (mimic getDrawOptions)
  function getDrawOptions() {
    return {
      kerning,
      hinting,
      features: { liga: ligatures, rlig: ligatures }
    };
  }

  function showErrorMessage(msg: string) {
    setMessage(msg || '');
  }

  function doSnap(path: any) {
    // handle nested layers like original
    const layers = (path as any)._layers;
    if (layers && layers.length) {
      for (let l = 0; l < layers.length; l++) doSnap(layers[l]);
      return;
    }
    const snap = (v: number, distance: number, strength: number) =>
      v * (1.0 - strength) + strength * Math.round(v / distance) * distance;
    const strength = snapStrength / 100.0;
    const distance = snapDistance;
    const x = snapX;
    const y = snapY;
    for (let i = 0; i < path.commands.length; i++) {
      const cmd = path.commands[i];
      if (cmd.type !== 'Z') {
        cmd.x = snap(cmd.x + x, distance, strength) - x;
        cmd.y = snap(cmd.y + y, distance, strength) - y;
      }
      if (cmd.type === 'Q' || cmd.type === 'C') {
        cmd.x1 = snap(cmd.x1 + x, distance, strength) - x;
        cmd.y1 = snap(cmd.y1 + y, distance, strength) - y;
      }
      if (cmd.type === 'C') {
        cmd.x2 = snap(cmd.x2 + x, distance, strength) - x;
        cmd.y2 = snap(cmd.y2 + y, distance, strength) - y;
      }
    }
  }

  async function onFontLoaded(f: AnyFont) {
    // remove previous callbacks if present
    const prev: any = (window as any).font;
    if (prev) prev.onGlyphUpdated = null;

    setFont(f);
    (window as any).font = f;
    (window as any).fontOptions = Object.assign({}, f.defaultRenderOptions || {});
    setFontName(((f as any).names && (f as any).names.fullName) ? String((f as any).names.fullName) : '');

    // create glyph previews (first 100)
    if (!glyphsEl) return;
    glyphsEl.innerHTML = '';
    const amount = Math.min(100, (f.glyphs && (f.glyphs.length || f.glyphs.length === 0) ? f.glyphs.length : (f.glyphs ? (f.glyphs as any).length : 0)) as number || 0);
    const x = 50, y = 120, size = 150, ctxs: CanvasRenderingContext2D[] = [];
    for (let i = 0; i < amount; i++) {
      const glyph = ((f.glyphs.get ? (f.glyphs.get(i)) : (f.glyphs[i])) ) as import('opentype.js').Glyph ;
      const wrapper = document.createElement('div');
      wrapper.className = 'wrapper';
      wrapper.style.width = size + 'px';
      wrapper.innerHTML = `<canvas id="c${i}" width="${size}" height="${size}"></canvas><span>${i}</span>`;
      glyphsEl.appendChild(wrapper);
      const canvas = wrapper.querySelector('canvas')!;
      const ctx = canvas.getContext('2d')!;
      enableHighDPICanvas(canvas);
      ctx.fillStyle = getComputedStyle(canvas).color || 'black';
      ctxs[i] = ctx;
      if (glyph && (glyph.draw)) {
        try { glyph.draw(ctx, x, y, 72, {}, f); } catch { /* ignore */ }
        if ((glyph as any).drawPoints) try { (glyph as any).drawPoints(ctx, x, y, 72); } catch { }
        if ((glyph as any).drawMetrics) try { (glyph as any).drawMetrics(ctx, x, y, 72); } catch { }
      }
    }

    // enable/disable hinting control would be handled in UI; original sets disabled if font.hinting false

    // wire glyph update handler
    f.onGlyphUpdated = (glyphId: number) => {
      if (0 <= glyphId && glyphId < ctxs.length) {
        const glyph = f.glyphs.get(glyphId);
        const ctx = ctxs[glyphId];
        try { glyph.draw(ctx, x, y, 72, {}, f); } catch { }
        if ((glyph as any).drawPoints) try { (glyph as any).drawPoints(ctx, x, y, 72); } catch { }
        if ((glyph as any).drawMetrics) try { (glyph as any).drawMetrics(ctx, x, y, 72); } catch { }
      }
      // re-render main preview if necessary
      renderText();
    };

    renderText();
  }

  function renderText() {
    if (!font || !previewCanvas) return;
    const canvas = previewCanvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = getComputedStyle(canvas).color || 'black';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const options = Object.assign({}, (font as any).defaultRenderOptions || {}, getDrawOptions());
    try {
      font.draw(ctx, textField, 0, 200, fontSize, options);
      if (drawPoints && (font as any).drawPoints) font.drawPoints(ctx, textField, 0, 200, fontSize, options);
      if (drawMetrics && (font as any).drawMetrics) font.drawMetrics(ctx, textField, 0, 200, fontSize, options);
    } catch (err) {
      // draw may fail for some fonts/strings; show error
      console.warn(err);
    }

    // snap rendering
    const snapPath = (font as any).getPath ? (font as any).getPath(textField, 0, 200, fontSize, options) : null;
    if (snapCanvas && snapPath) {
      const snapCtx = snapCanvas.getContext('2d')!;
      snapCtx.clearRect(0, 0, snapCanvas.width, snapCanvas.height);
      doSnap(snapPath);
      if (snapPath.draw) snapPath.draw(snapCtx);
    }
  }

  async function displayFile(fileOrResponse: File | Response, name: string) {
    setFontName(name);
    const isWoff2 = name.endsWith('.woff2');
    try {
      if (isWoff2) {
        // ensure wasm loaded
        await getWawoffModule();
      }
      let data: ArrayBuffer;
      if (fileOrResponse instanceof File) {
        data = await fileOrResponse.arrayBuffer();
      } else {
        data = await (fileOrResponse as Response).arrayBuffer();
      }

      try {
        const base64String = arrayBufferToBase64(data);
        sessionStorage.setItem('fontData', base64String);
      } catch (err) {
        showErrorMessage('Error saving font to sessionStorage');
      }

      const { parse }: any = await import('opentype.js');
      const win: any = window;
      const parsed = parse(isWoff2 && win.Module && win.Module.decompress ? win.Module.decompress(data) : data, { lowMemory: true });
      showErrorMessage('');
      onFontLoaded(parsed);
    } catch (err: any) {
      showErrorMessage(String(err));
    }
  }

  // handle file input
  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    await displayFile(f, f.name);
  }

  // initial load: check sessionStorage or fetch default
  useEffect(() => {
    (async () => {
      const fontData = sessionStorage.getItem('fontData');
      if (fontData) {
        const arrayBuffer = base64ToArrayBuffer(fontData);
        const { parse }: any = await import('opentype.js');
        const parsed = parse(arrayBuffer);
        onFontLoaded(parsed);
      } else {
        try {
          const fontFileName = 'fonts/FiraSansMedium.woff';
          const resp = await fetch(fontFileName);
          await displayFile(resp, fontFileName);
        } catch (err) {
          console.warn('Default font fetch failed:', err);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glyphsEl]); // ensure glyphsEl exists before populating

  // each time controls change, redraw preview
  useEffect(() => { renderText(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [font, textField, fontSize, drawPoints, drawMetrics, kerning, ligatures, snapStrength, snapDistance, snapX, snapY]);

  return (
    <div className="container">
      <div className="explain">opentype.js is an OpenType and TrueType font parser and writer.</div>

      <input id="file" type="file" onChange={handleFileInput} />
      <output className="info" name="fontname">{fontName}</output>

      <canvas ref={setPreviewCanvas} id="preview" width={940} height={300} className="text" />
      <output id="message">{message}</output>

      <input className="text-input" value={textField} onChange={(e) => setTextField(e.target.value)} autoFocus name="textField" />

      <label>
        Font Size
        <input type="range" min={6} max={500} step={2} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
        <output>{fontSize}</output>
      </label>

      <label><input type="checkbox" checked={drawPoints} onChange={(e) => setDrawPoints(e.target.checked)} />Draw Points</label>
      <label><input type="checkbox" checked={drawMetrics} onChange={(e) => setDrawMetrics(e.target.checked)} />Draw Metrics</label>
      <label><input type="checkbox" checked={kerning} onChange={(e) => setKerning(e.target.checked)} />Kerning</label>
      <label><input type="checkbox" checked={ligatures} onChange={(e) => setLigatures(e.target.checked)} />Ligatures</label>
      <label className="disabled"><input type="checkbox" checked={hinting} disabled />Hinting</label>

      <div id="variation-options" />

      <hr />

      <div className="explain">
        Once you have the shapes, you can modify them, for example by <strong>snapping</strong> them to a virtual grid:
      </div>

      <canvas ref={setSnapCanvas} id="snap" width={940} height={300} className="text" />

      <label>Strength <input type="range" min={0} max={100} value={snapStrength} onChange={(e) => setSnapStrength(Number(e.target.value))} /><output>{snapStrength}</output></label>
      <label>Distance <input type="range" min={1} max={100} value={snapDistance} onChange={(e) => setSnapDistance(Number(e.target.value))} /><output>{snapDistance}</output></label>
      <label>X <input type="range" min={-100} max={100} value={snapX} onChange={(e) => setSnapX(Number(e.target.value))} /><output>{snapX}</output></label>
      <label>Y <input type="range" min={-100} max={100} value={snapY} onChange={(e) => setSnapY(Number(e.target.value))} /><output>{snapY}</output></label>

      <hr />

      <div className="explain">
        <h1>Glyphs</h1>
        <div id="glyphs" ref={(el) => setGlyphsEl(el)} />
        <div className="message">Only the first 100 glyphs are shown.</div>
      </div>
    </div>
  );
}
