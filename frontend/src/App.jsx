import { useState } from 'react';
import './App.css';
import ImageConverter from './ImageConverter.jsx';
import VideoConverter from './VideoConverter.jsx';

function App() {
  const [mode, setMode] = useState(null);

  if (mode === 'image') {
    return <ImageConverter onHome={() => setMode(null)} />;
  }
  if (mode === 'video') {
    return <VideoConverter onHome={() => setMode(null)} />;
  }

  return (
    <div className="container">
      <h1 className="title">Media Tools</h1>
      <div className="buttons">
        <button onClick={() => setMode('image')}>Resim Yükle</button>
        <button onClick={() => setMode('video')}>Video Yükle</button>
      </div>
    </div>
  );
}

export default App;
