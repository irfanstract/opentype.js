// opentype.js
// https://github.com/opentypejs/opentype.js
// (c) 2015 Frederik De Bleser
// opentype.js may be freely distributed under the MIT license.

import { athrow, asNonNull } from './athrow.mjs';

import { tinf_uncompress as inflate } from './tiny-inflate@1.0.3.esm.js'; // from code4fukui/tiny-inflate-es
import { isNode } from './util.js';
import Font from './font.js';
import Glyph from './glyph.js';
import { CmapEncoding, GlyphNames, addGlyphNames } from './encoding.js';
import parse from './parse.js';
import BoundingBox from './bbox.js';
import Path from './path.js';
import cpal from './tables/cpal.js';
import colr from './tables/colr.js';
import cmap from './tables/cmap.js';
import cff from './tables/cff.js';
import stat from './tables/stat.js';
import fvar from './tables/fvar.js';
import gvar from './tables/gvar.js';
import avar from './tables/avar.js';
import glyf from './tables/glyf.js';
import gdef from './tables/gdef.js';
import gpos from './tables/gpos.js';
import gsub from './tables/gsub.js';
import head from './tables/head.js';
import hhea from './tables/hhea.js';
import hmtx from './tables/hmtx.js';
import kern from './tables/kern.js';
import ltag from './tables/ltag.js';
import loca from './tables/loca.js';
import maxp from './tables/maxp.js';
import _name from './tables/name.js';
import os2 from './tables/os2.js';
import post from './tables/post.js';
import meta from './tables/meta.js';
import gasp from './tables/gasp.js';

/**
 * The opentype library.
 * @namespace opentype
 */

// File loaders /////////////////////////////////////////////////////////

/**
 * Loads a font from a URL. The callback throws an error message as the first parameter if it fails
 * and the font as an ArrayBuffer in the second parameter if it succeeds.
 * @param  {string} url - The URL of the font file.
 * @param  {(...args: [{}, never?] | [null, Buffer | ArrayBuffer] ) => void } callback - The function to call when the font load completes
 * @returns {void}
 * 
 * @deprecated use {@link fetch}, (Node-only) `createRequest`, or (Browser-only) {@link XMLHttpRequest } directly to fetch blocks.
 */
function loadFromUrl(url, callback) {

    if (typeof fetch !== 'undefined') {
        return loadUsingDomFetchMethod(url, callback) ;
    }

    if (typeof XMLHttpRequest !== 'undefined') {
        // Browser environment, we use XHR.
        return loadUsingDomXmlHttpRequest(url, callback) ;
    }

    throw new TypeError(`unsupported environment ; neither 'fetch' nor 'XMLHttpRequest' were present .`) ;
}

/**
 * 
 * load using `fetch` (assuming it's there).
 * 
 * @type {(...args: Parameters<typeof loadFromUrl>) => ReturnType<typeof loadFromUrl> }
 */
function loadUsingDomFetchMethod(url, callback)
{
  ;

  (async () => {
    const r = await fetch(url) ;
    const bl = await r.arrayBuffer() ;
    return bl ;
  })()
  .then(r => callback(null, r) , z => callback(z) )
  ;
}

/**
 * 
 * load using `XMLHttpRequest` (assuming it's there).
 * 
 * @type {(...args: Parameters<typeof loadFromUrl>) => ReturnType<typeof loadFromUrl> }
 */
function loadUsingDomXmlHttpRequest(url, callback)
{

    const request = new XMLHttpRequest();
    request.open('get', url, true);
    request.responseType = 'arraybuffer';
    request.onload = function() {
        if (request.response) {
            return callback(null, request.response);
        } else {
            return callback('Font could not be loaded: ' + request.statusText);
        }
    };

    request.onerror = function() {
        callback('Font could not be loaded');
    };

    request.send();

}

function TDE_ARRAY_PROTOTYPE() {
    /**
     * @type {Array<{
     * tag: ReturnType<typeof parse.getTag>,
     * checksum?: ReturnType<typeof parse.getULong>,
     * offset: ReturnType<typeof parse.getULong>,
     * length: ReturnType<typeof parse.getULong>,
     * compression: string | false,
     * compressedLength ?: any ,
     * }> }
     * 
     */
    const tableEntries = [];
    return tableEntries ;
}

// Table Directory Entries //////////////////////////////////////////////
/**
 * Parses OpenType table entries.
 * @param  {DataView} data
 * @param  {Number} numTables
 */
function parseOpenTypeTableEntries(data, numTables) {
    // /**
    //  * @typedef {Object}
    //  * 
    //  */
    /**
     * @type {Array<ReturnType<typeof TDE_ARRAY_PROTOTYPE >[number] > }
     */
    const tableEntries = [];
    let p = 12;
    for (let i = 0; i < numTables; i += 1) {
        const tag = parse.getTag(data, p);
        const checksum = parse.getULong(data, p + 4);
        const offset = parse.getULong(data, p + 8);
        const length = parse.getULong(data, p + 12);
        tableEntries.push({tag: tag, checksum: checksum, offset: offset, length: length, compression: false});
        p += 16;
    }

    return tableEntries;
}

/**
 * Parses WOFF table entries.
 * @param  {DataView} data
 * @param  {Number} numTables
 */
function parseWOFFTableEntries(data, numTables) {
    /**
     * @type {Array<ReturnType<typeof TDE_ARRAY_PROTOTYPE >[number] > }
     */
    const tableEntries = [];
    let p = 44; // offset to the first table directory entry.
    for (let i = 0; i < numTables; i += 1) {
        const tag = parse.getTag(data, p);
        const offset = parse.getULong(data, p + 4);
        const compLength = parse.getULong(data, p + 8);
        const origLength = parse.getULong(data, p + 12);
        /** @type {string | false} */
        let compression;
        if (compLength < origLength) {
            compression = 'WOFF';
        } else {
            compression = false;
        }

        tableEntries.push({tag: tag, offset: offset, compression: compression,
            compressedLength: compLength, length: origLength});
        p += 20;
    }

    return tableEntries;
}

/**
 * @typedef {Object} TableData
 * @property {DataView} data - The DataView
 * @property {number} offset - The data offset.
 */

/**
 * @param  {DataView} data
 * @param  {ReturnType<typeof TDE_ARRAY_PROTOTYPE>[number] } tableEntry
 * @return {TableData}
 */
function uncompressTable(data, tableEntry) {
    if (tableEntry.compression === 'WOFF') {
        const inBuffer = new Uint8Array(data.buffer, tableEntry.offset + 2, tableEntry.compressedLength - 2);
        const outBuffer = new Uint8Array(tableEntry.length);
        inflate(inBuffer, outBuffer);
        if (outBuffer.byteLength !== tableEntry.length) {
            throw new Error(`Decompression error: ${tableEntry.tag} decompressed length doesn\'t match recorded length`);
        }

        const view = new DataView(outBuffer.buffer, 0);
        return {data: view, offset: 0};
    } else {
        return {data: data, offset: tableEntry.offset};
    }
}

// Public API ///////////////////////////////////////////////////////////

class MissingTablesInFontException
extends
TypeError
{
  get [Symbol.toStringTag]() { return "MissingTablesInFontError" ; }

  /**
   * @param {{ detailMsg: string, }} options
   */
  constructor({ detailMsg: msg, }) {
    super(`[font] ${msg} `) ;
  }
}
const throwMissingTablesInFontException = /** @satisfies {(...args: ConstructorParameters<typeof MissingTablesInFontException> ) } */ ((...a) => {
  throw new MissingTablesInFontException(...a) ;
}) ;

/**
 * Parse the OpenType file data (as an ArrayBuffer) and return a Font object.
 * Throws an error if the font could not be parsed.
 * @param  {ArrayBuffer} buffer
 * @param  {Object} opt - options for parsing
 * @return {Font}
 */
function parseBuffer(buffer, opt={}) {
    let indexToLocFormat;
    let ltagTable;

    // Since the constructor can also be called to create new fonts from scratch, we indicate this
    // should be an empty font that we'll fill with our own data.
    const font = new Font({empty: true});

    if (buffer.constructor !== ArrayBuffer) { // convert node Buffer
        buffer = new Uint8Array(buffer).buffer;
    }
    // OpenType fonts use big endian byte ordering.
    // We can't rely on typed array view types, because they operate with the endianness of the host computer.
    // Instead we use DataViews where we can specify endianness.
    const data = new DataView(buffer, 0);
    let numTables;
    /** @type {(ReturnType<typeof TDE_ARRAY_PROTOTYPE>[number] )[] } */
    let tableEntries = [];
    const signature = parse.getTag(data, 0);
    if (signature === String.fromCharCode(0, 1, 0, 0) || signature === 'true' || signature === 'typ1') {
        font.outlinesFormat = 'truetype';
        numTables = parse.getUShort(data, 4);
        tableEntries = parseOpenTypeTableEntries(data, numTables);
    } else if (signature === 'OTTO') {
        font.outlinesFormat = 'cff';
        numTables = parse.getUShort(data, 4);
        tableEntries = parseOpenTypeTableEntries(data, numTables);
    } else if (signature === 'wOFF') {
        const flavor = parse.getTag(data, 4);
        if (flavor === String.fromCharCode(0, 1, 0, 0)) {
            font.outlinesFormat = 'truetype';
        } else if (flavor === 'OTTO') {
            font.outlinesFormat = 'cff';
        } else {
            throw new Error(`Unsupported OpenType flavor ${signature}`);
        }

        numTables = parse.getUShort(data, 12);
        tableEntries = parseWOFFTableEntries(data, numTables);
    } else if (signature === 'wOF2') {
        var issue = 'https://github.com/opentypejs/opentype.js/issues/183#issuecomment-1147228025';
        throw new Error(`WOFF2 require an external decompressor library, see examples at: ${issue}`);
    } else {
        throw new Error(`Unsupported OpenType signature ${signature}`);
    }

    let cffTableEntry;
    let cff2TableEntry;
    let fvarTableEntry;
    let statTableEntry;
    let gvarTableEntry;
    let avarTableEntry;
    let glyfTableEntry;
    let gdefTableEntry;
    let gposTableEntry;
    let gsubTableEntry;
    let hmtxTableEntry;
    let kernTableEntry;
    let locaTableEntry;
    let nameTableEntry;
    let metaTableEntry;
    let p;

    for (const tableEntry of tableEntries)
    {
        let table;

        /**
         * NOTE:
         * do not edit the case string literals arbitrarily ;
         * the string literals each needs to exactly match,
         * the casing and the extra trailing white-space chars are intentional
         * .
         * 
         */
        switch (tableEntry.tag) {
            case 'avar':
                avarTableEntry = tableEntry;
                break;
            case 'cmap':
                table = uncompressTable(data, tableEntry);
                font.tables.cmap = cmap.parse(table.data, table.offset);
                font.encoding = new CmapEncoding(font.tables.cmap);
                break;
            case 'cvt ' :
                table = uncompressTable(data, tableEntry);
                p = new parse.Parser(table.data, table.offset);
                font.tables.cvt = p.parseShortList(tableEntry.length / 2);
                break;
            case 'fvar':
                fvarTableEntry = tableEntry;
                break;
            case 'STAT':
                statTableEntry = tableEntry;
                break;
            case 'gvar':
                gvarTableEntry = tableEntry;
                break;
            case 'fpgm' :
                table = uncompressTable(data, tableEntry);
                p = new parse.Parser(table.data, table.offset);
                font.tables.fpgm = p.parseByteList(tableEntry.length);
                break;
            case 'head':
                table = uncompressTable(data, tableEntry);
                font.tables.head = head.parse(table.data, table.offset);
                font.unitsPerEm = font.tables.head.unitsPerEm;
                indexToLocFormat = font.tables.head.indexToLocFormat;
                break;
            case 'hhea':
                table = uncompressTable(data, tableEntry);
                font.tables.hhea = hhea.parse(table.data, table.offset);
                font.ascender = font.tables.hhea.ascender;
                font.descender = font.tables.hhea.descender;
                font.numberOfHMetrics = font.tables.hhea.numberOfHMetrics;
                break;
            case 'hmtx':
                hmtxTableEntry = tableEntry;
                break;
            case 'ltag':
                table = uncompressTable(data, tableEntry);
                ltagTable = ltag.parse(table.data, table.offset);
                break;
            case 'COLR':
                table = uncompressTable(data, tableEntry);
                font.tables.colr = colr.parse(table.data, table.offset);
                break;
            case 'CPAL':
                table = uncompressTable(data, tableEntry);
                font.tables.cpal = cpal.parse(table.data, table.offset);
                break;
            case 'maxp':
                table = uncompressTable(data, tableEntry);
                font.tables.maxp = maxp.parse(table.data, table.offset);
                font.numGlyphs = font.tables.maxp.numGlyphs;
                break;
            case 'name':
                nameTableEntry = tableEntry ;
                break;
            case 'OS/2':
                table = uncompressTable(data, tableEntry);
                font.tables.os2 = os2.parse(table.data, table.offset);
                break;
            case 'post':
                table = uncompressTable(data, tableEntry);
                font.tables.post = post.parse(table.data, table.offset);
                font.glyphNames = new GlyphNames(font.tables.post);
                break;
            case 'prep' :
                table = uncompressTable(data, tableEntry);
                p = new parse.Parser(table.data, table.offset);
                font.tables.prep = p.parseByteList(tableEntry.length);
                break;
            case 'glyf':
                glyfTableEntry = tableEntry;
                break;
            case 'loca':
                locaTableEntry = tableEntry;
                break;
            case 'CFF ':
                cffTableEntry = tableEntry;
                break;
            case 'CFF2':
                cff2TableEntry = tableEntry;
                break;
            case 'kern':
                kernTableEntry = tableEntry;
                break;
            case 'GDEF':
                gdefTableEntry = tableEntry;
                break;
            case 'GPOS':
                gposTableEntry = tableEntry;
                break;
            case 'GSUB':
                gsubTableEntry = tableEntry;
                break;
            case 'meta':
                metaTableEntry = tableEntry;
                break;
            case 'gasp':
                table = uncompressTable(data, tableEntry);
                font.tables.gasp = gasp.parse(table.data, table.offset);
                break;
        }
    }

    if (!nameTableEntry) { return athrow(`[font] missing nameTableEntry. such table is necessary.`) ; }
    if (!hmtxTableEntry) { return athrow(`[font] missing hmtxTableEntry. such table is necessary.`) ; }

    const nameTable = uncompressTable(data, nameTableEntry );
    font.tables.name = _name.parse(nameTable.data, nameTable.offset, ltagTable);
    font.names = font.tables.name;

    if (glyfTableEntry && locaTableEntry) {
        const shortVersion = indexToLocFormat === 0;
        const locaTable = uncompressTable(data, locaTableEntry);
        const locaOffsets = loca.parse(locaTable.data, locaTable.offset, font.numGlyphs, shortVersion);
        const glyfTable = uncompressTable(data, glyfTableEntry);
        font.glyphs = glyf.parse(glyfTable.data, glyfTable.offset, locaOffsets, font, opt);
    } else if (cffTableEntry) {
        const cffTable = uncompressTable(data, cffTableEntry);
        cff.parse(cffTable.data, cffTable.offset, font, opt);
    } else if (cff2TableEntry) {
        const cffTable2 = uncompressTable(data, cff2TableEntry);
        cff.parse(cffTable2.data, cffTable2.offset, font, opt);
    } else {
      throw new Error(`[font] no processible outline-data table ; fonts must contain TrueType, CFF or CFF2 outlines.` );
    }

    const hmtxTable = uncompressTable(data, hmtxTableEntry );
    hmtx.parse(font, hmtxTable.data, hmtxTable.offset, font.numberOfHMetrics, font.numGlyphs, font.glyphs, opt);
    addGlyphNames(font, opt);

    if (kernTableEntry) {
        const kernTable = uncompressTable(data, kernTableEntry);
        font.kerningPairs = kern.parse(kernTable.data, kernTable.offset);
    } else {
        font.kerningPairs = {};
    }

    if (gdefTableEntry) {
        const gdefTable = uncompressTable(data, gdefTableEntry);
        font.tables.gdef = gdef.parse(gdefTable.data, gdefTable.offset);
    }

    if (gposTableEntry) {
        const gposTable = uncompressTable(data, gposTableEntry);
        font.tables.gpos = gpos.parse(gposTable.data, gposTable.offset);
        font.position.init();
    }

    if (gsubTableEntry) {
        const gsubTable = uncompressTable(data, gsubTableEntry);
        font.tables.gsub = gsub.parse(gsubTable.data, gsubTable.offset);
    }

    if (fvarTableEntry) {
        const fvarTable = uncompressTable(data, fvarTableEntry);
        font.tables.fvar = fvar.parse(fvarTable.data, fvarTable.offset, font.names);
    }

    if (statTableEntry) {
        const statTable = uncompressTable(data, statTableEntry);
        font.tables.stat = stat.parse(statTable.data, statTable.offset, font.tables.fvar);
    }

    if (gvarTableEntry) {
        if (!fvarTableEntry) {
          console.warn(`[font] present a gvar table, but no fvar table, which is required for variable fonts.`);
        }
        if (!glyfTableEntry) {
          console.warn(`[font] present a gvar table, but no glyf table. Glyph variation only works with TrueType outlines.`);
        }
        const gvarTable = uncompressTable(data, gvarTableEntry);
        font.tables.gvar = gvar.parse(gvarTable.data, gvarTable.offset, font.names);
    }

    if (avarTableEntry) {
        if (!fvarTableEntry) {
          console.warn(`[font] present an avar table, but no fvar table, which is required for variable fonts.`);
        }
        const avarTable = uncompressTable(data, avarTableEntry);
        font.tables.avar = avar.parse(avarTable.data, avarTable.offset, font.tables.fvar);
    }

    if (metaTableEntry) {
        const metaTable = uncompressTable(data, metaTableEntry);
        font.tables.meta = meta.parse(metaTable.data, metaTable.offset);
        font.metas = font.tables.meta;
    }

    return font;
}

export {
    Font,
    Glyph,
    Path,
    BoundingBox,
    parse as _parse,
    parseBuffer as parse,
    parseBuffer,
};

export {
  loadFromUrl,
  loadUsingDomFetchMethod,
  loadUsingDomXmlHttpRequest,
};

// TODO rid of these
export {
  load ,
} from "./opentype_sv.mjs" ;
