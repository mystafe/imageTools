import { useState, useRef } from 'react';
import EXIF from './libs/exif.js';
import pkg from '../package.json';
import ImageTracer from 'imagetracerjs';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { heicTo } from 'heic-to';
import './App.css';

function App() {
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [width, setWidth] = useState('300');
  const [height, setHeight] = useState('300');
  const [keepRatio, setKeepRatio] = useState(true);
  const [ratio, setRatio] = useState(1);
  const [fileName, setFileName] = useState('image');
  const [svgCodes, setSvgCodes] = useState([]);
  const [showSvgCode, setShowSvgCode] = useState(false);
  const [fileLabel, setFileLabel] = useState('Choose File(s)');
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const fixOrientation = (img, orientation) => {
    if (orientation === 1) {
      return { src: img.src, width: img.width, height: img.height };
    }
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (orientation > 4) {
      canvas.width = img.height;
      canvas.height = img.width;
    } else {
      canvas.width = img.width;
      canvas.height = img.height;
    }
    const w = canvas.width;
    const h = canvas.height;
    switch (orientation) {
      case 2:
        ctx.transform(-1, 0, 0, 1, w, 0);
        break;
      case 3:
        ctx.transform(-1, 0, 0, -1, w, h);
        break;
      case 4:
        ctx.transform(1, 0, 0, -1, 0, h);
        break;
      case 5:
        ctx.transform(0, 1, 1, 0, 0, 0);
        break;
      case 6:
        ctx.transform(0, 1, -1, 0, h, 0);
        break;
      case 7:
        ctx.transform(0, -1, -1, 0, h, w);
        break;
      case 8:
        ctx.transform(0, -1, 1, 0, 0, w);
        break;
      default:
        break;
    }
    ctx.drawImage(img, 0, 0);
    return { src: canvas.toDataURL(), width: w, height: h };
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    Promise.all(
      files.map(async (file) => {
        let f = file;
        if (
          file.type === 'image/heic' ||
          file.type === 'image/heif' ||
          /\.(heic|heif)$/i.test(file.name)
        ) {
          try {
            const blob = await heicTo({ blob: file, type: 'image/jpeg' });
            f = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
              type: 'image/jpeg',
              lastModified: file.lastModified,
            });
          } catch (err) {
            console.error('HEIC conversion failed', err);
            return null;
          }
        }

        return new Promise((res) => {
          const url = URL.createObjectURL(f);
          const img = new Image();
          img.onload = () => {
            EXIF.getData(f, function () {
              const orientation = EXIF.getTag(this, 'Orientation') || 1;
              const make = EXIF.getTag(this, 'Make') || '';
              const model = EXIF.getTag(this, 'Model') || '';
              const fixed = fixOrientation(img, orientation);
              res({
                src: fixed.src,
                width: fixed.width,
                height: fixed.height,
                ratio: fixed.width / fixed.height,
                name: f.name,
                type: f.type,
                size: f.size,
                lastModified: f.lastModified,
                device: `${make} ${model}`.trim() || 'Unknown',
              });
            });
          };
          img.onerror = () => {
            res(null);
          };
          img.src = url;
        });
      }),
    ).then((imgs) => {
      const loaded = imgs.filter(Boolean);
      if (!loaded.length) return;
      setImages(loaded);
      setCurrentIndex(0);
      const first = loaded[0];
      setWidth(String(first.width));
      setHeight(String(first.height));
      setRatio(first.ratio);
      setSvgCodes([]);
      setShowSvgCode(false);
      setFileLabel('Choose Another');
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

  const handlePreviewClick = (index) => {
    if (index === currentIndex) {
      goToNextImage();
    } else {
      handleImageClick(index);
    }
  };

  const handleWidthChange = (e) => {
    const value = e.target.value;
    const num = parseInt(value);
    if (!isNaN(num) && num < 0) return;
    if (keepRatio && value !== '') {
      if (!isNaN(num)) {
        setHeight(String(Math.round(num / ratio)));
      }
    }
    setWidth(value);
  };

  const handleKeepRatioChange = (e) => {
    const checked = e.target.checked;
    if (checked) {
      const img = images[currentIndex];
      if (img) {
        setWidth(String(img.width));
        setHeight(String(img.height));
        setRatio(img.ratio);
      } else {
        const w = parseInt(width);
        const h = parseInt(height);
        if (!isNaN(w) && !isNaN(h) && h !== 0) {
          setRatio(w / h);
        }
      }
    }
    setKeepRatio(checked);
  };

  const handleHeightChange = (e) => {
    const value = e.target.value;
    const num = parseInt(value);
    if (!isNaN(num) && num < 0) return;
    if (keepRatio && value !== '') {
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
    const targets = images.length > 1 ? images : [images[currentIndex]];
    for (let i = 0; i < targets.length; i++) {
      const img = targets[i];
      await drawImageToCanvas(img.src);
      const canvas = canvasRef.current;
      await new Promise((res) => {
        canvas.toBlob((blob) => {
          if (!blob) return res();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const suffix = targets.length > 1 ? `-${i + 1}` : '';
          a.download = `${fileName || 'image'}${suffix}.png`;
          a.click();
          URL.revokeObjectURL(url);
          res();
        }, 'image/png');
      });
    }
    setMessage('PNG download complete!');
  };

  const downloadJPG = async () => {
    if (!images.length) return;
    const targets = images.length > 1 ? images : [images[currentIndex]];
    for (let i = 0; i < targets.length; i++) {
      const img = targets[i];
      await drawImageToCanvas(img.src);
      const canvas = canvasRef.current;
      await new Promise((res) => {
        canvas.toBlob((blob) => {
          if (!blob) return res();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const suffix = targets.length > 1 ? `-${i + 1}` : '';
          a.download = `${fileName || 'image'}${suffix}.jpg`;
          a.click();
          URL.revokeObjectURL(url);
          res();
        }, 'image/jpeg');
      });
    }
    setMessage('JPG download complete!');
  };

  const downloadSVG = async () => {
    if (!images.length) return;
    const targets = images.length > 1 ? images : [images[currentIndex]];
    for (let i = 0; i < targets.length; i++) {
      const img = targets[i];
      await drawImageToCanvas(img.src);
      const canvas = canvasRef.current;
      const imgd = ImageTracer.getImgdata(canvas);
      const svgString = ImageTracer.imagedataToSVG(imgd);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const suffix = targets.length > 1 ? `-${i + 1}` : '';
      a.download = `${fileName || 'image'}${suffix}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setMessage('SVG download complete!');
  };

  const generateSVGCode = async () => {
    if (!images.length) return;
    const codes = [];
    for (const img of images) {
      await drawImageToCanvas(img.src);
      const canvas = canvasRef.current;
      const imgd = ImageTracer.getImgdata(canvas);
      const svgString = ImageTracer.imagedataToSVG(imgd);
      codes.push(svgString);
    }
    setSvgCodes(codes);
    setShowSvgCode(true);
    setMessage('SVG code generated!');
  };

  const copySVGToClipboard = async (idx) => {
    const code = svgCodes[idx];
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setMessage('SVG copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const downloadICO = async () => {
    if (!images.length) return;
    const targets = images.length > 1 ? images : [images[currentIndex]];
    for (let i = 0; i < targets.length; i++) {
      const img = targets[i];
      await drawImageToCanvas(img.src);
      const canvas = canvasRef.current;
      await new Promise((res) => {
        canvas.toBlob((blob) => {
          if (!blob) return res();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const suffix = targets.length > 1 ? `-${i + 1}` : '';
          a.download = `${fileName || 'image'}${suffix}.ico`;
          a.click();
          URL.revokeObjectURL(url);
          res();
        }, 'image/x-icon');
      });
    }
    setMessage('ICO download complete!');
  };

  const downloadReactAssets = async () => {
    if (!images.length) return;

    const targets = images.length > 1 ? images : [images[currentIndex]];
    const zip = new JSZip();
    const assets = [
      { width: 512, height: 512, name: 'logo512.png', type: 'image/png' },
      { width: 192, height: 192, name: 'logo192.png', type: 'image/png' },
      { width: 32, height: 32, name: 'favicon.ico', type: 'image/x-icon' }
    ];

    for (let i = 0; i < targets.length; i++) {
      const img = targets[i];
      const folder = targets.length > 1 ? zip.folder(`img-${i + 1}`) : zip;
      for (const asset of assets) {
        await drawImageToCanvas(img.src, asset.width, asset.height);
        const canvas = canvasRef.current;
        await new Promise((res) => {
          canvas.toBlob(async (blob) => {
            if (!blob) return res();
            const buf = await blob.arrayBuffer();
            folder.file(asset.name, buf);
            res();
          }, asset.type);
        });
      }

      await drawImageToCanvas(img.src);
      const canvas = canvasRef.current;
      const imgd = ImageTracer.getImgdata(canvas);
      const svgString = ImageTracer.imagedataToSVG(imgd);
      folder.file('logo.svg', svgString);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'react-assets.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMessage('React assets downloaded!');
  };

  const downloadPDF = async () => {
    if (!images.length) return;
    const temp = new jsPDF();
    const pageWidth = temp.internal.pageSize.getWidth();
    const margin = 5;
    const imgWidth = pageWidth - margin * 2;
    const totalHeight = images.reduce(
      (sum, img) => sum + (img.height / img.width) * imgWidth + margin,
      margin,
    );

    const pdf = new jsPDF({ unit: 'mm', format: [pageWidth, totalHeight] });
    let y = margin;
    images.forEach((img) => {
      const imgHeight = (img.height / img.width) * imgWidth;
      const fmt = img.src.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
      pdf.addImage(img.src, fmt, margin, y, imgWidth, imgHeight);
      y += imgHeight + margin;
    });
    pdf.save(`${fileName || 'images'}.pdf`);
    setMessage('PDF created successfully!');
  };

  return (
    <div className="container">
      <h1 className="title">
        Image Converter
        <span className="version">v{pkg.version}</span>
      </h1>
      <input
        id="file-input"
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <label htmlFor="file-input" className="file-label">{fileLabel}</label>
      {images.length > 0 && (
        <>
          <div className="controls">
            <div className="size-controls">
              <label>
                Width: <input type="number" min="1" value={width} onChange={handleWidthChange} />
              </label>
              <label>
                Height: <input type="number" min="1" value={height} onChange={handleHeightChange} />
              </label>
              <label className="keep-ratio">
                <input type="checkbox" checked={keepRatio} onChange={handleKeepRatioChange} /> Keep ratio
              </label>
            </div>
            <label className="filename-label">
              File name: <input type="text" value={fileName} onChange={(e) => setFileName(e.target.value)} />
            </label>
          </div>
          <div className="presets">
            <button onClick={() => { setWidth('1024'); setHeight('768'); }}>1024x768</button>
            <button onClick={() => { setWidth('512'); setHeight('512'); }}>512x512</button>
            <button onClick={() => { setWidth('196'); setHeight('196'); }}>196x196</button>
            <button onClick={() => { setWidth('64'); setHeight('64'); }}>64x64</button>
          </div>
          <div className="preview-stack">
            {images.map((img, idx) => {
              const offset = (idx - currentIndex + images.length) % images.length;
              return (
                <div
                  key={idx}
                  className={`preview-wrapper${offset === 0 ? ' active' : ''}`}
                  onClick={() => handlePreviewClick(idx)}
                  style={{
                    zIndex: images.length - offset,
                    transform:
                      offset === 0
                        ? 'translateX(0)'
                        : offset === 1
                          ? 'translateX(40px) scale(0.9)'
                          : `translateX(${offset * 30}px) scale(0.9)`,
                  }}
                >
                  <img
                    src={img.src}
                    alt={`preview-${idx}`}
                    className={`preview-img fade-in${offset === 0 ? ' active' : ''}`}
                  />
                  {offset === 0 && images.length > 1 && (
                    <div
                      className="next-overlay"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToNextImage();
                      }}
                    >
                      <div className="next-icon">&raquo;&raquo;</div>
                    </div>
                  )}
                  <div className="preview-info">
                    {img.width}x{img.height} |
                    {(img.size / 1024).toFixed(1)}KB
                    <br />
                    {img.name}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="buttons">
            <button onClick={downloadPNG}>Download PNG</button>
            <button onClick={downloadJPG}>Download JPG</button>
            <button onClick={downloadSVG}>Download SVG</button>
            <button onClick={downloadICO}>Download ICO</button>
            <button onClick={downloadPDF}>Download PDF</button>
            <button onClick={downloadReactAssets}>Download React Assets</button>
            <button onClick={generateSVGCode}>SVG Kodu Göster</button>
          </div>
          {showSvgCode && (
            <div className="svg-code-container fade-in">
              {svgCodes.map((code, i) => (
                <div key={i} className="svg-block">
                  <button className="copy-btn" onClick={() => copySVGToClipboard(i)}>
                    📋 Copy
                  </button>
                  <textarea className="svg-code" value={code} readOnly />
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {message && (
        <div className="message fade-in">
          {message}
          <button className="reset-btn" onClick={() => window.location.reload()}>Baştan Başla</button>
        </div>
      )}
    </div>
  );
}

export default App;
