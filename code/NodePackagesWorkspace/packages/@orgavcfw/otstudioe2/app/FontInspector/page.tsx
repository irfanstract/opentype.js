'use client';
import React, { useEffect, useRef, useState } from 'react';

import FontInspector from '@/components/OtStudio/font-inspector';

export default function (): React.JSX.Element {

  return (
    <div className="container">
      <div className="header">
        <h1><a href="./">opentype.js</a></h1>
        <nav>
          <a href="font-inspector.html">Font Inspector</a>
          <a href="glyph-inspector.html">Glyph Inspector</a>
        </nav>
      </div>

      <form name="demo">
        <div className="explain">
          <h1>Font Inspector</h1>
          <small>opentype.js is an OpenType and TrueType font parser. Here you can inspect the raw font metadata.</small>
        </div>

        <FontInspector/>

        <div className="explain">
          <h1>Free Software</h1>
          <p>opentype.js is available on <a href="https://github.com/opentypejs/opentype.js">GitHub</a> under the <a href="https://raw.github.com/opentypejs/opentype.js/master/LICENSE">MIT License</a>.</p>
          <p>Copyright &copy; 2020 Frederik De Bleser.</p>
        </div>
      </form>
    </div>
  );
}
