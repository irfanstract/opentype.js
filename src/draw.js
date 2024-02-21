// Drawing utility functions.

/**
 * Draw a line on the given context from point `x1,y1` to point `x2,y2`.
 * 
 * @type {(ctx: CanvasRenderingContext2D, ...coordData: [x1: number, y1: number, x2: number, y2: number] ) => void }
 */
function line(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

export default { line };
