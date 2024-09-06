import React, { useRef, useState, useEffect } from "react";
import styled, { keyframes } from "styled-components";

const Page = styled.div`
  position: relative;
  height: 100dvh;
  width: 100vw;
  overflow: hidden;
  background-color: #000;
  display: flex;
  flex-direction: column;
  user-select: none;
`;

const Camera = styled.div`
  flex: 1;
  width: 100%;
  position: relative;
  overflow: hidden;
  touch-action: none;
  border-radius: 2rem 2rem 0 0;
  background-color: rgba(255, 255, 255, 0.2);
  opacity: ${(props) => props.opacity};
  transition: opacity 0.25s ease-in-out;
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform-origin: center;
  z-index: 1;
`;

const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform-origin: center;
  z-index: 2;
  position: absolute;
`;

const Canvas = styled.canvas`
  display: none;
`;

const Controls = styled.div`
  position: absolute;
  height: 8rem;
  display: flex;
  justify-content: center;
  align-items: end;
  z-index: 20;
  bottom: 0;
  padding-bottom: 1.75rem;
  width: 100%;
  background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.5));
`;

const Button = styled.button`
  margin: 0 1.75rem;
  padding: 0.75rem 1.75rem;
  font-size: 1.25rem;
  cursor: pointer;
  background-color: #ffffff;
  border: none;
  border-radius: 2rem;
  color: #000000;
  font-weight: bold;
  transition: transform 0.2s ease-in-out;
  box-shadow: 0 0.5rem 3rem rgba(0, 0, 0, 0.86);
  flex: 1;

  &:active {
    transform: scale(0.95);
  }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const Spinner = styled.div`
  border: 4px solid rgba(255, 255, 255, 0.2);
  border-top: 4px solid #ffffff;
  border-radius: 50%;
  width: 2.5rem;
  height: 2.5rem;
  animation: ${spin} 1s linear infinite;
`;

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scale, setScale] = useState(3);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const scaleRef = useRef(3);
  const translateXRef = useRef(0);
  const translateYRef = useRef(0);
  const [initialDistance, setInitialDistance] = useState(null);
  const lastPinchCenter = useRef({ x: 0, y: 0 });
  const animationRef = useRef(null);
  const velocityRef = useRef({ scale: 0, x: 0, y: 0 });
  const [isCameraFrozen, setIsCameraFrozen] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const startCamera = async () => {
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: "environment" },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setTimeout(() => {
        setIsCameraReady(true);
      }, 500);
    } catch (err) {
      console.error("Error: ", err);
    }
  };

  useEffect(() => {
    startCamera();
  }, []);

  const takePhotoAndSend = async () => {
    setIsCapturing(true);
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const zoomedWidth = canvas.width / scaleRef.current;
      const zoomedHeight = canvas.height / scaleRef.current;
      const startX = (canvas.width - zoomedWidth) / 2 - translateXRef.current;
      const startY = (canvas.height - zoomedHeight) / 2 - translateYRef.current;

      ctx.drawImage(
        video,
        startX,
        startY,
        zoomedWidth,
        zoomedHeight,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const imageData = canvas.toDataURL("image/jpeg");
      setCapturedImage(imageData);
      setIsCameraFrozen(true);
      setIsCapturing(false);
      await sendImageToServer(imageData);
    }
  };

  const sendImageToServer = async (imageData) => {
    if (!imageData) {
      return;
    }

    setIsLoading(true);

    try {
      const base64Data = imageData.split(",")[1];
      const response = await fetch(
        "https://parking-sign-reminder-generator-server.noshado.ws/generate-reminder",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ base64Image: base64Data }),
        }
      );

      if (response.ok) {
        let result = await response.json();

        if (result && result.timeAndDateFound) {
          downloadICSFile(result.calendarFileData);
          resetCamera();
        } else {
          alert("No parking sign found in the image!");
          resetCamera();
        }
      } else {
        console.error("Error: ", response.statusText);
        resetCamera();
      }
    } catch (error) {
      console.error("Error: ", error);
      resetCamera();
    } finally {
      setIsLoading(false);
    }
  };

  const downloadICSFile = (icsContent) => {
    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, -5);
    link.href = url;
    link.download = `reminder_${timestamp}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetCamera = async () => {
    setIsCameraFrozen(false);
    setCapturedImage(null);
    setScale(3);
    setTranslateX(0);
    setTranslateY(0);
    scaleRef.current = 3;
    translateXRef.current = 0;
    translateYRef.current = 0;

    try {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: "environment" },
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error: ", err);
    }
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const distance = getDistance(e.touches[0], e.touches[1]);
      setInitialDistance(distance);
      lastPinchCenter.current = getPinchCenter(e.touches[0], e.touches[1]);
    }
    velocityRef.current = { scale: 0, x: 0, y: 0 };
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && initialDistance !== null) {
      const distance = getDistance(e.touches[0], e.touches[1]);
      const newScale = scaleRef.current * (distance / initialDistance);
      const clampedScale = Math.min(Math.max(newScale, 1), 3);
      const scaleDiff = clampedScale - scaleRef.current;

      scaleRef.current = clampedScale;
      setScale(clampedScale);

      if (scaleDiff < 0) {
        const newTranslateX = 0;
        const newTranslateY = 0;

        translateXRef.current = newTranslateX;
        translateYRef.current = newTranslateY;

        setTranslateX(newTranslateX);
        setTranslateY(newTranslateY);
      }

      velocityRef.current = {
        scale: clampedScale - scale,
        x: translateXRef.current - translateX,
        y: translateYRef.current - translateY,
      };
    }
  };

  const handleTouchEnd = () => {
    setInitialDistance(null);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animateInertia();
  };

  const animateInertia = () => {
    const friction = 0.95;
    velocityRef.current.scale *= friction;
    velocityRef.current.x *= friction;
    velocityRef.current.y *= friction;

    const newScale = Math.min(
      Math.max(scaleRef.current + velocityRef.current.scale, 1),
      3
    );
    const newTranslateX = translateXRef.current + velocityRef.current.x;
    const newTranslateY = translateYRef.current + velocityRef.current.y;

    scaleRef.current = newScale;
    translateXRef.current = newTranslateX;
    translateYRef.current = newTranslateY;

    setScale(newScale);
    setTranslateX(newTranslateX);
    setTranslateY(newTranslateY);

    if (
      Math.abs(velocityRef.current.scale) > 0.001 ||
      Math.abs(velocityRef.current.x) > 0.001 ||
      Math.abs(velocityRef.current.y) > 0.001
    ) {
      animationRef.current = requestAnimationFrame(animateInertia);
    }
  };

  const getDistance = (touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getPinchCenter = (touch1, touch2) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  };

  return (
    <Page>
      <Camera
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        opacity={isCameraReady ? (capturedImage ? 0.5 : 1) : 0}
      >
        {capturedImage && <Image src={capturedImage} alt="Captured" />}
        <Video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
            opacity: isCapturing ? 0 : 1,
          }}
        />
        <Canvas ref={canvasRef} />
      </Camera>
      <Controls>
        {isLoading || isCameraFrozen || isCapturing ? (
          <Spinner />
        ) : (
          <Button onClick={takePhotoAndSend}>Scan</Button>
        )}
      </Controls>
    </Page>
  );
}

export default App;
