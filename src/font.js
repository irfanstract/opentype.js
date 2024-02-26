// The Font object

import { athrow } from './athrow.mjs';

import Path from './path.js';
import sfnt from './tables/sfnt.js';
import { DefaultEncoding, CmapEncoding, } from './encoding.js';
import glyphset from './glyphset.js';
import Position from './position.js';
import Substitution from './substitution.js';
import { isBrowser, checkArgument } from './util.js';
import HintingTrueType from './hintingtt.js';
import Bidi from './bidi.js';
import { applyPaintType } from './tables/cff.js';

import Glyph from './glyph.js';
import { GlyphNames } from './encoding.js';

/**
 * 
 * @param {{ [k: string]: string ; } } options
 */
function createDefaultNamesInfo(options) {
    return {
        fontFamily: {en: options.familyName || ' '},
        fontSubfamily: {en: options.styleName || ' '},
        fullName: {en: options.fullName || options.familyName + ' ' + options.styleName},
        // postScriptName may not contain any whitespace
        // @ts-ignore
        postScriptName: {en: options.postScriptName || (options.familyName + options.styleName).replace(/\s/g, '')},
        designer: {en: options.designer || ' '},
        designerURL: {en: options.designerURL || ' '},
        manufacturer: {en: options.manufacturer || ' '},
        manufacturerURL: {en: options.manufacturerURL || ' '},
        license: {en: options.license || ' '},
        licenseURL: {en: options.licenseURL || ' '},
        version: {en: options.version || 'Version 0.1'},
        description: {en: options.description || ' '},
        copyright: {en: options.copyright || ' '},
        trademark: {en: options.trademark || ' '}
    };
}

/**
 * @typedef {Object} FontOptions
 * 
 * @property {Boolean} empty - whether to create a new empty font
 * 
 * @property {string} familyName
 * @property {string} styleName
 * @property {string=} fullName
 * @property {string=} postScriptName
 * @property {string=} designer
 * @property {string=} designerURL
 * @property {string=} manufacturer
 * @property {string=} manufacturerURL
 * @property {string=} license
 * @property {string=} licenseURL
 * @property {string=} version
 * @property {string=} description
 * @property {string=} copyright
 * @property {string=} trademark
 * @property {Number} unitsPerEm
 * @property {Number} ascender
 * @property {Number} descender
 * @property {Number} createdTimestamp
 * @property {Number} weightClass
 * @property {Number} italicAngle
 * @property {string=} widthClass
 * @property {string=} fsSelection
 * 
 * @property {any=} panose
 * @property {{ os2?: import("./tables/os2.js").OS2Dict } } [tables]
 * @property {any} glyphs
 * @property {SupportedGlyphOutlineDataFmat } [outlinesFormat]
 */

/**
 * @typedef {keyof { truetype: true, cff: true, } } SupportedGlyphOutlineDataFmat
 * 
 */

/**
 * A Font represents a loaded OpenType font file.
 * It contains a set of glyphs and methods to draw text on a drawing context,
 * or to get a path representing the text.
 * @exports opentype.Font
 * @class
 * @param {FontOptions} [options]
 * @constructor
 */
function Font(options = {}) {
    options;
    options.tables = options.tables || {};

    if (!options.empty) {
        // Check that we've provided the minimum set of names.
        checkArgument(options.familyName, 'When creating a new Font object, familyName is required.');
        checkArgument(options.styleName, 'When creating a new Font object, styleName is required.');
        checkArgument(options.unitsPerEm, 'When creating a new Font object, unitsPerEm is required.');
        checkArgument(options.ascender, 'When creating a new Font object, ascender is required.');
        checkArgument(options.descender <= 0, 'When creating a new Font object, negative descender value is required.');

        // OS X will complain if the names are empty, so we put a single space everywhere by default.
        /** @type {Record<keyof {unicode: 1, macintosh: 1, windows: 1,} , ReturnType<typeof createDefaultNamesInfo> > } */
        // @ts-ignore
        this.names = {};
        this.names.unicode = createDefaultNamesInfo(options);
        this.names.macintosh = createDefaultNamesInfo(options);
        this.names.windows = createDefaultNamesInfo(options);
        this.unitsPerEm = options.unitsPerEm || 1000;
        this.ascender = options.ascender;
        this.descender = options.descender;
        this.createdTimestamp = options.createdTimestamp;
        this.italicAngle = options.italicAngle || 0;
        this.weightClass = options.weightClass || 0;

        /** @type {string | number} */
        let selection = 0;
        if (options.fsSelection) {
            selection = options.fsSelection;
        } else {
            if (this.italicAngle < 0) {
                selection |= this.fsSelectionValues.ITALIC;
            } else if (this.italicAngle > 0) {
                selection |= this.fsSelectionValues.OBLIQUE;
            }
            if (this.weightClass >= 600) {
                selection |= this.fsSelectionValues.BOLD;
            }
            if (selection == 0) {
                selection = this.fsSelectionValues.REGULAR;
            }
        }

        if (!options.panose || !Array.isArray(options.panose)) {
            options.panose = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        }

        this.tables = Object.assign(options.tables, {
            os2: Object.assign({
                usWeightClass: options.weightClass || this.usWeightClasses.MEDIUM,
                usWidthClass: options.widthClass || this.usWidthClasses.MEDIUM,
                bFamilyType: options.panose[0] || 0,
                bSerifStyle: options.panose[1] || 0,
                bWeight: options.panose[2] || 0,
                bProportion: options.panose[3] || 0,
                bContrast: options.panose[4] || 0,
                bStrokeVariation: options.panose[5] || 0,
                bArmStyle: options.panose[6] || 0,
                bLetterform: options.panose[7] || 0,
                bMidline: options.panose[8] || 0,
                bXHeight: options.panose[9] || 0,
                fsSelection: selection,
            }, options.tables.os2)
        });
    }

    this.supported = true; // Deprecated: parseBuffer will throw an error if font is not supported.
    this.glyphs = new glyphset.GlyphSet(this, options.glyphs || []);
    /** @type {DefaultEncoding | CmapEncoding } */
    this.encoding = new DefaultEncoding(this);
    this.position = new Position(this);
    this.substitution = new Substitution(this);
    /** @type {{ [k: string]: any ; }} */
    this.tables = this.tables || {};

    // needed for low memory mode only.
    this._push = null;
    this._hmtxTableData = {};

    Object.defineProperty(this, 'hinting', {
        get: function() {
            if (this._hinting) return this._hinting;
            if (this.outlinesFormat === 'truetype') {
                return (this._hinting = new HintingTrueType(this));
            }
            return null;
        }
    });

    /* the following ones are not pre-declared in upstream OTF.js ; I added these pre-decls on my own */

    /** @type {this["tables"]["meta"]= } */
    this.metas ;
    
    /** @type {SupportedGlyphOutlineDataFmat= } */
    this.outlinesFormat ;

    /** @type {GlyphNames } */
    this.glyphNames ;
    /** @type {number} */
    this.numGlyphs ;

    /** @type {number} */
    this.numberOfHMetrics ;
    
    /** @type {{ [k: string]: number ; }} */
    this.kerningPairs ;
    
    /** @type {SupportedGlyphOutlineDataFmat= } */
    this.outlinesFormat ;

    /** @type {{}= } */
    this.hinting ;

}

/**
 * Check if the font has a glyph for the given character.
 * 
 * @param  {string} c
 * @return {Boolean}
 */
Font.prototype.hasChar = function(c) {
    return (this.encoding.charToGlyphIndex(c) ?? Number.NaN ) > 0;
};

/**
 * Convert the given character to, a single glyph index if found, or `NaN` if none.
 * Note that this function assumes that there is a one-to-one mapping between
 * the given character and a glyph; for complex scripts this might not be the case.
 * 
 * @type {(a: string) => number}
 */
Font.prototype.charToGlyphIndex = function(s) {
    return this.encoding.charToGlyphIndex(s) ?? Number.NaN ;
};

/**
 * Convert the given character to a single Glyph object.
 * Note that this function assumes that there is a one-to-one mapping between
 * the given character and a glyph; for complex scripts this might not be the case.
 * @param  {string} c
 * @return {Glyph}
 */
Font.prototype.charToGlyph = function(c) {
    const glyphIndex = this.charToGlyphIndex(c);
    let glyph = this.glyphs.get(glyphIndex);
    if (!glyph) {
        // .notdef
        glyph = this.glyphs.get(0);
    }

    return glyph;
};

/**
 * Update features
 * @param {any} options features options
 */
Font.prototype.updateFeatures = function (options) {
    // TODO: update all features options not only 'latn'.
    return (this.defaultRenderOptions.features ?? athrow(`[Font.updateFeatures] not available`) ).map(feature => {
        if (feature.script === 'latn') {
            return {
                script: 'latn',
                tags: feature.tags.filter(tag => options[tag])
            };
        } else {
            return feature;
        }
    });
};

/**
 * Convert the given text to a list of Glyph indexes.
 * Note that there is no strict one-to-one mapping between characters and
 * glyphs, so the list of returned glyph indexes can be larger or smaller than the
 * length of the given string.
 * @param  {string} s
 * @param  {GlyphRenderOptions} [options]
 * @return {number[]}
 */
Font.prototype.stringToGlyphIndexes = function(s, options) {
    const bidi = new Bidi();

    // Create and register 'glyphIndex' state modifier
    const charToGlyphIndexMod = /** @param {string} token */ (token) => this.charToGlyphIndex(token.char);
    bidi.registerModifier('glyphIndex', null, charToGlyphIndexMod);

    // roll-back to default features
    let features = options ?
        this.updateFeatures(options.features) :
        (this.defaultRenderOptions.features ?? [] );

    bidi.applyFeatures(this, features);

    return bidi.getTextGlyphs(s);
};

/**
 * Convert the given text to a list of Glyph objects.
 * Note that there is no strict one-to-one mapping between characters and
 * glyphs, so the list of returned glyphs can be larger or smaller than the
 * length of the given string.
 * @param  {string} s
 * @param  {GlyphRenderOptions} [options]
 * @return {Glyph[]}
 */
Font.prototype.stringToGlyphs = function(s, options) {
    const indexes = this.stringToGlyphIndexes(s, options);

    const notdef = this.glyphs.get(0);

    // convert glyph indexes to glyph objects
    const glyphs = (
        indexes
        .map(i => /** @satisfies {Glyph} */ (this.glyphs.get(i) ?? notdef ) )
    );
    return glyphs;
};

/**
 * @param  {string} name
 * @return {Number}
 */
Font.prototype.nameToGlyphIndex = function(name) {
    return this.glyphNames.nameToGlyphIndex(name);
};

/**
 * @param  {string} name
 * @return {Glyph}
 */
Font.prototype.nameToGlyph = function(name) {
    const glyphIndex = this.nameToGlyphIndex(name);
    let glyph = this.glyphs.get(glyphIndex);
    if (!glyph) {
        // .notdef
        glyph = this.glyphs.get(0);
    }

    return glyph;
};

/**
 * @param  {Number} gid
 * @return {String}
 */
Font.prototype.glyphIndexToName = function(gid) {
    if (!this.glyphNames.glyphIndexToName) {
        return '';
    }

    return this.glyphNames.glyphIndexToName(gid);
};

/**
 * Retrieve the value of the kerning pair between the left glyph (or its index)
 * and the right glyph (or its index). If no kerning pair is found, return 0.
 * The kerning value gets added to the advance width when calculating the spacing
 * between glyphs.
 * For GPOS kerning, this method uses the default script and language, which covers
 * most use cases. To have greater control, use font.position.getKerningValue .
 * @param  {Glyph} leftGlyph
 * @param  {Glyph} rightGlyph
 * @return {number}
 */
Font.prototype.getKerningValue = function(leftGlyph, rightGlyph) {
    leftGlyph = leftGlyph.index || leftGlyph;
    rightGlyph = rightGlyph.index || rightGlyph;
    const gposKerning = this.position.defaultKerningTables;
    if (gposKerning) {
        return this.position.getKerningValue(gposKerning, leftGlyph, rightGlyph);
    }
    // "kern" table
    return this.kerningPairs[leftGlyph + ',' + rightGlyph] || 0;
};

/**
 * @typedef {GlyphRenderHintingOptions & GlyphRenderOptionsMore } GlyphRenderOptions
 * 
 */

/**
 * @typedef {Object } GlyphRenderOptionsMore
 * 
 * @property {string} [script] - script used to determine which features to apply. By default, 'DFLT' or 'latn' is used.
 *                               See https://www.microsoft.com/typography/otspec/scripttags.htm
 * @property {string} [language='dflt'] - language system used to determine which features to apply.
 *                                        See https://www.microsoft.com/typography/developers/opentype/languagetags.aspx
 * @property {boolean} [kerning=true] - whether to include kerning values
 * @property {KtOtfFeature[] } [features] - OpenType Layout feature tags. Used to enable or disable the features of the given script/language system.
 *                                 See https://www.microsoft.com/typography/otspec/featuretags.htm
 * 
 * @property {number} [letterSpacing]
 * @property {number} [tracking]
 * 
 */

/**
 * @type {GlyphRenderOptions }
 */
Font.prototype.defaultRenderOptions = {
    kerning: true,
    features: [
        /**
         * these 4 features are required to render Arabic text properly
         * and shouldn't be turned off when rendering arabic text.
         */
        { script: 'arab', tags: ['init', 'medi', 'fina', 'rlig'] },
        { script: 'latn', tags: ['liga', 'rlig'] },
        { script: 'thai', tags: ['liga', 'rlig', 'ccmp'] },
    ]
};

/**
 * Helper function that invokes the given callback for each glyph in the given text.
 * The callback gets `(glyph, x, y, fontSize, options)`.* @param  {string} text
 * @param {string} text - The text to apply.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {GlyphRenderOptions=} options
 * @param  {(glyph: Glyph, x: number, y: number, fontSize: number, options: GlyphRenderOptions) => void } [callback]
 */
Font.prototype.forEachGlyph = function(text, x, y, fontSize, options, callback = Object) {
    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 72;
    options = Object.assign({}, this.defaultRenderOptions, options);
    const fontScale = 1 / (this.unitsPerEm ?? athrow() ) * fontSize;
    const glyphs = this.stringToGlyphs(text, options);
    let kerningLookups;
    if (options.kerning) {
        const script = options.script || this.position.getDefaultScriptName();
        kerningLookups = this.position.getKerningTables(script, options.language);
    }
    for (let i = 0; i < glyphs.length; i += 1) {
        const glyph = glyphs[i] ?? athrow(`assertion failed`) ;
        callback.call(this, glyph, x, y, fontSize, options);
        if (glyph.advanceWidth) {
            x += glyph.advanceWidth * fontScale;
        }

        if (options.kerning && i < glyphs.length - 1) {
            const glyphP1 = glyphs[i + 1] ?? athrow(`assertion failed`) ;
            // We should apply position adjustment lookups in a more generic way.
            // Here we only use the xAdvance value.
            const kerningValue = kerningLookups ?
                this.position.getKerningValue(kerningLookups, glyph.index, glyphP1.index) :
                this.getKerningValue(glyph, glyphP1);
            x += kerningValue * fontScale;
        }

        if (options.letterSpacing) {
            x += options.letterSpacing * fontSize;
        } else if (options.tracking) {
            x += (options.tracking / 1000) * fontSize;
        }
    }
    return x;
};

/**
 * @typedef {Required<Parameters<Glyph["getPath"] > >[3] } GlyphRenderHintingOptions
 * 
 */

/**
 * Create a Path object that represents the given text.
 * @param  {string} text - The text to create.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {GlyphRenderOptions } [options]
 * @return {Path}
 */
Font.prototype.getPath = function(text, x, y, fontSize = 72, options) {
    const fullPath = new Path();
    applyPaintType(this, fullPath, fontSize);
    if (fullPath.stroke) {
        const scale = 1 / (fullPath.unitsPerEm || 1000) * fontSize;
        // @ts-ignore
        fullPath.strokeWidth *= scale;
    }
    this.forEachGlyph(text, x, y, fontSize, options, /** @type {(this: Font, ...args: [Glyph, number, number, number ] ) => void } */ function(glyph, gX, gY, gFontSize) {
        const glyphPath = glyph.getPath(gX, gY, gFontSize, options, this);
        fullPath.extend(glyphPath);
    });
    return fullPath;
};

/**
 * Create an array of Path objects that represent the glyphs of a given text.
 * @param  {string} text - The text to create.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {GlyphRenderOptions=} options
 * @return {Path[]}
 */
Font.prototype.getPaths = function(text, x, y, fontSize = 72, options) {
    /** @type {Array<Path> } */
    const glyphPaths = [];
    this.forEachGlyph(text, x, y, fontSize, options, /** @type {(this: Font, ...args: [Glyph, number, number, number ] ) => void } */ function(glyph, gX, gY, gFontSize) {
        const glyphPath = glyph.getPath(gX, gY, gFontSize, options, this);
        glyphPaths.push(glyphPath);
    });

    return glyphPaths;
};

/**
 * Returns the advance width of a text.
 *
 * This is something different than Path.getBoundingBox() as for example a
 * suffixed whitespace increases the advanceWidth but not the bounding box
 * or an overhanging letter like a calligraphic 'f' might have a quite larger
 * bounding box than its advance width.
 *
 * This corresponds to canvas2dContext.measureText(text).width
 *
 * @param  {string} text - The text to create.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {GlyphRenderOptions=} options
 * @return advance width
 */
Font.prototype.getAdvanceWidth = function(text, fontSize, options) {
    return this.forEachGlyph(text, 0, 0, fontSize, options, function() {});
};

/**
 * Draw the text on the given drawing context.
 * @param  {CanvasRenderingContext2D} ctx - A 2D drawing context, like Canvas.
 * @param  {string} text - The text to create.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {GlyphRenderOptions=} options
 */
Font.prototype.draw = function(ctx, text, x, y, fontSize, options) {
    this.getPath(text, x, y, fontSize, options).draw(ctx);
};

/**
 * Draw the points of all glyphs in the text.
 * On-curve points will be drawn in blue, off-curve points will be drawn in red.
 * @param {CanvasRenderingContext2D} ctx - A 2D drawing context, like Canvas.
 * @param {string} text - The text to create.
 * @param {number} [x=0] - Horizontal position of the beginning of the text.
 * @param {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param {GlyphRenderOptions=} options
 */
Font.prototype.drawPoints = function(ctx, text, x, y, fontSize, options) {
    this.forEachGlyph(text, x, y, fontSize, options, function(glyph, gX, gY, gFontSize) {
        glyph.drawPoints(ctx, gX, gY, gFontSize);
    });
};

/**
 * Draw lines indicating important font measurements for all glyphs in the text.
 * Black lines indicate the origin of the coordinate system (point 0,0).
 * Blue lines indicate the glyph bounding box.
 * Green line indicates the advance width of the glyph.
 * @param {CanvasRenderingContext2D} ctx - A 2D drawing context, like Canvas.
 * @param {string} text - The text to create.
 * @param {number} [x=0] - Horizontal position of the beginning of the text.
 * @param {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param {GlyphRenderOptions=} options
 */
Font.prototype.drawMetrics = function(ctx, text, x, y, fontSize, options) {
    this.forEachGlyph(text, x, y, fontSize, options, function(glyph, gX, gY, gFontSize) {
        glyph.drawMetrics(ctx, gX, gY, gFontSize);
    });
};

/**
 * @param  {[([(Font["names"] )] extends [infer S] ? S[keyof S] : never ) ] extends [infer S1] ? (keyof S1) : never } name
 * @return {string | undefined}
 */
Font.prototype.getEnglishName = function(name) {
    const translations = (this.names.unicode || this.names.macintosh || this.names.windows)[name];
    if (translations) {
        return translations.en;
    }
};

/**
 * Validate
 */
Font.prototype.validate = function() {
    const warnings = [];
    const _this = this;

    /** @type {{ (predicate: any, message: any): void }} */
    function assert(predicate, message) {
        if (!predicate) {
            warnings.push(message);
        }
    }

    /**
     * @param {string} name name
     */
    function assertNamePresent(name) {
        const englishName = (
            // @ts-ignore
            _this.getEnglishName(name)
        );
        assert(englishName && englishName.trim().length > 0,
            'No English ' + name + ' specified.');
    }

    // Identification information
    assertNamePresent('fontFamily');
    assertNamePresent('weightName');
    assertNamePresent('manufacturer');
    assertNamePresent('copyright');
    assertNamePresent('version');

    // Dimension information
    assert((this.unitsPerEm ?? Number.NaN) > 0, 'No unitsPerEm specified.');
    assert(!Number.isFinite(this.unitsPerEm ?? athrow() ) , `non-finite unitsPerEm specified (${this.unitsPerEm }).`);
};

/**
 * Convert the font object to a SFNT data structure.
 * This structure contains all the necessary tables and metadata to create a binary OTF file.
 * @return {ReturnType<typeof sfnt.fontToTable> }
 */
Font.prototype.toTables = function() {
    return sfnt.fontToTable(this);
};
/**
 * @deprecated Font.toBuffer is deprecated. Use Font.toArrayBuffer instead.
 */
Font.prototype.toBuffer = function() {
    console.warn('Font.toBuffer is deprecated. Use Font.toArrayBuffer instead.');
    return this.toArrayBuffer();
};
/**
 * Converts a `Font` into an `ArrayBuffer`
 * @return {ArrayBuffer}
 */
Font.prototype.toArrayBuffer = function() {
    const sfntTable = this.toTables();
    const bytes = sfntTable.encode();
    const buffer = new ArrayBuffer(bytes.length);
    const intArray = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i++) {
        intArray[i] = bytes[i];
    }

    return buffer;
};

/**
 * Initiate a download of the OpenType font.
 * 
 * @param {string} fileName
 */
Font.prototype.download = function(fileName) {
    const familyName = this.getEnglishName('fontFamily');
    const styleName = this.getEnglishName('fontSubfamily');
    fileName = fileName || (familyName ?? athrow(`missing the required 'familyName'`) ).replace(/\s/g, '') + '-' + styleName + '.otf';
    const arrayBuffer = this.toArrayBuffer();

    if (isBrowser()) {
        window.URL = window.URL || window.webkitURL;

        if (window.URL) {
            const dataView = new DataView(arrayBuffer);
            const blob = new Blob([dataView], {type: 'font/opentype'});

            let link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = fileName;

            let event = document.createEvent('MouseEvents');
            event.initEvent('click', true, false);
            link.dispatchEvent(event);
        } else {
            console.warn('Font file could not be downloaded. Try using a different browser.');
        }
    } else {
        const fs = require('fs');
        const buffer = Buffer.alloc(arrayBuffer.byteLength);
        const view = new Uint8Array(arrayBuffer);
        // TODO
        for (let i = 0; i < buffer.length; ++i) {
            // @ts-ignore
            buffer[i] = view[i];
        }
        fs.writeFileSync(fileName, buffer);
    }
};

/**
 * PRIVATE!
 */
Font.prototype.fsSelectionValues = {
    ITALIC:              0x001, //1
    UNDERSCORE:          0x002, //2
    NEGATIVE:            0x004, //4
    OUTLINED:            0x008, //8
    STRIKEOUT:           0x010, //16
    BOLD:                0x020, //32
    REGULAR:             0x040, //64
    USER_TYPO_METRICS:   0x080, //128
    WWS:                 0x100, //256
    OBLIQUE:             0x200  //512
};

/**
 * private!
 */
Font.prototype.macStyleValues = {
    BOLD:       0x001, //1
    ITALIC:     0x002, //2
    UNDERLINE:  0x004, //4
    OUTLINED:   0x008, //8
    SHADOW:     0x010, //16
    CONDENSED:  0x020, //32
    EXTENDED:   0x040, //64
};

/**
 * private!
 */
Font.prototype.usWidthClasses = {
    ULTRA_CONDENSED: 1,
    EXTRA_CONDENSED: 2,
    CONDENSED: 3,
    SEMI_CONDENSED: 4,
    MEDIUM: 5,
    SEMI_EXPANDED: 6,
    EXPANDED: 7,
    EXTRA_EXPANDED: 8,
    ULTRA_EXPANDED: 9
};

/**
 * private!
 */
Font.prototype.usWeightClasses = {
    THIN: 100,
    EXTRA_LIGHT: 200,
    LIGHT: 300,
    NORMAL: 400,
    MEDIUM: 500,
    SEMI_BOLD: 600,
    BOLD: 700,
    EXTRA_BOLD: 800,
    BLACK:    900
};

export default Font;
