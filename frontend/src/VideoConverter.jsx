import { useState } from 'react';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

const ffmpeg = createFFmpeg({ log: false });

const resolutionPresets = [
  { key: 'fullhd', label: 'FULL HD 1080p', width: 1920, height: 1080 },
  { key: 'hdplus', label: 'HD+ 900p', width: 1600, height: 900 },
  { key: 'hd', label: 'HD 720p', width: 1280, height: 720 },
  { key: 'sd', label: 'SD 480p', width: 640, height: 480 },
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

export default function VideoConverter() {
  const [videoFile, setVideoFile] = useState(null);
  const [resKey, setResKey] = useState('fullhd');
  const [showMore, setShowMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadFFmpeg = async () => {
    if (!ffmpeg.isLoaded()) {
      await ffmpeg.load();
    }
  };

  const convert = async (preset) => {
    if (!videoFile) return;
    setLoading(true);
    await loadFFmpeg();
    ffmpeg.FS('writeFile', 'input', await fetchFile(videoFile));

    const args = ['-i', 'input'];
    const { video, audio, extra } = preset;

    if (video.resolution && video.resolution !== 'original') {
      args.push('-vf', `scale=${video.resolution}`);
    } else {
      const sel = resolutionPresets.find((r) => r.key === resKey);
      args.push('-vf', `scale=${sel.width}:${sel.height}`);
    }
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

    await ffmpeg.run(...args);
    const data = ffmpeg.FS('readFile', 'output.mp4');
    const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'video.mp4';
    a.click();
    setLoading(false);
  };

  const handleMainDownload = () => {
    const preset = { ...qualityPresets.medium, video: { ...qualityPresets.medium.video } };
    const sel = resolutionPresets.find((r) => r.key === resKey);
    preset.video.resolution = `${sel.width}:${sel.height}`;
    convert(preset);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setVideoFile(file);
  };

  return (
    <div className="video-converter">
      <h2>Video Converter</h2>
      <input type="file" accept="video/*" onChange={handleFileChange} />
      {videoFile && (
        <div className="video-options">
          <select value={resKey} onChange={(e) => setResKey(e.target.value)}>
            {resolutionPresets.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
          <button onClick={handleMainDownload}>Download</button>
          <button onClick={() => setShowMore((s) => !s)}>Ek Download Seçenekleri</button>
          {showMore && (
            <div className="quality-options">
              {Object.entries(qualityPresets).map(([key, p]) => (
                <button key={key} onClick={() => convert(p)}>
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {loading && <p>Processing...</p>}
    </div>
  );
}

