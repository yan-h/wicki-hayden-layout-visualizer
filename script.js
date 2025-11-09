const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');
const dpr = window.devicePixelRatio || 1;
const cssWidth = 601;
const cssHeight = 451;

const offset = 0.5 // accounts for the fact that 1px stroke is drawn centered on the pixel

const cellSize = 50; // Square side length

const bottomPadding = cellSize;
const leftPadding = cellSize * 3;

const pivotX = leftPadding + offset - cellSize / 2; // X position of bottom-left corner
const pivotY = cssHeight - bottomPadding - offset - cellSize / 2; // Y position of bottom-left corner

const rows = 6;
const cols = 9;

const decimalPlaces = 8

// Wire up DOM elements
const angleSlider = document.getElementById('angleSlider');
const angleInput = document.getElementById('angleInput');
const skewSlider = document.getElementById('skewSlider');
const skewInput = document.getElementById('skewInput');
const angleConstrain = document.getElementById('angleConstrain');
const skewConstrain = document.getElementById('skewConstrain');

// Function to update constrained values
function updateConstrainedValues() {
  console.log("Cos: "+ Math.cos((-angleInput.value) * Math.PI / 180));
  console.log("Sin: "+ Math.sin((-angleInput.value) * Math.PI / 180));

  // Solve for the following equation. Wolfram alpha works.
  // cos(theta) * (1 - 2 * skew) + 2 * sin(theta) = 0
  // i.e. vertical and horizontal offset due to rotation + skew cancel out, making octaves vertical
  if (angleConstrain.checked) {
    // need to multiply by -1, idk why
    const skewVal = -parseFloat(skewInput.value);
    const newAngleVal = -(180 - 2 * 180 / Math.PI * (Math.atan((Math.sqrt(4 * skewVal * skewVal - 4 * skewVal + 5) + 2)/(1 - 2 * skewVal))))
    angleSlider.value = newAngleVal.toString();
    angleInput.value = newAngleVal.toFixed(decimalPlaces);

    drawAll(parseFloat(angleInput.value));
  } else if (skewConstrain.checked) {
    const angleVal = parseFloat(angleInput.value);
    const newSkewVal = -Math.tan(angleVal * Math.PI / 180) - 0.5;
    skewSlider.value = newSkewVal.toString();
    skewInput.value = newSkewVal.toFixed(decimalPlaces);
    drawAll(parseFloat(angleInput.value));
  } else {
    // No constraints, just draw
    drawAll(parseFloat(angleInput.value));
  }
}

// Set up radio button event listeners
angleConstrain.addEventListener('change', function() {
  if (this.checked) {
    // When angle is constrained, disable angle controls and enable skew controls
    angleSlider.disabled = true;
    angleInput.disabled = true;
    skewSlider.disabled = false;
    skewInput.disabled = false;
    updateConstrainedValues(); // Set initial mirrored value
    optimizeBtn.disabled = false;
  }
});

skewConstrain.addEventListener('change', function() {
  if (this.checked) {
    // When skew is constrained, disable skew controls and enable angle controls
    skewSlider.disabled = true;
    skewInput.disabled = true;
    angleSlider.disabled = false;
    angleInput.disabled = false;
    optimizeBtn.disabled = false;
    updateConstrainedValues(); // Set initial mirrored value
  }
});

// Function to enable all controls (called when radio is unchecked)
function enableAllControls() {
  angleSlider.disabled = false;
  angleInput.disabled = false;
  skewSlider.disabled = false;
  skewInput.disabled = false;
}

// Add event listener for when radio buttons are unchecked
document.getElementsByName('constrain').forEach(radio => {
  radio.addEventListener('change', function() {
    if (!this.checked) {
      enableAllControls();
    }
  });
});
// High-DPI (Retina) scaling so 1px strokes match the 1px CSS border
canvas.style.width = cssWidth + 'px';
canvas.style.height = cssHeight + 'px';
canvas.width = Math.round(cssWidth * dpr);
canvas.height = Math.round(cssHeight * dpr);
ctx.scale(dpr, dpr);

// Draw a fixed background grid (does not rotate with the square)
function drawGrid(cell = 50, subdivisions = 10) {
  ctx.save();
  ctx.clearRect(0, 0, cssWidth, cssHeight); // clear before drawing grid

  const sub = cell / subdivisions;

  // thin subdivision lines
  ctx.beginPath();
  ctx.strokeStyle = '#e6e6e6';
  ctx.lineWidth = 1;
  for (let x = 0; x <= cssWidth; x += sub) {
    const xx = Math.round(x) + offset;
    ctx.moveTo(xx, 0);
    ctx.lineTo(xx, cssHeight);
  }
  for (let y = 0; y <= cssHeight; y += sub) {
    const yy = Math.round(y) + offset;
    ctx.moveTo(0, yy);
    ctx.lineTo(cssWidth, yy);
  }
  ctx.stroke();

  // stronger major grid lines on top
  ctx.beginPath();
  ctx.strokeStyle = '#b6b6b6';
  ctx.lineWidth = 1;
  for (let x = 0; x <= cssWidth; x += cell) {
    const xx = Math.round(x) + offset;
    ctx.moveTo(xx, 0);
    ctx.lineTo(xx, cssHeight);
  }
  for (let y = 0; y <= cssHeight; y += cell) {
    const yy = Math.round(y) + offset;
    ctx.moveTo(0, yy);
    ctx.lineTo(cssWidth, yy);
  }
  ctx.stroke();

  ctx.restore();
}

function drawAll(angleDegrees) {
  const angle = angleDegrees * Math.PI / 180; // convert to radians
  // draw grid first (grid does not rotate)
  drawGrid(50);

  // read skew value (how many cellSize units per row)
  const skew = parseFloat(skewInput?.value) || 0;

  // don't clear after grid; draw square on top
  ctx.save();

  // Move origin to bottom-left corner of square
  ctx.translate(pivotX, pivotY);
  ctx.rotate(angle);

  ctx.strokeStyle = 'black';
  ctx.lineWidth = 1;

  const perfectFourthSize = 5/12;
  const majorSecondSize = 2/12;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // cumulative shift: bottom row (row=0) shift=0, row=1 shift=skew*cellSize, etc.
      const rowShift = skew * row * cellSize;
      const x = col * cellSize + rowShift - cellSize / 2;
      const y = -row * cellSize + cellSize / 2; // negative because canvas y-axis goes down


      // Draw cell
      ctx.strokeRect(x, y - cellSize, cellSize, cellSize);

      if (row == 2 * col) {
        // Highlight cells where row == 2 * col
        ctx.fillStyle = 'rgba(0, 128, 255, 0.3)';
        ctx.fillRect(x, y - cellSize, cellSize, cellSize);
      }

      if (col == (row / 2) + 6 && row % 2 == 0) {
        // Highlight bottom row even columns
        ctx.fillStyle = 'rgba(255, 165, 0, 0.3)';
        ctx.fillRect(x, y - cellSize, cellSize, cellSize);
      }

      // label drawing moved outside rotated context (see below)
    }
  }

  ctx.restore();
  // Draw labels unrotated: compute each cell center's canvas coordinates
  const ca = Math.cos(angle), sa = Math.sin(angle);
  ctx.fillStyle = 'black';
  const fontSize = Math.floor(cellSize * 0.35);
  ctx.font = fontSize + 'px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textOffset = 0.12 * cellSize;

  baseHeight = 0;
  octaveHeight = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const rowShift = skew * row * cellSize;

      const pitch = col * majorSecondSize + row * perfectFourthSize;
      const localX = col * cellSize + rowShift; // center of cell in local coords
      const localY = -row * cellSize;           // center of cell in local coords
      // transform local (rotated) point into canvas coordinates
      const worldX = pivotX  + localX * ca - localY * sa;
      const worldY = pivotY  + localX * sa + localY * ca;


      // Draw pitch value
     // ctx.fillText(parseFloat(pitch).toFixed(2), worldX , worldY - textOffset);

      // height of midpoint of cell, relative to center of origin cell
      const height = (-sa * localX - localY * ca) - (25 * sa - 25 * ca);

      if (row === 0 && col === 0) {
        baseHeight = height; // store base height for reference
        octaveHeight = (-sa * (cellSize + (skew * 2 * cellSize))  + ca * 2 * cellSize);
      }

      displayHeight = ((height - baseHeight) / octaveHeight);
      // Draw height value below the pitch
      ctx.fillText(`${displayHeight.toFixed(3)}`, worldX, worldY - textOffset + fontSize); // offset by fontSize for spacing
    }
  }
}

// Update rotation when slider moves (supports fractional angles)
angleSlider.addEventListener('input', () => {
  const angle = parseFloat(angleSlider.value);
  if (angleInput) angleInput.value = angle.toFixed(decimalPlaces);
  updateConstrainedValues();
});
// Skew slider -> numeric input
skewSlider.addEventListener('input', () => {
  const s = parseFloat(skewSlider.value);
  skewInput.value = s.toFixed(decimalPlaces);
  updateConstrainedValues();
});
// numeric input -> slider
skewInput.addEventListener('keyup', function (e) {
  if (e.key === 'Enter') {
    const v = parseFloat(skewInput.value);
    if (!Number.isNaN(v)) {
      const clamped = Math.max(parseFloat(skewSlider.min), Math.min(parseFloat(skewSlider.max), v));
      skewSlider.value = clamped;
      skewInput.value = clamped.toFixed(decimalPlaces);
    }
      updateConstrainedValues();
  } 
});


// Update slider when numeric input changes (typed by user)
angleInput.addEventListener('keyup', function (e) {
  if (e.key == 'Enter') {
    // allow partial/fractional typing, coerce to number for drawing
    const v = angleInput.value;
    const n = parseFloat(v);
    if (!Number.isNaN(n)) {
      const clamped = Math.max(-45, Math.min(0, n));
      angleSlider.value = clamped;
      if (angleInput) angleInput.value = clamped.toFixed(decimalPlaces);
    }
    updateConstrainedValues();
  }
});

// Initial draw (ensure inputs are synced and show one fractional digit)
const initial = parseFloat(angleSlider.value) || 0;
angleInput.value = (0).toFixed(decimalPlaces);
skewInput.value = (0).toFixed(decimalPlaces);
drawAll(initial);
fifthCents.value = (700).toFixed(decimalPlaces);