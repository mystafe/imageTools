import { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';

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
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [eta, setEta] = useState('');
  const startTimeRef = useRef(0);
  const fileInputRef = useRef(null);
  const [logs, setLogs] = useState([]);
  const logRef = useRef(null);
  const log = (msg) => {
    setLogs((prev) => [...prev, msg]);
    // scroll to bottom on new messages
    requestAnimationFrame(() => {
      if (logRef.current) {
        logRef.current.scrollTop = logRef.current.scrollHeight;
      }
    });
  };

  const processOnServer = async (preset) => {
    log('Tarayıcıda işleme desteklenmiyor, sunucuda işlenecektir.');
    log('Sunucuya yükleniyor...');
    try {
      const formData = new FormData();
      formData.append('file', videoFile);
      formData.append('preset', JSON.stringify(preset));
      const res = await fetch('/api/convert', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Sunucu hatası');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.mp4`;
      a.click();
      log('Sunucuda işleme tamamlandı.');
    } catch (err) {
      log(`Sunucuda işleme başarısız: ${err.message}`);
    }
  };

  const loadFFmpeg = async () => {
    if (!ffmpeg.loaded) {
      await ffmpeg.load();
    }
  };

  const readFileWithProgress = (file, onProgress) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result));
      reader.onerror = reject;
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      reader.readAsArrayBuffer(file);
    });

  const formatTime = (seconds) => {
    const s = Math.round(seconds);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m ? `${m}m ${sec}s` : `${sec}s`;
  };

  const convert = async (preset) => {
    if (!videoFile) return;
    if (typeof SharedArrayBuffer === 'undefined') {
      await processOnServer(preset);
      return;
    }
    log('Processing on device...');
    setLoading(true);
    setStage('Uploading');
    setProgress(0);
    setEta('');
    try {
      await loadFFmpeg();
    } catch {
      await processOnServer(preset);
      setLoading(false);
      setStage('');
      return;
    }
    const inputData = await readFileWithProgress(videoFile, setProgress);
    const inputExt = videoFile.name.split('.').pop().toLowerCase();
    const inputName = `input.${inputExt}`;
    await ffmpeg.writeFile(inputName, inputData);
    setStage('Converting');
    setProgress(0);
    startTimeRef.current = Date.now();

    const progressHandler = ({ progress }) => {
      const pct = Math.round(progress * 100);
      setProgress(pct);
      if (progress > 0) {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const total = elapsed / progress;
        setEta(formatTime(total - elapsed));
      }
    };
    ffmpeg.on('progress', progressHandler);

    const args = ['-i', inputName];
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

    const outputName = 'output.mp4';
    args.push(outputName);

    await ffmpeg.exec(args);
    ffmpeg.off('progress', progressHandler);
    const data = await ffmpeg.readFile(outputName);
    const url = URL.createObjectURL(new Blob([data], { type: 'video/mp4' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.mp4`;
    a.click();
    setLoading(false);
    setStage('');
    setProgress(0);
    setEta('');
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
        <div className="loading-overlay video-loading fade-in">
          {videoURL && (
            <video
              src={videoURL}
              className="loading-video"
              controls
              autoPlay
              muted
            />
          )}
          <div className="loading-text">
            {stage} {progress}%
            {eta && ` · ETA ${eta}`}
          </div>
          <div className="loading-progress">
            <div style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      {logs.length > 0 && (
        <div className="process-log" ref={logRef}>
          {logs.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}
    </div>
  );
}

