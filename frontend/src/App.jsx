import { useState } from 'react';
import './App.css';
import ImageConverter from './ImageConverter.jsx';
import VideoConverter from './VideoConverter.jsx';

function App() {
  const [initImages, setInitImages] = useState(null);
  const [initVideo, setInitVideo] = useState(null);

  const resetHome = () => {
    setInitImages(null);
    setInitVideo(null);
  };

  const handleHomeImage = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      setInitImages(files);
    }
    e.target.value = '';
  };

  const handleHomeVideo = (e) => {
    const file = e.target.files[0];
    if (file) {
      setInitVideo(file);
    }
    e.target.value = '';
  };

  if (initImages) {
    return <ImageConverter onHome={resetHome} initialFiles={initImages} />;
  }
  if (initVideo) {
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
