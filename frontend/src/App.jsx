import { useState } from 'react';
import './App.css';
import ImageConverter from './ImageConverter.jsx';
import VideoConverter from './VideoConverter.jsx';

function App() {
  const [mode, setMode] = useState(null);
  const [initImages, setInitImages] = useState(null);
  const [initVideo, setInitVideo] = useState(null);

  const resetHome = () => {
    setMode(null);
    setInitImages(null);
    setInitVideo(null);
  };

  const handleHomeImage = (e) => {
    const files = e.target.files;
    if (files && files.length) {
      setInitImages(files);
      setMode('image');
    }
    e.target.value = '';
  };

  const handleHomeVideo = (e) => {
    const file = e.target.files[0];
    if (file) {
      setInitVideo(file);
      setMode('video');
    }
    e.target.value = '';
  };

  if (mode === 'image') {
    return <ImageConverter onHome={resetHome} initialFiles={initImages} />;
  }
  if (mode === 'video') {
    return <VideoConverter onHome={resetHome} initialFile={initVideo} />;
  }

  return (
    <div className="container">
      <h1 className="title">Media Tools</h1>
      <input
        id="home-image-input"
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleHomeImage}
      />
      <input
        id="home-video-input"
        type="file"
        accept="video/*"
        style={{ display: 'none' }}
        onChange={handleHomeVideo}
      />
      <div className="buttons">
        <label htmlFor="home-image-input" className="file-label">Resim Yükle</label>
        <label htmlFor="home-video-input" className="file-label">Video Yükle</label>
      </div>
    </div>
  );
}

export default App;
