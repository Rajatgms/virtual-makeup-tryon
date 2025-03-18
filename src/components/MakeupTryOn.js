import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import ProductSelector from './ProductSelector';
import { initializeFaceDetection, detectFaceLandmarks, applyLipstick } from './FaceProcessor';

const MakeupTryOn = () => {
  const [inputMethod, setInputMethod] = useState('webcam');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [faceDetectionModel, setFaceDetectionModel] = useState(null);

  const webcamRef = useRef(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const animationRef = useRef(null);

  // Initialize face detection model
  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsModelLoading(true);
        const model = await initializeFaceDetection();
        setFaceDetectionModel(model);
        setIsModelLoading(false);
      } catch (error) {
        console.error('Error loading face detection model:', error);
        setErrorMessage('Failed to load face detection model. Please refresh the page and try again.');
        setIsModelLoading(false);
      }
    };

    loadModel();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Run face processing when input method, captured image, or selected product changes
  useEffect(() => {
    // Process face and apply makeup
    const processFace = async () => {
      if (isModelLoading || !faceDetectionModel) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      try {
        // Get current image - either webcam or uploaded image
        const currentImage = inputMethod === 'webcam' && !capturedImage
            ? webcamRef.current.video
            : imageRef.current;

        if (!currentImage) return;

        // Set canvas dimensions to match image
        canvas.width = currentImage.width || currentImage.videoWidth;
        canvas.height = currentImage.height || currentImage.videoHeight;

        // Draw the current image to canvas first
        ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);

        // Get image data for processing
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Detect face landmarks
        const face = await detectFaceLandmarks(faceDetectionModel, currentImage);

        if (face && selectedProduct) {
          // Apply lipstick if a product is selected
          const processedImageData = applyLipstick(
              ctx,
              imageData,
              face,
              selectedProduct.color,
              0.7
          );

          // Put processed image data back to canvas
          ctx.putImageData(processedImageData, 0, 0);
        } else {
          // If no face detected or no product selected, just draw original image
          ctx.putImageData(imageData, 0, 0);
        }

        // If using webcam and not captured, continue processing frames
        if (inputMethod === 'webcam' && !capturedImage) {
          animationRef.current = requestAnimationFrame(processFace);
        }

      } catch (error) {
        console.error('Error processing face:', error);
        setErrorMessage('Failed to process face. Please try again with a clearer image.');
      }
    };
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // Wait for image to load before processing
    if (capturedImage || inputMethod === 'upload') {
      if (imageRef.current?.complete) {
        processFace();
      } else if (imageRef.current) {
        imageRef.current.onload = processFace;
      }
    } else if (inputMethod === 'webcam' && webcamRef.current?.video?.readyState === 4) {
      processFace();
    }
  }, [inputMethod, capturedImage, selectedProduct]);

  // Handle webcam load
  const handleWebcamLoad = () => {
    // Process face and apply makeup
    const processFace = async () => {
      if (isModelLoading || !faceDetectionModel) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      try {
        // Get current image - either webcam or uploaded image
        const currentImage = inputMethod === 'webcam' && !capturedImage
            ? webcamRef.current.video
            : imageRef.current;

        if (!currentImage) return;

        // Set canvas dimensions to match image
        canvas.width = currentImage.width || currentImage.videoWidth;
        canvas.height = currentImage.height || currentImage.videoHeight;

        // Draw the current image to canvas first
        ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);

        // Get image data for processing
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Detect face landmarks
        const face = await detectFaceLandmarks(faceDetectionModel, currentImage);

        if (face && selectedProduct) {
          // Apply lipstick if a product is selected
          const processedImageData = applyLipstick(
              ctx,
              imageData,
              face,
              selectedProduct.color,
              0.7
          );

          // Put processed image data back to canvas
          ctx.putImageData(processedImageData, 0, 0);
        } else {
          // If no face detected or no product selected, just draw original image
          ctx.putImageData(imageData, 0, 0);
        }

        // If using webcam and not captured, continue processing frames
        if (inputMethod === 'webcam' && !capturedImage) {
          animationRef.current = requestAnimationFrame(processFace);
        }

      } catch (error) {
        console.error('Error processing face:', error);
        setErrorMessage('Failed to process face. Please try again with a clearer image.');
      }
    };
    if (inputMethod === 'webcam' && !capturedImage) {
      processFace();
    }
  };

  // Capture image from webcam
  const handleCapture = () => {
    if (webcamRef.current) {
      const screenshot = webcamRef.current.getScreenshot();
      setCapturedImage(screenshot);
    }
  };

  // Reset to webcam mode
  const handleRetake = () => {
    setCapturedImage(null);
  };

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target.result);
        setInputMethod('upload');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
      <div className="tryOn-container">
        <div className="input-controls">
          <button
              className={`btn ${inputMethod === 'webcam' ? '' : 'btn-secondary'}`}
              onClick={() => setInputMethod('webcam')}
          >
            Use Webcam
          </button>
          <button
              className={`btn ${inputMethod === 'upload' ? '' : 'btn-secondary'}`}
              onClick={() => fileInputRef.current.click()}
          >
            Upload Photo
          </button>
          <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
          />
        </div>

        {isModelLoading && (
            <div className="loading-indicator">Loading face detection model...</div>
        )}

        {errorMessage && (
            <div className="error-message">{errorMessage}</div>
        )}

        <div className="webcam-container">
          {inputMethod === 'webcam' && !capturedImage ? (
              <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: "user" }}
                  onLoadedMetadata={handleWebcamLoad}
                  mirrored={true}
              />
          ) : (
              <img
                  ref={imageRef}
                  src={capturedImage}
                  alt="Captured"
                  style={{ display: 'block', width: '100%' }}
              />
          )}

          <canvas
              ref={canvasRef}
              className="canvas-overlay"
          />

          {inputMethod === 'webcam' && !capturedImage ? (
              <button className="btn" onClick={handleCapture}>Capture Photo</button>
          ) : (
              <button className="btn" onClick={handleRetake}>Take New Photo</button>
          )}
        </div>

        <ProductSelector
            selectedProduct={selectedProduct}
            onSelectProduct={setSelectedProduct}
        />
      </div>
  );
};

export default MakeupTryOn;
