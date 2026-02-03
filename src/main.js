// Entry point - imports and initializes all modules

import { updateGridDimensions } from './constants.js';
import { setOnGridChange } from './grid.js';
import { mapGenerators } from './map-generators.js';
import { initRenderer, fitGridToView, resizeCanvas, draw } from './renderer.js';
import { initInput, updateGoButton } from './input.js';

// Get canvas element
const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('canvas'));

// Initialize renderer
initRenderer(canvas);

// Initialize canvas dimensions
const initialRect = canvas.getBoundingClientRect();
canvas.width = initialRect.width;
canvas.height = initialRect.height;

// Calculate grid dimensions based on canvas size
updateGridDimensions(canvas.width, canvas.height);

// Initialize input handlers (needs to happen before updateGoButton is called)
initInput();

// Set up grid change callback for UI updates
setOnGridChange(updateGoButton);

// Generate initial map
mapGenerators.empty();

// Update UI state after map generation
updateGoButton();

// Fit to view and render
fitGridToView();
draw();

// Handle window resize
window.addEventListener('resize', resizeCanvas);
