import { useState, useRef } from 'react';
import ImageTracer from 'imagetracerjs';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import './App.css';

function App() {
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [width, setWidth] = useState('300');
  const [height, setHeight] = useState('300');
  const [keepRatio, setKeepRatio] = useState(true);
  const [ratio, setRatio] = useState(1);
  const [fileName, setFileName] = useState('image');
  const [svgCode, setSvgCode] = useState('');
  const [showSvgCode, setShowSvgCode] = useState(false);
  const canvasRef = useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    Promise.all(
      files.map(
        (file) =>
          new Promise((res) => {
            const reader = new FileReader();
            reader.onload = () => {
              const img = new Image();
              img.onload = () => {
                res({
                  src: reader.result,
                  width: img.width,
                  height: img.height,
                  ratio: img.width / img.height,
                });
              };
              img.src = reader.result;
            };
            reader.readAsDataURL(file);
          }),
      ),
    ).then((imgs) => {
      setImages(imgs);
      setCurrentIndex(0);
      const first = imgs[0];
      setWidth(String(first.width));
      setHeight(String(first.height));
      setRatio(first.ratio);
    });
  };

  const handleImageClick = (index) => {
    setCurrentIndex(index);
    const img = images[index];
    if (img) {
      setWidth(String(img.width));
      setHeight(String(img.height));
      setRatio(img.ratio);
    }
  };

  const goToNextImage = () => {
    if (images.length > 0) {
      const nextIndex = (currentIndex + 1) % images.length;
      handleImageClick(nextIndex);
    }
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

  const drawImageToCanvas = (src = images[currentIndex]?.src, w = width, h = height) => {
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
      img.src = src;
    });
  };

  const downloadPNG = async () => {
    if (!images.length) return;
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

  const downloadJPG = async () => {
    if (!images.length) return;
    await drawImageToCanvas();
    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName || 'image'}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/jpeg');
  };

  const downloadSVG = async () => {
    if (!images.length) return;
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
    if (!images.length) return;
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
    if (!images.length) return;
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
    if (!images.length) return;

    const zip = new JSZip();
    const assets = [
      { width: 512, height: 512, name: 'logo512.png', type: 'image/png' },
      { width: 192, height: 192, name: 'logo192.png', type: 'image/png' },
      { width: 32, height: 32, name: 'favicon.ico', type: 'image/x-icon' }
    ];

    for (const asset of assets) {
      await drawImageToCanvas(undefined, asset.width, asset.height);
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

  const downloadPDF = async () => {
    if (!images.length) return;
    const temp = new jsPDF();
    const pageWidth = temp.internal.pageSize.getWidth();
    const totalHeight = images.reduce(
      (sum, img) => sum + (img.height / img.width) * pageWidth,
      0,
    );

    const pdf = new jsPDF({ unit: 'mm', format: [pageWidth, totalHeight] });
    let y = 0;
    images.forEach((img) => {
      const imgHeight = (img.height / img.width) * pageWidth;
      const fmt = img.src.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
      pdf.addImage(img.src, fmt, 0, y, pageWidth, imgHeight);
      y += imgHeight;
    });
    pdf.save(`${fileName || 'images'}.pdf`);
  };

  return (
    <div className="container">
      <h1>Image Converter</h1>
      <input type="file" accept="image/*" multiple onChange={handleFileChange} />
      {images.length > 0 && (
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
          <div className="preview-stack">
            {images.map((img, idx) => {
              const offset = (idx - currentIndex + images.length) % images.length;
              return (
                <img
                  key={idx}
                  src={img.src}
                  alt={`preview-${idx}`}
                  className={`preview-img fade-in${offset === 0 ? ' active' : ''}`}
                  onClick={() => handleImageClick(idx)}
                  style={{
                    zIndex: images.length - offset,
                    transform:
                      offset === 0
                        ? 'translateX(0)'
                        : offset === 1
                          ? 'translateX(30px) scale(0.9)'
                          : `translateX(${offset * 20}px) scale(0.9)`,
                  }}
                />
              );
            })}
          </div>
          <button onClick={goToNextImage} className="next-btn">
            Next
          </button>
          <div className="buttons">
            <button onClick={downloadPNG}>Download PNG</button>
            <button onClick={downloadJPG}>Download JPG</button>
            <button onClick={downloadSVG}>Download SVG</button>
            <button onClick={generateSVGCode}>SVG Kodu Göster</button>
            <button onClick={downloadICO}>Download ICO</button>
            <button onClick={downloadReactAssets}>Download React Assets</button>
            <button onClick={downloadPDF}>Download PDF</button>
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
