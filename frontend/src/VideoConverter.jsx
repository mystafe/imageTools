import { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

const ffmpeg = new FFmpeg();

const resolutionPresets = [
  { label: 'FULL HD 1080p', width: 1920, height: 1080 },
  { label: 'HD+ 900p', width: 1600, height: 900 },
  { label: 'HD 720p', width: 1280, height: 720 },
  { label: 'SD 480p', width: 640, height: 480 },
];

const qualityPresets = {
  minimal: {
    label: '📦 Minimal – Küçük boyut, düşük kalite',
    video: { codec: 'libx264', crf: 30, preset: 'ultrafast', fps: 15, resolution: '640x360' },
    audio: { codec: 'aac', bitrate: '64k', channels: 1 },
    extra: { faststart: true },
  },
  low: {
    label: '📉 Düşük Kalite – Daha az yer kaplar',
    video: { codec: 'libx264', crf: 26, preset: 'fast', fps: 24, resolution: '1280x720' },
    audio: { codec: 'aac', bitrate: '96k', channels: 2 },
    extra: { faststart: true },
  },
  medium: {
    label: '⚖️ Orta Kalite – Dengeli çözüm',
    video: { codec: 'libx264', crf: 23, preset: 'medium', fps: 'original', resolution: '1920x1080' },
    audio: { codec: 'aac', bitrate: '128k', channels: 2 },
    extra: { faststart: true },
  },
  high: {
    label: '📺 Yüksek Kalite – Arşiv kalitesinde',
    video: { codec: 'libx264', crf: 18, preset: 'slow', fps: 'original', resolution: 'original' },
    audio: { codec: 'aac', bitrate: '192k', channels: 2 },
    extra: { faststart: true },
  },
};

export default function VideoConverter({ onHome, initialFile }) {
  const [videoFile, setVideoFile] = useState(null);
  const [videoURL, setVideoURL] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [keepRatio, setKeepRatio] = useState(true);
  const [ratio, setRatio] = useState(1);
  const [origWidth, setOrigWidth] = useState(0);
  const [origHeight, setOrigHeight] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileLabel, setFileLabel] = useState('Choose Video');
  const [fileName, setFileName] = useState('video');
  const fileInputRef = useRef(null);

  const loadFFmpeg = async () => {
    if (!ffmpeg.loaded) {
      await ffmpeg.load();
    }
  };

  const convert = async (preset) => {
    if (!videoFile) return;
    setLoading(true);
    await loadFFmpeg();
    await ffmpeg.writeFile('input', await fetchFile(videoFile));

    const args = ['-i', 'input'];
    const { video, audio, extra } = preset;

    let targetWidth = parseInt(width);
    let targetHeight = parseInt(height);
    if (video.resolution && video.resolution !== 'original') {
      const [pw, ph] = video.resolution.split('x').map(Number);
      targetWidth = pw;
      targetHeight = ph;
    }
    args.push('-vf', `scale=${targetWidth}:${targetHeight}`);
    if (video.codec) args.push('-c:v', video.codec);
    if (video.crf !== undefined) args.push('-crf', String(video.crf));
    if (video.preset) args.push('-preset', video.preset);
    if (video.fps && video.fps !== 'original') args.push('-r', String(video.fps));

    if (audio) {
      if (audio.codec) args.push('-c:a', audio.codec);
      if (audio.bitrate) args.push('-b:a', audio.bitrate);
      if (audio.channels) args.push('-ac', String(audio.channels));
    }
    if (extra && extra.faststart) args.push('-movflags', 'faststart');

    args.push('output.mp4');

    await ffmpeg.exec(args);
    const data = await ffmpeg.readFile('output.mp4');
    const url = URL.createObjectURL(new Blob([data], { type: 'video/mp4' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.mp4`;
    a.click();
    setLoading(false);
  };

  const handleMainDownload = () => {
    const preset = {
      ...qualityPresets.medium,
      video: { ...qualityPresets.medium.video, resolution: 'original' },
    };
    convert(preset);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (videoURL) URL.revokeObjectURL(videoURL);
    const url = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoURL(url);
    setFileLabel('Choose Another');
    setFileName(file.name.replace(/\.[^/.]+$/, ''));
    const vid = document.createElement('video');
    vid.preload = 'metadata';
    vid.onloadedmetadata = () => {
      URL.revokeObjectURL(vid.src);
      const w = vid.videoWidth;
      const h = vid.videoHeight;
      setWidth(String(w));
      setHeight(String(h));
      setRatio(w / h);
      setOrigWidth(w);
      setOrigHeight(h);
    };
    vid.src = url;
  };

  const handleWidthChange = (e) => {
    const value = e.target.value;
    const num = parseInt(value);
    if (keepRatio && !isNaN(num)) {
      setHeight(String(Math.round(num / ratio)));
    }
    setWidth(value);
  };

  const handleHeightChange = (e) => {
    const value = e.target.value;
    const num = parseInt(value);
    if (keepRatio && !isNaN(num)) {
      setWidth(String(Math.round(num * ratio)));
    }
    setHeight(value);
  };

  const handleKeepRatioChange = (e) => {
    const checked = e.target.checked;
    if (checked) {
      setWidth(String(origWidth));
      setHeight(String(origHeight));
      setRatio(origWidth / origHeight);
    }
    setKeepRatio(checked);
  };

  const applyPreset = (w, h) => {
    setWidth(String(w));
    setHeight(String(h));
    setKeepRatio(false);
  };

  useEffect(() => {
    if (initialFile) {
      handleFileChange({ target: { files: [initialFile] } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile]);

  return (
    <div className="container">
      <div className="top-bar">
        <h1 className="title">Video Converter</h1>
        <label htmlFor="video-input" className="file-label">{fileLabel}</label>
        <button className="home-btn reset-btn" onClick={onHome} aria-label="Anasayfa">🏠</button>
      </div>
      <input
        id="video-input"
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      {videoFile && (
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
            <button onClick={() => applyPreset(origWidth, origHeight)}>Original</button>
            {resolutionPresets.map((r) => (
              <button key={r.label} onClick={() => applyPreset(r.width, r.height)}>
                {r.label}
              </button>
            ))}
          </div>
          <div className="preview-stack">
            <div className="preview-wrapper active">
              <video
                src={videoURL}
                className="preview-img active"
                playsInline
                onClick={(e) => {
                  const vid = e.target;
                  if (vid.paused) vid.play();
                  else vid.pause();
                }}
              />
              <div className="preview-info">
                {origWidth}x{origHeight} | {(videoFile.size / 1024 / 1024).toFixed(1)}MB
                <br />
                {videoFile.name}
              </div>
            </div>
          </div>
          <div className="buttons">
            <button onClick={handleMainDownload}>Download</button>
            <button onClick={() => setShowMore((s) => !s)}>Ek Download Seçenekleri</button>
          </div>
          {showMore && (
            <div className="buttons quality-options">
              {Object.entries(qualityPresets).map(([key, p]) => (
                <button key={key} onClick={() => convert(p)}>
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {loading && (
        <div className="loading-overlay fade-in">
          <div className="spinner" />
          <div className="loading-text">Processing...</div>
        </div>
      )}
    </div>
  );
}

