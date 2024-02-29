// The GlyphSet object

import { athrow, assertionFail } from './athrow.mjs';

/**
 * @typedef {T | (() => T) } DirectlyOrVoidFunctionReturning
 * @template T
 * 
 */

import Path from './path.js';

import Glyph from './glyph.js';

/** @typedef {import('./font.js').Font } Font */

/**
 * Define a property on the glyph that depends on the path being loaded.
 * 
 * @param {Glyph} glyph
 * @param {string} externalName *the external name*
 * @param {string} internalName *the internal name*
 * 
 */
function defineDependentProperty(glyph, externalName, internalName) {
    Object.defineProperty(glyph, externalName, {
        get: function() {
            // Request the path property to make sure the path is loaded.
            glyph.path; // jshint ignore:line
            return glyph[internalName];
        },
        set: function(newValue) {
            glyph[internalName] = newValue;
        },
        enumerable: true,
        configurable: true
    });
}

/**
 * A GlyphSet represents all glyphs available in the font, but modelled using
 * a deferred glyph loader, for retrieving glyphs only once they are absolutely
 * necessary, to keep the memory footprint down.
 * @exports opentype.GlyphSet
 * @class
 * @param {Font}  font
 * @param {Glyph[] } [glyphs]
 */
function GlyphSet(font, glyphs) {
    this.font = font;
    this.glyphs = /** @type {{ [idx: Number]: DirectlyOrVoidFunctionReturning<Glyph> } } */ ({});
    if (Array.isArray(glyphs)) {
        for (const [i, glyph] of glyphs.entries() )
        {
            glyph.path.unitsPerEm = font.unitsPerEm;
            this.glyphs[i] = glyph;
        }
    }

    this.length = (glyphs && glyphs.length) || 0;
}

if(typeof Symbol !== 'undefined' && Symbol.iterator) {
    /**
     * 
     */
    GlyphSet.prototype[Symbol.iterator] = function() {
        let n = -1;
        return {
            next: () => {
                n++;
                const done = n >= this.length - 1;
                return {value:this.get(n), done:done};
            } ,
        };
    };
}

/**
 * @param  {number} index
 * @return {Glyph}
 */
GlyphSet.prototype.get = function(index) {
    // this.glyphs[index] is 'undefined' when low memory mode is on. glyph is pushed on request only.
    if (this.glyphs[index] === undefined) {
        this.font._push(index);
        
        const glyph0 = this.glyphs[index] ?? athrow(`no glyph/grapheme ${index } `) ;

        const glyph = this.glyphs[index] = ((typeof glyph0 === 'function') ? glyph0() : glyph0 ) ;

        const unicodeObj = this.font._IndexToUnicodeMap[index];

        if (typeof glyph === 'function') {
            return assertionFail() ;
        }

        if (unicodeObj) {
            for (let j = 0; j < unicodeObj.unicodes.length; j++)
                glyph.addUnicode(unicodeObj.unicodes[j]);
        }

        if (this.font.cffEncoding) {
            glyph.name = this.font.cffEncoding.charset[index];
        } else if (this.font.glyphNames.names) {
            glyph.name = this.font.glyphNames.glyphIndexToName(index);
        }

        const hmtxDict = this.font._hmtxTableData[index] ?? athrow(`no HMTX for glyph ${index } `) ;

        glyph.advanceWidth    = hmtxDict.advanceWidth;
        glyph.leftSideBearing = hmtxDict.leftSideBearing;
    }
    else {
        ;

        const glyph0 = this.glyphs[index] ?? athrow(`no glyph/grapheme ${index } `) ;

        const glyph = this.glyphs[index] = ((typeof glyph0 === 'function') ? glyph0() : glyph0 ) ;

    }

    return this.glyphs[index];
};

/**
 * @param  {number} index
 * @param  {Object} loader
 */
GlyphSet.prototype.push = function(index, loader) {
    this.glyphs[index] = loader;
    this.length++;
};

/**
 * @alias opentype.glyphLoader
 * @param  {Font} font
 * @param  {number} index
 * @return {Glyph}
 */
function glyphLoader(font, index) {
    return new Glyph({index: index, font: font});
}

/**
 * Generate a stub glyph that can be filled with all metadata *except*
 * the "points" and "path" properties, which must be loaded only once
 * the glyph's path is actually requested for text shaping.
 * @alias opentype.ttfGlyphLoader
 * @param  {Font} font
 * @param  {number} index
 * @param  {OtjsTtGlyphCbk } parseGlyph
 * @param  {DataBufT} data
 * @param  {number} position
 * @param  {Function} buildPath
 * @template {import('./parse.js').OtjsPrsByteBuffer } DataBufT
 * @return {() => Glyph}
 */
function ttfGlyphLoader(font, index, parseGlyph, data, position, buildPath) {
    return function() {
        const glyph = new Glyph({index: index, font: font});

        glyph.path = function() {
            parseGlyph(glyph, data, position);
            const path = buildPath(font.glyphs, glyph);
            path.unitsPerEm = font.unitsPerEm;
            return path;
        };

        defineDependentProperty(glyph, 'xMin', '_xMin');
        defineDependentProperty(glyph, 'xMax', '_xMax');
        defineDependentProperty(glyph, 'yMin', '_yMin');
        defineDependentProperty(glyph, 'yMax', '_yMax');

        return glyph;
    };
}

/**
 * Parse a TrueType glyph.
 * 
 * @callback OtjsTtGlyphCbk
 * 
 * @param {Glyph } glyph
 * @param {import('./parse.js').OtjsPrsByteBuffer } data
 * @param {Uint8Array["length"] } start
 * 
 * @returns {void}
 * 
 */
const OtjsTtGlyphCbk = {} ;

/**
 * Parse a PSc glyph.
 * 
 * @typedef {(...args: [Font, Glyph, ...[code: string, specVersion: number] ] ) => Path } OtjsPscGlyphCbk
 * 
 */
const OtjsPscGlyphCbk = {} ;

/**
 * @alias opentype.cffGlyphLoader
 * @param  {Font} font
 * @param  {number} index
 * @param  {OtjsPscGlyphCbk } parseCFFCharstring
 * @param  {string} charstring
 * @param  {number} version
 * @return {() => Glyph}
 */
function cffGlyphLoader(font, index, parseCFFCharstring, charstring, version) {
    return function() {
        const glyph = new Glyph({index: index, font: font});

        glyph.path = function() {
            const path = parseCFFCharstring(font, glyph, charstring, version);
            path.unitsPerEm = font.unitsPerEm;
            return path;
        };

        return glyph;
    };
}

export default { GlyphSet, glyphLoader, ttfGlyphLoader, cffGlyphLoader };

export { GlyphSet,  } ;

export {
    glyphLoader,
    //
    ttfGlyphLoader,
    OtjsTtGlyphCbk ,
    //
    cffGlyphLoader,
    OtjsPscGlyphCbk ,
} ;
