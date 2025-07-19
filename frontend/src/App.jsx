import { useState, useRef } from 'react';
import ImageTracer from 'imagetracerjs';
import JSZip from 'jszip';
import './App.css';

function App() {
  const [imgSrc, setImgSrc] = useState(null);
  const [width, setWidth] = useState('300');
  const [height, setHeight] = useState('300');
  const [keepRatio, setKeepRatio] = useState(true);
  const [ratio, setRatio] = useState(1);
  const [fileName, setFileName] = useState('image');
  const [svgCode, setSvgCode] = useState('');
  const [showSvgCode, setShowSvgCode] = useState(false);
  const canvasRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setWidth(String(img.width));
        setHeight(String(img.height));
        setRatio(img.width / img.height);
        setImgSrc(reader.result);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleWidthChange = (e) => {
    const value = e.target.value;
    if (keepRatio && value !== '') {
      const num = parseInt(value);
      if (!isNaN(num)) {
        setHeight(String(Math.round(num / ratio)));
      }
    }
    setWidth(value);
  };

  const handleKeepRatioChange = (e) => {
    const checked = e.target.checked;
    if (checked) {
      const w = parseInt(width);
      const h = parseInt(height);
      if (!isNaN(w) && !isNaN(h) && h !== 0) {
        setRatio(w / h);
      }
    }
    setKeepRatio(checked);
  };

  const handleHeightChange = (e) => {
    const value = e.target.value;
    if (keepRatio && value !== '') {
      const num = parseInt(value);
      if (!isNaN(num)) {
        setWidth(String(Math.round(num * ratio)));
      }
    }
    setHeight(value);
  };

  const drawImageToCanvas = (w = width, h = height) => {
    const wNum = parseInt(w);
    const hNum = parseInt(h);
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = wNum;
        canvas.height = hNum;
        ctx.clearRect(0, 0, wNum, hNum);
        ctx.drawImage(img, 0, 0, wNum, hNum);
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

  const generateSVGCode = async () => {
    if (!imgSrc) return;
    await drawImageToCanvas();
    const canvas = canvasRef.current;
    const imgd = ImageTracer.getImgdata(canvas);
    const svgString = ImageTracer.imagedataToSVG(imgd);
    setSvgCode(svgString);
    setShowSvgCode(true);
  };

  const copySVGToClipboard = async () => {
    if (!svgCode) return;
    try {
      await navigator.clipboard.writeText(svgCode);
    } catch (err) {
      console.error('Failed to copy', err);
    }
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

  const downloadReactAssets = async () => {
    if (!imgSrc) return;

    const zip = new JSZip();
    const assets = [
      { width: 512, height: 512, name: 'logo512.png', type: 'image/png' },
      { width: 192, height: 192, name: 'logo192.png', type: 'image/png' },
      { width: 32, height: 32, name: 'favicon.ico', type: 'image/x-icon' }
    ];

    for (const asset of assets) {
      await drawImageToCanvas(asset.width, asset.height);
      const canvas = canvasRef.current;
      await new Promise((res) => {
        canvas.toBlob(async (blob) => {
          if (!blob) return res();
          const buf = await blob.arrayBuffer();
          zip.file(asset.name, buf);
          res();
        }, asset.type);
      });
    }

    await drawImageToCanvas();
    const canvas = canvasRef.current;
    const imgd = ImageTracer.getImgdata(canvas);
    const svgString = ImageTracer.imagedataToSVG(imgd);
    zip.file('logo.svg', svgString);

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'react-assets.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container">
      <h1>Image Converter</h1>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      {imgSrc && (
        <>
          <div className="controls">
            <label>
              Width: <input type="number" value={width} onChange={handleWidthChange} />
            </label>
            <label>
              Height: <input type="number" value={height} onChange={handleHeightChange} />
            </label>
            <label>
              <input type="checkbox" checked={keepRatio} onChange={handleKeepRatioChange} /> Keep ratio
            </label>
            <label>
              File name: <input type="text" value={fileName} onChange={(e) => setFileName(e.target.value)} />
            </label>
          </div>
          <div className="presets">
            <button onClick={() => { setWidth('512'); setHeight('512'); }}>512x512</button>
            <button onClick={() => { setWidth('196'); setHeight('196'); }}>196x196</button>
            <button onClick={() => { setWidth('64'); setHeight('64'); }}>64x64</button>
          </div>
          <img src={imgSrc} alt="preview" className="preview fade-in" />
          <div className="buttons">
            <button onClick={downloadPNG}>Download PNG</button>
            <button onClick={downloadSVG}>Download SVG</button>
            <button onClick={generateSVGCode}>SVG Kodu Göster</button>
            <button onClick={downloadICO}>Download ICO</button>
            <button onClick={downloadReactAssets}>Download React Assets</button>
          </div>
          {showSvgCode && (
            <div className="svg-code-container fade-in">
              <button className="copy-btn" onClick={copySVGToClipboard}>
                📋 Kopyala
              </button>
              <textarea
                className="svg-code"
                value={svgCode}
                readOnly
              />
            </div>
          )}
        </>
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}

export default App;
