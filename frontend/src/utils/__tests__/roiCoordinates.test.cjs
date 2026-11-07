const assert = require('assert');

// Inlined logic to test pure functions directly under Node
function calculateContainedImageBounds(containerWidth, containerHeight, naturalWidth, naturalHeight) {
  const containerAspect = containerWidth / containerHeight;
  const naturalAspect = naturalWidth / naturalHeight;
  let renderW, renderH;

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

function screenToNatural(clickX, clickY, containerWidth, containerHeight, naturalWidth, naturalHeight, transform) {
  const { zoom, panX, panY } = transform;
  const unpannedX = clickX - panX;
  const unpannedY = clickY - panY;

  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;

  const unzoomedX = (unpannedX - centerX) / zoom + centerX;
  const unzoomedY = (unpannedY - centerY) / zoom + centerY;

  const bounds = calculateContainedImageBounds(containerWidth, containerHeight, naturalWidth, naturalHeight);

  const normX = (unzoomedX - bounds.left) / bounds.width;
  const normY = (unzoomedY - bounds.top) / bounds.height;

  const natX = Math.round(normX * naturalWidth);
  const natY = Math.round(normY * naturalHeight);

  return {
    x: Math.max(0, Math.min(naturalWidth, natX)),
    y: Math.max(0, Math.min(naturalHeight, natY)),
  };
}

function naturalToScreen(natX, natY, containerWidth, containerHeight, naturalWidth, naturalHeight, transform) {
  const { zoom, panX, panY } = transform;
  const bounds = calculateContainedImageBounds(containerWidth, containerHeight, naturalWidth, naturalHeight);

  const normX = natX / naturalWidth;
  const normY = natY / naturalHeight;

  const containedX = bounds.left + normX * bounds.width;
  const containedY = bounds.top + normY * bounds.height;

  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;

  const zoomedX = (containedX - centerX) * zoom + centerX;
  const zoomedY = (containedY - centerY) * zoom + centerY;

  return {
    x: Math.round(zoomedX + panX),
    y: Math.round(zoomedY + panY),
  };
}

function clampRoi(roi, naturalWidth, naturalHeight, minDimension = 8) {
  const maxW = Math.max(minDimension, naturalWidth);
  const maxH = Math.max(minDimension, naturalHeight);

  const w = Math.max(minDimension, Math.min(maxW, Math.round(roi.width)));
  const h = Math.max(minDimension, Math.min(maxH, Math.round(roi.height)));

  const x = Math.max(0, Math.min(naturalWidth - w, Math.round(roi.x)));
  const y = Math.max(0, Math.min(naturalHeight - h, Math.round(roi.y)));

  return { x, y, width: w, height: h };
}

console.log("Running ROI Coordinate Conversion Unit Tests...");

// Test 1: Contained bounds on 600x400 image in 800x600 container
const b1 = calculateContainedImageBounds(800, 600, 600, 400);
assert.strictEqual(b1.width, 800);
assert.strictEqual(b1.height, 533.3333333333334);
assert.strictEqual(b1.left, 0);
assert.strictEqual(Math.round(b1.top), 33);
console.log("✓ Test 1 Passed: calculateContainedImageBounds");

// Test 2: Center coordinate maps to center of natural image
const cNat = screenToNatural(400, 300, 800, 600, 600, 400, { zoom: 1, panX: 0, panY: 0 });
assert.strictEqual(cNat.x, 300);
assert.strictEqual(cNat.y, 200);
console.log("✓ Test 2 Passed: Center coordinate 1:1 mapping");

// Test 3: Round-trip transformation at 2.5x zoom and 40px pan
const origNatX = 150;
const origNatY = 220;
const transform = { zoom: 2.5, panX: 45, panY: -30 };
const scr = naturalToScreen(origNatX, origNatY, 800, 600, 600, 400, transform);
const roundTrip = screenToNatural(scr.x, scr.y, 800, 600, 600, 400, transform);
assert.strictEqual(roundTrip.x, origNatX);
assert.strictEqual(roundTrip.y, origNatY);
console.log("✓ Test 3 Passed: Round-trip natural <-> screen mapping with zoom & pan");

// Test 4: ROI Clamping out-of-bounds
const clamped = clampRoi({ x: -20, y: 390, width: 200, height: 100 }, 600, 400);
assert.strictEqual(clamped.x, 0); // clamped to 0
assert.strictEqual(clamped.y, 300); // 400 - 100
assert.strictEqual(clamped.width, 200);
assert.strictEqual(clamped.height, 100);
console.log("✓ Test 4 Passed: ROI clamping within natural image bounds");

console.log("\nALL ROI COORDINATE TESTS PASSED SUCCESSFULLY!");

