import * as tf from '@tensorflow/tfjs';
import '@mediapipe/face_mesh';
import '@tensorflow/tfjs-core';
// Register WebGL backend.
import '@tensorflow/tfjs-backend-webgl';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import { hexToRgb, applyLipstickToPixel } from '../utils/colorUtils';

// Initialize TensorFlow.js and Face Landmarks Detection
export const initializeFaceDetection = async () => {
  await tf.ready();

  const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
  const detectorConfig = {
    runtime: 'mediapipe',
    solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
    maxFaces: 1,
    refineLandmarks: true,
    flipHorizontal: false
  };

  const detector = await faceLandmarksDetection.createDetector(model, detectorConfig);
  return detector;
};

// Detect face landmarks in an image
export const detectFaceLandmarks = async (detector, imageElement) => {
  if (!detector || !imageElement) return null;

  const faces = await detector.estimateFaces(imageElement);
  return faces.length > 0 ? faces[0] : null;
};

// Draw face landmarks on canvas
export const drawFaceMesh = (ctx, face, imageWidth, imageHeight) => {
  if (!face || !ctx) return;

  ctx.clearRect(0, 0, imageWidth, imageHeight);

  // Draw all face mesh points
  ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
  face.keypoints.forEach(point => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 1, 0, 2 * Math.PI);
    ctx.fill();
  });
};

// Apply lipstick to the detected lips
export const oldApplyLipstick = (ctx, imageData, face, lipstickColor, opacity = 0.7) => {
  if (!face || !ctx || !imageData) return imageData;

  // Get all keypoints as an array
  const keypoints = face.keypoints;

  // MediaPipe Face Mesh keypoint indices for lips
  // These are the indices for the lip outline in the new API
  // Upper lip indices
  const upperLipIndices = [
    61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291
  ];

  // Lower lip indices
  const lowerLipIndices = [
    146, 91, 181, 84, 17, 314, 405, 321, 375, 291
  ];

  // MediaPipe Face Mesh has 478 keypoints, and we need to find the lip points by their indices
  // Map keypoint indices to their coordinates
  const keypointMap = {};
  keypoints.forEach((keypoint, index) => {
    keypointMap[keypoint.name] = keypoint;
  });

  // Extract lip points using the map
  // The new API might use different naming, so we need to adapt
  // Typically lip keypoints are named like 'lips_x' where x is the index

  // Function to find keypoints by substring in name
  const findKeypointsByPartialName = (substring) => {
    return keypoints.filter(kp => kp.name && kp.name.includes(substring));
  };

  // Get lip keypoints
  const lipKeypoints = findKeypointsByPartialName('lips');

  // If we can't find lip keypoints by name, fall back to the full keypoints list
  // We'll estimate the lip region based on the face box
  if (lipKeypoints.length === 0) {
    // Create a mask for lips based on the face box
    const { box } = face;
    const { xMin, yMin, width, height } = box;

    // Estimate the lip region (typically in the lower third of the face)
    const lipYStart = yMin + height * 0.6;  // 60% down from the top of the face
    const lipYEnd = yMin + height * 0.8;    // 80% down from the top of the face
    const lipXStart = xMin + width * 0.3;   // 30% from the left edge
    const lipXEnd = xMin + width * 0.7;     // 70% from the left edge

    // Create a mask for lips using the estimated region
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(
        (lipXStart + lipXEnd) / 2,     // center x
        (lipYStart + lipYEnd) / 2,     // center y
        (lipXEnd - lipXStart) / 2,     // radius x
        (lipYEnd - lipYStart) / 2,     // radius y
        0, 0, 2 * Math.PI              // rotation, start angle, end angle
    );
    ctx.closePath();
    ctx.clip();
  } else {
    // If we have lip keypoints, create a path with them
    ctx.save();
    ctx.beginPath();

    // Start with the first point
    ctx.moveTo(lipKeypoints[0].x, lipKeypoints[0].y);

    // Draw a path through all lip keypoints
    for (let i = 1; i < lipKeypoints.length; i++) {
      ctx.lineTo(lipKeypoints[i].x, lipKeypoints[i].y);
    }

    // Close the path
    ctx.closePath();
    ctx.clip();
  }

  // Convert hex color to RGB
  const lipstickRGB = hexToRgb(lipstickColor);

  // Apply lipstick to the original image data
  const data = imageData.data;
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const index = (y * imageData.width + x) * 4;

      // Check if the pixel is inside the lip path
      if (ctx.isPointInPath(x, y)) {
        const originalRGB = [data[index], data[index+1], data[index+2]];
        const newRGB = applyLipstickToPixel(originalRGB, lipstickRGB, opacity);

        data[index] = newRGB[0];     // R
        data[index+1] = newRGB[1];   // G
        data[index+2] = newRGB[2];   // B
        // Keep original alpha
      }
    }
  }

  ctx.restore();
  return imageData;
};

// Apply lipstick to the detected lips
export const applyLipstick = (ctx, imageData, face, lipstickColor, opacity = 0.7) => {
  if (!face || !ctx || !imageData) return imageData;

  // Get all keypoints as an array
  const keypoints = face.keypoints;

  // Check if we have the keypoints array
  if (!keypoints || keypoints.length === 0) return imageData;

  // MediaPipe Face Mesh keypoint indices
  // Reordered for better polygon formation based on search results
  // Upper lip indices - ordered to create a proper closed contour
  const upperLipIndices = [267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 0, 37, 39, 40, 185];

  // Lower lip indices - ordered to create a proper closed contour
  const lowerLipIndices = [84, 181, 91, 146, 61, 146, 91, 181, 314, 405, 321, 375, 291];

  // Try to match indices to keypoints
  let upperLipPoints = [];
  let lowerLipPoints = [];

  // Try different approaches to locate lip points

  // Approach 1: Use keypoint indices directly if possible
  // MediaPipe keypoints typically include an index property we can use to match
  if (keypoints[0] && typeof keypoints[0].index === 'number') {
    // Map indices to actual points
    const indexToKeypoint = {};
    keypoints.forEach(kp => {
      indexToKeypoint[kp.index] = kp;
    });

    upperLipPoints = upperLipIndices
        .map(idx => indexToKeypoint[idx])
        .filter(point => point !== undefined)
        .map(point => ({ x: point.x, y: point.y }));

    lowerLipPoints = lowerLipIndices
        .map(idx => indexToKeypoint[idx])
        .filter(point => point !== undefined)
        .map(point => ({ x: point.x, y: point.y }));
  }

  // Approach 2: Try to find lips by name if indices didn't work
  if (upperLipPoints.length === 0 || lowerLipPoints.length === 0) {
    const findKeypointsByPartialName = (substring) => {
      return keypoints.filter(kp => kp.name && kp.name.includes(substring));
    };

    const lipKeypoints = findKeypointsByPartialName('lips');

    if (lipKeypoints.length > 0) {
      // If we found lip keypoints by name, we'll create both upper and lower lip
      // by dividing them based on y-coordinate
      const sortedByY = [...lipKeypoints].sort((a, b) => a.y - b.y);
      const midY = sortedByY[Math.floor(sortedByY.length / 2)].y;

      upperLipPoints = lipKeypoints.filter(kp => kp.y <= midY);
      lowerLipPoints = lipKeypoints.filter(kp => kp.y >= midY);

      // Sort points from left to right to form a proper contour
      upperLipPoints.sort((a, b) => a.x - b.x);
      lowerLipPoints.sort((a, b) => a.x - b.x);
    }
  }

  // Save context state before any modifications
  ctx.save();

  // Convert hex color to RGB
  const lipstickRGB = hexToRgb(lipstickColor);

  // Track whether we've created a valid lip path
  let validLipPath = false;

  // If we have enough points for upper and lower lips, draw proper lip contours
  if (upperLipPoints.length >= 3 && lowerLipPoints.length >= 3) {
    validLipPath = true;

    // Create a path for upper lip
    ctx.beginPath();
    ctx.moveTo(upperLipPoints[0].x, upperLipPoints[0].y);
    for (let i = 1; i < upperLipPoints.length; i++) {
      ctx.lineTo(upperLipPoints[i].x, upperLipPoints[i].y);
    }
    ctx.closePath();

    // Create a path for lower lip and combine with upper lip
    ctx.moveTo(lowerLipPoints[0].x, lowerLipPoints[0].y);
    for (let i = 1; i < lowerLipPoints.length; i++) {
      ctx.lineTo(lowerLipPoints[i].x, lowerLipPoints[i].y);
    }
    ctx.closePath();

    // Create a clipping region for lipstick application
    ctx.clip();
  } else {
    // Fallback to box-based estimation if we couldn't get proper lip points
    const { box } = face;
    if (!box) {
      ctx.restore();
      return imageData;
    }

    const { xMin, yMin, width, height } = box;

    // Estimate the lip region (typically in the lower third of the face)
    const lipYStart = yMin + height * 0.6;  // 60% down from the top of the face
    const lipYEnd = yMin + height * 0.8;    // 80% down from the top of the face
    const lipXStart = xMin + width * 0.3;   // 30% from the left edge
    const lipXEnd = xMin + width * 0.7;     // 70% from the left edge

    // Create a mask for lips using the estimated region
    ctx.beginPath();
    ctx.ellipse(
        (lipXStart + lipXEnd) / 2,     // center x
        (lipYStart + lipYEnd) / 2,     // center y
        (lipXEnd - lipXStart) / 2,     // radius x
        (lipYEnd - lipYStart) / 2 * 0.7, // radius y (slightly flatter)
        0, 0, 2 * Math.PI              // rotation, start angle, end angle
    );
    ctx.closePath();
    ctx.clip();
    validLipPath = true;
  }

  // Only apply lipstick if we created a valid lip path
  if (validLipPath) {
    // Apply lipstick to the original image data with a slight blur effect for natural look
    const data = imageData.data;
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const index = (y * imageData.width + x) * 4;

        // Check if the pixel is inside the lip path
        if (ctx.isPointInPath(x, y)) {
          const originalRGB = [data[index], data[index+1], data[index+2]];
          const newRGB = applyLipstickToPixel(originalRGB, lipstickRGB, opacity);

          data[index] = newRGB[0];     // R
          data[index+1] = newRGB[1];   // G
          data[index+2] = newRGB[2];   // B
          // Keep original alpha
        }
      }
    }
  }

  // Restore context state
  ctx.restore();
  return imageData;
};

