// Canvas stub for server-side rendering compatibility
// This prevents build errors when konva/canvas is imported on the server
// The image editor is client-side only, so this stub is sufficient

const createCanvas = () => ({
  getContext: () => ({
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: [] }),
    putImageData: () => {},
    createImageData: () => ({ data: [] }),
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    fillText: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    fill: () => {},
    measureText: () => ({ width: 0 }),
    transform: () => {},
    rect: () => {},
    clip: () => {},
  }),
  width: 0,
  height: 0,
});

const loadImage = () => Promise.resolve({});

// Export both CommonJS and ES modules format
module.exports = {
  createCanvas,
  loadImage,
  Canvas: createCanvas,
  Image: function() {},
  ImageData: function() {},
  default: {
    createCanvas,
    loadImage,
  }
};

// ES modules export
if (typeof exports !== 'undefined') {
  exports.createCanvas = createCanvas;
  exports.loadImage = loadImage;
  exports.Canvas = createCanvas;
  exports.Image = function() {};
  exports.ImageData = function() {};
}
