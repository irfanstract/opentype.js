import assert from 'assert';
import { Font, Path, Glyph, parse } from '../src/opentype_sv.mjs';
import { load } from '../src/opentype_sv.mjs';
import { readFileSync } from 'fs';

class OtfParseError extends TypeError {}

const loadSync = (url, opt) => {
    const b = readFileSync(url) ;
    return (() => {
        try { return parse(b, opt) ; }
        catch (z) { throw new OtfParseError(z.message, z ) ; }
    })() ;
};

/**
 * `Promise`-based AJAX/XHR tests
 * failed due to the test-FW's relatively strict time-out policy and therefore
 * needs to be disabled for now
 * 
 * @type {boolean}
 */
export let disableAsyncAjaxRequestTests = true ;

describe('opentype_sv.mjs', function() {
    ;

    /** @type {(f: Font) => void } */
    function checkFontsRobotoBlackTtfOk (font)
    {
        assert.deepEqual(font.names.macintosh.fontFamily, {en: 'Roboto Black'});
        assert.deepEqual(font.names.windows.fontFamily, {en: 'Roboto Black'});
        assert.equal(font.unitsPerEm, 2048);
        assert.equal(font.glyphs.length, 1294);
        const aGlyph = font.charToGlyph('A');
        assert.equal(aGlyph.unicode, 65);
        assert.equal(aGlyph.path.commands.length, 15);
    }

    /** @type {(f: Font) => void } */
    function checkFontsFiraSansMediumWoffCffOk (font)
    {
        ;
        assert.deepEqual(font.names.macintosh.fontFamily, {en: 'Fira Sans OT'});
        assert.deepEqual(font.names.windows.fontFamily, {en: 'Fira Sans OT'});
        assert.equal(font.unitsPerEm, 1000);
        assert.equal(font.glyphs.length, 1147);
        const aGlyph = font.charToGlyph('A');
        assert.equal(aGlyph.name, 'A');
        assert.equal(aGlyph.unicode, 65);
        assert.equal(aGlyph.path.commands.length, 14);
    }

    /** @type {(f: Font) => void } */
    function checkFontsFiraSansMediumOtfCffOk (font)
    {
        ;
        assert.deepEqual(font.names.macintosh.fontFamily, {en: 'Fira Sans OT Medium'});
        assert.deepEqual(font.names.windows.fontFamily, {en: 'Fira Sans OT Medium'});
        assert.equal(font.unitsPerEm, 1000);
        assert.equal(font.glyphs.length, 1151);
        const aGlyph = font.charToGlyph('A');
        assert.equal(aGlyph.name, 'A');
        assert.equal(aGlyph.unicode, 65);
        assert.equal(aGlyph.path.commands.length, 14);
    }

    it('can load a TrueType font', function() {
        const font = loadSync('./test/fonts/Roboto-Black.ttf');
        checkFontsRobotoBlackTtfOk(font);
    });

    disableAsyncAjaxRequestTests || it('[deprecated] .load() promise resolve uppon success', function(done) {
        load('./test/fonts/Roboto-Black.ttf').then((font) => {
            ;
            checkFontsRobotoBlackTtfOk(font);
            done();
        });
    });
    
    disableAsyncAjaxRequestTests || it('can asynchronously load a font from URL in Node context', function(done) {
        load('https://opentype_sv.mjs.org/fonts/FiraSansMedium.woff', null, { isUrl: true }).then((font) => {
            checkFontsFiraSansMediumWoffCffOk(font);
            done();
        }).catch(error => {
            console.log(error);
        });
    });
    
    /* test broken. */
    0 && it('can synchronously load a font from URL in Node context', function() {
        const font = loadSync('https://opentype_sv.mjs.org/fonts/FiraSansMedium.woff');
        checkFontsRobotoBlackTtfOk(font);
    });

    it('can load a OpenType/CFF font', function() {
        const font = loadSync('./test/fonts/FiraSansOT-Medium.otf');
        checkFontsFiraSansMediumOtfCffOk(font);
    });

    it('can load a CID-keyed font', function() {
        const font = loadSync('./test/fonts/FDArrayTest257.otf');
        assert.deepEqual(font.names.windows.fontFamily, {en: 'FDArray Test 257'});
        assert.deepEqual(font.tables.cff.topDict.ros, ['Adobe', 'Identity', 0]);
        assert.equal(font.tables.cff.topDict._fdArray.length, 256);
        assert.equal(font.tables.cff.topDict._fdSelect[0], 0);
        assert.equal(font.tables.cff.topDict._fdSelect[42], 41);
        assert.equal(font.tables.cff.topDict._fdSelect[256], 255);
        assert.equal(font.unitsPerEm, 1000);
        assert.equal(font.glyphs.length, 257);
        const aGlyph = font.glyphs.get(2);
        assert.equal(aGlyph.name, 'cid00002');
        assert.equal(aGlyph.unicode, 1);
        assert.equal(aGlyph.path.commands.length, 24);
        assert.deepEqual(font.stringToGlyphIndexes('🌺'), [59]);
    });

    it('can load a WOFF/CFF font', function() {
        const font = loadSync('./test/fonts/FiraSansMedium.woff');
        checkFontsFiraSansMediumWoffCffOk(font);
    });

    it('[deprecated] .load() handles a parseBuffer error', function() {
        assert( (() => {
            try { loadSync('./test/fonts/badfont.otf') ; }
            catch (z) { console.info(String(z) ) ; if (z instanceof OtfParseError ) { return true ; } }
            return false ;
        })() , ) ;
    });

    disableAsyncAjaxRequestTests || it('[deprecated] .load() handles a parseBuffer error as a rejected promise', function(done) {
        load('./test/fonts/badfont.ttf')
            .catch((err) => {
                if (err) {
                    done();
                }
            });
    });

    it('throws an error when advanceWidth is not set', function() {
        const notdefGlyph = new Glyph({
            name: '.notdef',
            unicode: 0,
            path: new Path()
        });
        const font = new Font({
            familyName: 'MyFont',
            styleName: 'Medium',
            unitsPerEm: 1000,
            ascender: 800,
            descender: -200,
            glyphs: [notdefGlyph]
        });
        assert.throws(function() { font.toArrayBuffer(); }, /advanceWidth is not a number/);
    });
});

describe('opentype_sv.mjs on low memory mode', function() {
    const opt = { lowMemory: true };

    it('can load a TrueType font', function() {
        const font = loadSync('./test/fonts/Roboto-Black.ttf', opt);
        assert.deepEqual(font.names.macintosh.fontFamily, {en: 'Roboto Black'});
        assert.deepEqual(font.names.windows.fontFamily, {en: 'Roboto Black'});
        assert.equal(font.unitsPerEm, 2048);
        assert.equal(font.glyphs.length, 0);
        const aGlyph = font.charToGlyph('A');
        assert.equal(aGlyph.unicode, 65);
        assert.equal(aGlyph.path.commands.length, 15);
    });

    it('can load a OpenType/CFF font', function() {
        const font = loadSync('./test/fonts/FiraSansOT-Medium.otf', opt);
        assert.deepEqual(font.names.macintosh.fontFamily, {en: 'Fira Sans OT Medium'});
        assert.deepEqual(font.names.windows.fontFamily, {en: 'Fira Sans OT Medium'});
        assert.equal(font.unitsPerEm, 1000);
        assert.equal(font.glyphs.length, 0);
        const aGlyph = font.charToGlyph('A');
        assert.equal(aGlyph.name, 'A');
        assert.equal(aGlyph.unicode, 65);
        assert.equal(aGlyph.path.commands.length, 14);
    });

    it('can load a CID-keyed font', function() {
        const font = loadSync('./test/fonts/FDArrayTest257.otf', opt);
        assert.deepEqual(font.names.windows.fontFamily, {en: 'FDArray Test 257'});
        assert.deepEqual(font.tables.cff.topDict.ros, ['Adobe', 'Identity', 0]);
        assert.equal(font.tables.cff.topDict._fdArray.length, 256);
        assert.equal(font.tables.cff.topDict._fdSelect[0], 0);
        assert.equal(font.tables.cff.topDict._fdSelect[42], 41);
        assert.equal(font.tables.cff.topDict._fdSelect[256], 255);
        assert.equal(font.unitsPerEm, 1000);
        assert.equal(font.glyphs.length, 0);
        const aGlyph = font.glyphs.get(2);
        assert.equal(aGlyph.name, 'cid00002');
        assert.equal(aGlyph.unicode, 1);
        assert.equal(aGlyph.path.commands.length, 24);
        assert.deepEqual(font.stringToGlyphIndexes('🌺'), [59]);
    });

    it('can load a WOFF/CFF font', function() {
        const font = loadSync('./test/fonts/FiraSansMedium.woff', opt);
        assert.deepEqual(font.names.macintosh.fontFamily, {en: 'Fira Sans OT'});
        assert.deepEqual(font.names.windows.fontFamily, {en: 'Fira Sans OT'});
        assert.equal(font.unitsPerEm, 1000);
        assert.equal(font.glyphs.length, 0);
        const aGlyph = font.charToGlyph('A');
        assert.equal(aGlyph.name, 'A');
        assert.equal(aGlyph.unicode, 65);
        assert.equal(aGlyph.path.commands.length, 14);
    });

    it('handles a parseBuffer error', function(done, fail) {
        try{
            const font = loadSync('./test/fonts/badfont.otf', opt);
            fail();
        } catch(e) {
            done();
        }
    }, opt);

    it('throws an error when advanceWidth is not set', function() {
        const notdefGlyph = new Glyph({
            name: '.notdef',
            unicode: 0,
            path: new Path()
        });
        const font = new Font({
            familyName: 'MyFont',
            styleName: 'Medium',
            unitsPerEm: 1000,
            ascender: 800,
            descender: -200,
            glyphs: [notdefGlyph]
        });
        assert.throws(function() { font.toArrayBuffer(); }, /advanceWidth is not a number/);
    });

    it('should force unicode undefined for .notdef glyph', function() {
        const nullGlyph = new Glyph({
            name: '.notdef',
            path: new Path()
        });
        const font = new Font({
            familyName: 'TestFont',
            styleName: 'Medium',
            unitsPerEm: 1000,
            ascender: 800,
            descender: -200,
            glyphs: [nullGlyph]
        });
        const ndGlyph = font.glyphs.get(0);
        assert.equal(ndGlyph.name, '.notdef');
        assert.equal(ndGlyph.unicode, undefined);
    });

    it('should correctly set unicode 0 for .null glyph', function() {
        const nullGlyph = new Glyph({
            name: '.null',
            unicode: 0,
            path: new Path()
        });
        const font = new Font({
            familyName: 'TestFont',
            styleName: 'Medium',
            unitsPerEm: 1000,
            ascender: 800,
            descender: -200,
            glyphs: [nullGlyph]
        });
        const ndGlyph = font.glyphs.get(0);
        assert.equal(ndGlyph.name, '.null');
        assert.equal(ndGlyph.unicode, 0);
    });

    it('should force unicode 0 for .null glyph', function() {
        const nullGlyph = new Glyph({
            name: '.null',
            path: new Path()
        });
        const font = new Font({
            familyName: 'TestFont',
            styleName: 'Medium',
            unitsPerEm: 1000,
            ascender: 800,
            descender: -200,
            glyphs: [nullGlyph]
        });
        const ndGlyph = font.glyphs.get(0);
        assert.equal(ndGlyph.name, '.null');
        assert.equal(ndGlyph.unicode, 0);
    });

    it('should not allow unicode 0 for any other glyph', function() {
        assert.throws(() => {
            new Glyph({
                name: 'space',
                unicode: 0,
                path: new Path()
            });
        }, /The unicode value "0" is reserved for the glyph name ".null" and cannot be used by any other glyph./);
    });
});
