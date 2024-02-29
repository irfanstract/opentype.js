







/**
 * a contour
 */
type OtjsTtCt = (
  Readonly<{
    points: (
      ReadonlyArray<(
        Readonly<OtjsTtCtpImpl>
      )>
    );
  }>
);

/**
 * a point in a contour
 */
type OtjsTtCtpImpl = { x: number; y: number; onCurve: boolean; lastPointOfContour: LPC; } ;

/**
 * a point in a contour
 */
type OtjsTtCtp = OtjsTtCt["points"][number];









