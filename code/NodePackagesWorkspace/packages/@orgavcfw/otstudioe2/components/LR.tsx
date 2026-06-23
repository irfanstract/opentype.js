
/**
 * this file doesn't `export` anything.
 * this file is merely here written to call {@link setTimeout} call {@link location.reload} when ran/loaded.
 * 
 * Webpack HMR disconnects upon the device going to sleep without any subsequent attempt to reconnect. all this is to force automatic reconnection upon waking up.
 * 
 */
"use client";

setTimeout(() => location.reload(), 7.5 * 60 * 1000 );
console.warn(`page will eventually reload.`);




export default () => <></> ;
