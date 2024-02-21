// opentype.js
// https://github.com/opentypejs/opentype.js
// (c) 2015 Frederik De Bleser
// opentype.js may be freely distributed under the MIT license.

/**
 * The opentype library.
 * @namespace opentype
 */




import { athrow, asNonNull } from './athrow.mjs';

import { parseBuffer, } from './opentype.js';

import Font from './font.js';


import { isNode } from './util.js';

import { readFile, } from "node:fs" ;

import {
  loadFromUrl as loadFromUrlAsInWeb,
  loadUsingDomFetchMethod,
  loadUsingDomXmlHttpRequest,
} from "./opentype.js" ;





// File loaders /////////////////////////////////////////////////////////
/**
 * Node-only ;
 * Loads a font from a file. The callback throws an error message as the first parameter if it fails
 * and the font as an ArrayBuffer in the second parameter if it succeeds.
 * 
 * @type {typeof loadFromUrlAsInWeb }
 * 
 * @param  {string} path - The path of the file
 * 
 */
export function loadFromFile(path, callback)
{
  readFile(path, function(err, buffer) {
      if (err) {
          return callback(err.message);
      }

      callback(null, buffer);
  });
}

/**
 * Node-only ;
 * Loads a font from a URL. The callback throws an error message as the first parameter if it fails
 * and the font as an ArrayBuffer in the second parameter if it succeeds.
 * 
 * @type {typeof loadFromUrlAsInWeb }
 * 
 */
export function loadFromUrl(url, callback)
{
  
  if (typeof fetch !== 'undefined') {
    return loadUsingDomFetchMethod(url, callback) ;
  }

  if (typeof XMLHttpRequest !== 'undefined') {
      // Browser environment, we use XHR.
    return loadUsingDomXmlHttpRequest(url, callback) ;
  }

  if ( isNode() ) {
    // Node environment, we use the http/https libraries (to avoid extra dependencies like axios).

    /** @type {(typeof import("node:https") ) | (typeof import("node:http") ) } */
    const lib = url.startsWith('https:') ? require('https') : require('http');

    const req = lib.request(url, res => {
      // Follow redirections
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
          return loadFromUrl(res.headers.location, callback);
      }
  
      res.setEncoding('binary');
  
      /** @type {Array<any> } */
      const chunks = [];
  
      res.on('data', (chunk) => {
          // Convert binary to Buffer and append.
          chunks.push(Buffer.from(chunk, 'binary'));
      });
  
      res.on('end', () => {
          // group chunks into a single response Buffer
          const b = Buffer.concat(chunks);
          // convert Buffer to ArrayBuffer for compatibility with XHR interface
          const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
          callback(null, ab);
      });
  
      res.on('error', (error) => {
          callback(error);
      });
  
    });

    req.on('error', error => {
        callback(error);
    });

    req.end();

    return ;
  }

  throw new TypeError(`unsupported enviromnent`) ;
}



/**
 * Asynchronously load the font from a URL or a filesystem. When done, call the callback
 * with two arguments `(err, font)`. The `err` will be null on success,
 * the `font` is a Font object.
 * We use the node.js callback convention so that
 * opentype.js can integrate with frameworks like async.js.
 * @alias load
 * @param  {string} url - The URL of the font to load.
 * @param  {Function} callback - The callback.
 * @param  {{ isUrl?: boolean; }} opt - The callback.
 */
export function load(url, callback, opt = {}) {
  const isNode = (
    /**
     * originally used `typeof window === undefined`,
     * but
     * this is unreliable in Deno and Electron and
     * in future Node may pretend there's `window`
     */
    typeof process.pid !== 'undefined'
  );

  /** @type {typeof loadFromUrl } */
  const loadFn = (isNode && !opt.isUrl ) ? loadFromFile : loadFromUrl;

  return (async () => {
    ;

    const buffer = await /** @satisfies {Promise<Buffer | ArrayBuffer> } */ (new Promise((resolve, reject) => {
      loadFn(url, function(err, buffer) {
        (err !== null ) ? reject(err) : resolve(buffer) ;
      } ) ;
    }) ) ;

    const font = parseBuffer(buffer, opt) ;

    return font ;
  })()
  .then(e => callback(e) )
  ;
}

/**
* Synchronously load the font from a URL or file.
* When done, returns the font object or throws an error.
* @alias loadSync
* @param  {string} url - The URL of the font to load.
* @param  {Object} opt - opt.lowMemory
* @return {Font}
*/
export function loadSync(url, opt) {
  return parseBuffer(require('fs').readFileSync(url), opt);
}







export * from "./opentype.js" ;






