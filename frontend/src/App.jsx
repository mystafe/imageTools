import { useState, useRef } from 'react';
import ImageTracer from 'imagetracerjs';
import './App.css';

function App() {
  const [imgSrc, setImgSrc] = useState(null);
  const [width, setWidth] = useState(300);
  const [height, setHeight] = useState(300);
  const [fileName, setFileName] = useState('image');
  const canvasRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setWidth(img.width);
        setHeight(img.height);
        setImgSrc(reader.result);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const drawImageToCanvas = () => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve();
      };
      img.src = imgSrc;
    });
  };

  const downloadPNG = async () => {
    if (!imgSrc) return;
    await drawImageToCanvas();
    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName || 'image'}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const downloadSVG = async () => {
    if (!imgSrc) return;
    await drawImageToCanvas();
    const canvas = canvasRef.current;
    const imgd = ImageTracer.getImgdata(canvas);
    const svgString = ImageTracer.imagedataToSVG(imgd);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName || 'image'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadICO = async () => {
    if (!imgSrc) return;
    await drawImageToCanvas();
    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName || 'image'}.ico`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/x-icon');
  };

  return (
    <div className="container">
      <h1>Image Converter</h1>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      {imgSrc && (
        <>
          <div className="controls">
            <label>
              Width: <input type="number" value={width} onChange={(e) => setWidth(parseInt(e.target.value) || 0)} />
            </label>
            <label>
              Height: <input type="number" value={height} onChange={(e) => setHeight(parseInt(e.target.value) || 0)} />
            </label>
            <label>
              File name: <input type="text" value={fileName} onChange={(e) => setFileName(e.target.value)} />
            </label>
          </div>
          <img src={imgSrc} alt="preview" className="preview" />
          <div className="buttons">
            <button onClick={downloadPNG}>Download PNG</button>
            <button onClick={downloadSVG}>Download SVG</button>
            <button onClick={downloadICO}>Download ICO</button>
          </div>
        </>
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}

export default App;
