import React, { useRef, useState } from "react";
import styled from "styled-components";

const Page = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-size: 24px;
  color: #333;
`;

const CameraContainer = styled.div`
  width: 100%;
  max-width: 500px;
  margin-bottom: 20px;
`;

const Video = styled.video`
  width: 100%;
`;

const Canvas = styled.canvas`
  display: none;
`;

const Button = styled.button`
  padding: 10px 20px;
  font-size: 18px;
  cursor: pointer;
  margin-bottom: 10px;
`;

const Message = styled.p`
  margin-top: 10px;
  font-size: 16px;
  color: #4caf50;
`;

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [message, setMessage] = useState("");

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: "environment" },
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setMessage("Error accessing camera. Please try again.");
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);

      const imageData = canvas.toDataURL("image/jpeg");
      sendImageToServer(imageData);
    }
  };

  const sendImageToServer = async (imageData) => {
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
        let result = await response.text();
        result = result.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
        console.log(result);
        downloadICSFile(result);
        setMessage("ICS file downloaded successfully!");
      } else {
        console.error("Server error:", response.statusText);
        setMessage("Error generating reminder. Please try again.");
      }
    } catch (error) {
      console.error("Error sending image to server:", error);
      setMessage("Error sending image to server. Please try again.");
    }
  };

  const downloadICSFile = (icsContent) => {
    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "reminder.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Page>
      <CameraContainer>
        <Video ref={videoRef} autoPlay playsInline />
        <Canvas ref={canvasRef} />
      </CameraContainer>
      {!cameraActive ? (
        <Button onClick={startCamera}>Start Camera</Button>
      ) : (
        <Button onClick={takePhoto}>Take Photo</Button>
      )}
      {message && <Message>{message}</Message>}
    </Page>
  );
}

export default App;
