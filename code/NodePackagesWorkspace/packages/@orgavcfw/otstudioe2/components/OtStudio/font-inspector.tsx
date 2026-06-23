'use client';
import React, { useEffect, useState } from 'react';
import * as Immutable from 'immutable';
import { kebabCase } from 'lodash-es';

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

function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\u0022/g, '&quot;')
    .replace(/\u0027/g, '&#039;');
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

const LangTagC: React.ComponentType<{ children: string }> = (
  ({ children: lang }) => (
    <span className="langtag">[<code>{lang}</code>]</span>
  )
)

type AnyFont = import("opentype.js").Font;

const WAWOFF = Symbol("wawoffModule")

/**
 * Loads WAWOFF2 decompression module if not already loaded, and returns it. This is needed to handle WOFF2 font files, as `opentype.js` relies on this module for decompression.
 */
async function getWawoffModule()
{
              if (!window[WAWOFF]) {
                const p = new Promise<void>((resolve) => window[WAWOFF] = { onRuntimeInitialized: resolve });
                await loadScript('https://unpkg.com/wawoff2@2.0.1/build/decompress_binding.js');
                await p;
              }
              return window[WAWOFF];
}

export default function FontInspector(): React.JSX.Element {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [font, setFont] = useState<AnyFont | null>(null);
  const [message, setMessage] = useState('');
  const [fontName, setFontName] = useState('');
  const [fontTables, setFontTables] = useState<Record<string, any> | null>(null);
  const [kerningPairs, setKerningPairs] = useState<Record<string, number> | null>(null);
  const [drawOptions] = useState({
    kerning: true,
    features: [
      { script: 'arab', tags: ['init', 'medi', 'fina', 'rlig'] },
      { script: 'latn', tags: ['liga', 'rlig'] }
    ]
  });
  const [opentype, setOpentype] = useState<any | null>(null);
  const [moduleReady, setModuleReady] = useState<Promise<void> | null>(null);

  useEffect(() => {
    enableHighDPICanvas(canvas);
    (async () => {
      try {
        const mod = await import('opentype.js');
        // module could be default or namespace
        const lib = mod.default ?? mod;
        setOpentype(lib);
        // try loading sample font file (mirrors original behavior)
        const fontFileName = 'fonts/FiraSansMedium.woff';
        try {
          const res = await fetch(fontFileName);
          if (res.ok) {
            const data = await res.arrayBuffer();
            // `opentype.parse` expects ArrayBuffer; if WOFF2, `wawoffModule.decompress` needed
            const isWoff2 = fontFileName.endsWith('.woff2');
            if (isWoff2) {
              const dec = (await getWawoffModule() ).decompress(new Uint8Array(data));
              onFontLoaded(lib.parse(dec));
            } else {
              onFontLoaded(lib.parse(data));
            }
          }
        } catch {
          // ignore fetch errors for sample font
        }
      } catch (e) {
        console.error('Failed to import opentype:', e);
        setMessage(String(e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (font) {
      renderText(font);
      setFontTables(font.tables ?? null);
      setKerningPairs(font.kerningPairs ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [font, canvas]);

  useEffect(() => {
    if (canvas) enableHighDPICanvas(canvas);
  }, [canvas]);

  function onFontLoaded(f: AnyFont) {
    setMessage('');
    setFont(f);
    setFontName((f && f.names && (f.names.fullName?.en || f.names.fontFamily?.en)) || 'Loaded font');
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFontName(file.name);
    const isWoff2 = file.name.endsWith('.woff2');
    try {
      const data = await file.arrayBuffer();
      if (!opentype) throw new Error('opentype library not loaded');
      const parsed = opentype.parse(isWoff2 ? (await getWawoffModule() ).decompress(data) : data);
      onFontLoaded(parsed);
    } catch (err) {
      setMessage(String(err));
    }
  }

  const sampleText = 'Grumpy wizards make toxic brew for the evil Queen and Jack.';
  const fontSize = 32;

  function renderText(f: AnyFont) {
    if (!f) return;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const options = Object.assign({}, f.defaultRenderOptions ?? {}, drawOptions);
    ctx.fillStyle = getComputedStyle(canvas).color ;
    try {
      f.draw(ctx, sampleText, 0, 32, fontSize, options);
    } catch (err) {
      console.error('renderText error', err);
      setMessage(String(err));
    }
  }

  function displayObject(obj: any): React.JSX.Element {
      try {
        if (obj)
          return <>{'{'} { (Immutable.Set([...Object.keys(obj), ...Object.keys(obj?.constructor) ]) ).map((key) => <React.Fragment key={key}><code>{ key }</code>: { displayValue(obj[key]) }, </React.Fragment>) } {'}'}</>;
      } catch {
      }
      try {
        return <code>{JSON.stringify(obj)}</code>;
      } catch {
      }
      return <code>{String(obj)}</code>;
  }

  function displayValue(value: any): string | React.JSX.Element {
    if (Array.isArray(value) ) {
      return <>[{ value.map((item, i) => <React.Fragment key={i}>{ displayValue(item) }, </React.Fragment>) }]</>;
    }
    if (typeof value === 'object') {
      return displayObject(value);
    }
    if (['created', 'modified'].includes(String(value))) {
      const date = new Date(Number(value) * 1000);
      return date.toString();
    }
    return <code>{ String(value) }</code>;
  }

  return (

    <div>

        <input name="file" type="file" onChange={handleFileChange} />
        <output className="info" name="fontname">{fontName}</output>
        <canvas id="preview" ref={(el) => setCanvas(el)} width={940} height={50} className="text" />
        <div id="message">{message}</div>

        <hr />

        <div id="font-data">
          {fontTables ? (
            Object.keys(fontTables).map((tableName) => {
              const table = fontTables[tableName];
              if (tableName === 'name') {
                // Render name table grouped by platform if possible
                const names: any = table;
                return (
                  <section key="name" className="data-content">
                    <h3>Name table</h3>
                    {['unicode', 'macintosh', 'windows'].map((platform) => {
                      const platformNames = names[platform];
                      if (!platformNames) return null;
                      return (
                        <div key={platform}>
                          <h4>{platform}</h4>
                          <dl>
                            {Object.keys(platformNames).sort().map((prop) => (
                              <React.Fragment key={prop}>
                                <dt>{kebabCase(prop).replaceAll(/[\-_]+/g, " ").toUpperCase() }</dt>
                                <dd>
                                  {Object.keys(platformNames[prop]).sort().map((lang) => (
                                    <span key={lang} style={{ display: 'block' }}>
                                      <LangTagC>{ lang }</LangTagC>{' '}
                                      <span className="langname" lang={lang}><code>{platformNames[prop][lang]}</code></span>
                                    </span>
                                  ))}
                                </dd>
                              </React.Fragment>
                            ))}
                          </dl>
                        </div>
                      );
                    })}
                  </section>
                );
              }

              return (
                <section key={tableName}>
                  <h3 className="collapsed">the <code>{tableName}</code> table</h3>
                  <dl id={`${tableName}-table`}>
                    {Object.keys(table).map((prop) => (
                      <React.Fragment key={prop}>
                        <dt>{kebabCase(prop).replaceAll(/[\-_]+/g, " ").toUpperCase() }</dt>
                        {/* <dd dangerouslySetInnerHTML={{ __html: escapeHtml(displayValue(table[prop])) }} /> */}
                        <dd>{ displayValue(table[prop]) }</dd>
                      </React.Fragment>
                    ))}
                  </dl>
                </section>
              );
            })
          ) : (
            <div>No font loaded</div>
          )}

          {kerningPairs && (
            <section>
              <h3 className="collapsed">Kerning</h3>
              <dl id="kern-table">
                <dt>{Object.keys(kerningPairs).length} Pairs</dt>
                <dd><pre style={{whiteSpace: 'pre-wrap'}}>{JSON.stringify(kerningPairs, null, 2)}</pre></dd>
              </dl>
            </section>
          )}
        </div>

        <hr />

        <button type="button" id="update" onClick={() => { if (font) { setFontTables(font.tables); setKerningPairs(font.kerningPairs); } }}>update</button>

        <hr />

    </div>
  );
}
