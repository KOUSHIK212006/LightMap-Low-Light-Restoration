export interface RoiRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TransformState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface DisplayGeometry {
  clientWidth: number;
  clientHeight: number;
  naturalWidth: number;
  naturalHeight: number;
}

/**
 * Calculates the rendered bounds of an image rendered with object-fit: contain
 * inside a container of dimensions containerWidth x containerHeight.
 */
export function calculateContainedImageBounds(
  containerWidth: number,
  containerHeight: number,
  naturalWidth: number,
  naturalHeight: number
): { left: number; top: number; width: number; height: number } {
  if (containerWidth <= 0 || containerHeight <= 0 || naturalWidth <= 0 || naturalHeight <= 0) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }

  const containerAspect = containerWidth / containerHeight;
  const naturalAspect = naturalWidth / naturalHeight;

  let renderW: number;
  let renderH: number;

  if (naturalAspect > containerAspect) {
    renderW = containerWidth;
    renderH = containerWidth / naturalAspect;
  } else {
    renderH = containerHeight;
    renderW = containerHeight * naturalAspect;
  }

  const left = (containerWidth - renderW) / 2;
  const top = (containerHeight - renderH) / 2;

  return { left, top, width: renderW, height: renderH };
}

/**
 * Converts screen/mouse click coordinates (relative to the container)
 * into natural image pixel coordinates (0 to naturalWidth/naturalHeight),
 * taking into account zoom, pan, and object-fit containment.
 */
export function screenToNatural(
  clickX: number,
  clickY: number,
  containerWidth: number,
  containerHeight: number,
  naturalWidth: number,
  naturalHeight: number,
  transform: TransformState
): { x: number; y: number } {
  const { zoom, panX, panY } = transform;

  // 1. Invert pan
  const unpannedX = clickX - panX;
  const unpannedY = clickY - panY;

  // 2. Invert zoom around container center
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;

  const unzoomedX = (unpannedX - centerX) / zoom + centerX;
  const unzoomedY = (unpannedY - centerY) / zoom + centerY;

  // 3. Invert object-fit: contain
  const bounds = calculateContainedImageBounds(containerWidth, containerHeight, naturalWidth, naturalHeight);

  if (bounds.width <= 0 || bounds.height <= 0) {
    return { x: 0, y: 0 };
  }

  const normX = (unzoomedX - bounds.left) / bounds.width;
  const normY = (unzoomedY - bounds.top) / bounds.height;

  const natX = Math.round(normX * naturalWidth);
  const natY = Math.round(normY * naturalHeight);

  return {
    x: Math.max(0, Math.min(naturalWidth, natX)),
    y: Math.max(0, Math.min(naturalHeight, natY)),
  };
}

/**
 * Converts natural image pixel coordinates into screen coordinates
 * relative to the container.
 */
export function naturalToScreen(
  natX: number,
  natY: number,
  containerWidth: number,
  containerHeight: number,
  naturalWidth: number,
  naturalHeight: number,
  transform: TransformState
): { x: number; y: number } {
  const { zoom, panX, panY } = transform;
  const bounds = calculateContainedImageBounds(containerWidth, containerHeight, naturalWidth, naturalHeight);

  // Normal contained space
  const normX = natX / naturalWidth;
  const normY = natY / naturalHeight;

  const containedX = bounds.left + normX * bounds.width;
  const containedY = bounds.top + normY * bounds.height;

  // Apply zoom from center
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;

  const zoomedX = (containedX - centerX) * zoom + centerX;
  const zoomedY = (containedY - centerY) * zoom + centerY;

  // Apply pan
  return {
    x: Math.round(zoomedX + panX),
    y: Math.round(zoomedY + panY),
  };
}

/**
 * Clamps a given ROI rectangle to stay strictly within the natural image boundaries.
 */
export function clampRoi(
  roi: RoiRect,
  naturalWidth: number,
  naturalHeight: number,
  minDimension: number = 8
): RoiRect {
  const maxW = Math.max(minDimension, naturalWidth);
  const maxH = Math.max(minDimension, naturalHeight);

  const w = Math.max(minDimension, Math.min(maxW, Math.round(roi.width)));
  const h = Math.max(minDimension, Math.min(maxH, Math.round(roi.height)));

  const x = Math.max(0, Math.min(naturalWidth - w, Math.round(roi.x)));
  const y = Math.max(0, Math.min(naturalHeight - h, Math.round(roi.y)));

  return { x, y, width: w, height: h };
}
