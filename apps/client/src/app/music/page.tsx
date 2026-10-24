"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Song = {
  id: string;
  title: string;
  artist: string;
  album: string;
  image: string;
  audio: string;
  duration: string;
  local?: boolean;
  offline?: boolean;
};

const DB_NAME = "sourajit-vfx-music-offline";
const STORE_NAME = "tracks";
function openMusicDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: "id" }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function saveOffline(song: Song, blob: Blob) {
  const db = await openMusicDB();
  await new Promise<void>((resolve, reject) => { const tx = db.transaction(STORE_NAME, "readwrite"); tx.objectStore(STORE_NAME).put({ ...song, blob, offline: true }); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  db.close();
}
async function readOffline(): Promise<Array<Song & { blob: Blob }>> {
  const db = await openMusicDB();
  const rows = await new Promise<Array<Song & { blob: Blob }>>((resolve, reject) => { const req = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll(); req.onsuccess = () => resolve(req.result as Array<Song & { blob: Blob }>); req.onerror = () => reject(req.error); });
  db.close(); return rows;
}

function pickText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function imageUrl(song: Record<string, unknown>): string {
  const image = song.image ?? song.images ?? song.thumbnail ?? song.artwork;
  if (typeof image === "string") return image;
  if (Array.isArray(image)) {
    const last = image[image.length - 1];
    if (typeof last === "string") return last;
    if (last && typeof last === "object") {
      const item = last as Record<string, unknown>;
      return pickText(item.url ?? item.link);
    }
  }
  if (image && typeof image === "object") {
    const item = image as Record<string, unknown>;
    return pickText(item.url ?? item.link ?? item.large ?? item.medium);
  }
  return "";
}

function audioUrl(song: Record<string, unknown>): string {
  const direct = song.downloadUrl ?? song.download_url ?? song.audioUrl ?? song.audio_url ?? song.streamUrl ?? song.url;
  if (typeof direct === "string" && /^https?:\/\//i.test(direct)) return direct;
  if (Array.isArray(direct)) {
    const choices = direct.filter((x) => x && typeof x === "object") as Record<string, unknown>[];
    const selected = choices.find((x) => /320|high|medium/i.test(pickText(x.quality))) ?? choices[choices.length - 1];
    const url = selected && pickText(selected.url ?? selected.link);
    if (url) return url;
  }
  return "";
}

function normalizeSong(item: unknown, index: number): Song | null {
  if (!item || typeof item !== "object") return null;
  const raw = item as Record<string, unknown>;
  const title = pickText(raw.name ?? raw.title ?? raw.song);
  if (!title) return null;
  const artists = raw.artists;
  let artist = pickText(raw.primaryArtists ?? raw.artist ?? raw.singers ?? raw.subtitle);
  if (!artist && artists && typeof artists === "object") {
    const a = artists as Record<string, unknown>;
    artist = pickText(a.primary ?? a.all ?? a.name);
  }
  if (Array.isArray(artists)) artist = artists.map((x) => typeof x === "string" ? x : x && typeof x === "object" ? pickText((x as Record<string, unknown>).name) : "").filter(Boolean).join(", ") || artist;
  return {
    id: pickText(raw.id ?? raw.songId ?? raw.perma_url) || `song-${index}-${title}`,
    title,
    artist: artist || "Unknown artist",
    album: pickText(raw.album && typeof raw.album === "object" ? (raw.album as Record<string, unknown>).name : raw.album) || "Single",
    image: imageUrl(raw),
    audio: audioUrl(raw),
    duration: pickText(raw.duration),
  };
}

function extractSongs(payload: unknown): Song[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const data = root.data && typeof root.data === "object" ? root.data as Record<string, unknown> : root;
  const candidates = [
    data.results, data.songs, data.items,
    (data.data && typeof data.data === "object" ? (data.data as Record<string, unknown>).results : undefined),
    (data.data && typeof data.data === "object" ? (data.data as Record<string, unknown>).songs : undefined),
    (root.result && typeof root.result === "object" ? (root.result as Record<string, unknown>).results : undefined),
    root.results, root.songs,
  ];
  const list = candidates.find(Array.isArray) as unknown[] | undefined;
  return (list ?? []).map(normalizeSong).filter((x): x is Song => Boolean(x));
}

const starterSearches = ["Arijit Singh", "Trending Hindi", "Lo-fi", "Punjabi hits"];

export default function MusicPage() {
  const [query, setQuery] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [selected, setSelected] = useState<Song | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [playing, setPlaying] = useState(false);
  const [offlineSongs, setOfflineSongs] = useState<Song[]>([]);
  const [savingOffline, setSavingOffline] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localUrls = useRef<string[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let active = true;
    readOffline().then((rows) => { if (active) setOfflineSongs(rows.map(({ blob: _blob, ...song }) => ({ ...song, offline: true }))); }).catch(() => {});
    return () => { active = false; localUrls.current.forEach((url) => URL.revokeObjectURL(url)); };
  }, []);

  const currentIndex = useMemo(() => songs.findIndex((song) => song.id === selected?.id), [songs, selected]);

  async function search(value = query) {
    const clean = value.trim();
    if (!clean) { setError("Type a song, artist, or album to search."); return; }
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/music/search?query=${encodeURIComponent(clean)}`, { cache: "no-store" });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message = payload && typeof payload === "object" ? pickText((payload as Record<string, unknown>).message) : "";
        throw new Error(message || "Search failed. Try again in a moment.");
      }
      const results = extractSongs(payload);
      setSongs(results);
      if (!results.length) setNotice("The API returned no songs in a recognized format. Try another search or check the API response format.");
    } catch (e) {
      setSongs([]);
      setError(e instanceof Error ? e.message : "Could not reach the music service.");
    } finally {
      setLoading(false);
    }
  }

  async function playSong(song: Song) {
    setSelected(song);
    setNotice("");
    let playableUrl = song.audio;
    if (song.offline) { try { const cached = (await readOffline()).find((row) => row.id === song.id); if (cached) playableUrl = URL.createObjectURL(cached.blob); } catch {} }
    if (!playableUrl) {
      setPlaying(false);
      setNotice("This result has no direct audio URL. Search results can show, but playback needs a playable URL from the API.");
      return;
    }
    const player = audioRef.current;
    if (!player) return;
    if (player.src !== playableUrl) player.src = playableUrl;
    try {
      await player.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
      setNotice("This audio link could not be played in the browser. The provider may require a fresh URL or may block direct playback.");
    }
  }

  async function addLocalFiles(files: FileList | null) {
    if (!files?.length) return;
    const local = Array.from(files).filter((file) => file.type.startsWith("audio/") || /\\.(mp3|m4a|aac|wav|ogg|flac)$/i.test(file.name)).map((file, index) => {
      const url = URL.createObjectURL(file); localUrls.current.push(url);
      return { id: `local-${file.name}-${file.lastModified}-${index}`, title: file.name.replace(/\\.[^.]+$/, ""), artist: "Device file", album: "Local music", image: "", audio: url, duration: "", local: true } as Song;
    });
    if (!local.length) { setError("Select audio files such as MP3, M4A, AAC, WAV, or OGG."); return; }
    setSongs((current) => [...local, ...current]); setError(""); setNotice(`${local.length} device audio file(s) added. They play directly from your phone.`);
  }
  async function saveCurrentOffline() {
    if (!selected) return;
    if (selected.local || selected.offline) { setNotice("This track is already on your device."); return; }
    if (!selected.audio) { setNotice("This result has no direct audio URL, so it cannot be saved offline."); return; }
    setSavingOffline(true); setError(""); setNotice("Downloading audio for offline playback…");
    try {
      const response = await fetch(selected.audio); if (!response.ok) throw new Error("Download failed. The provider may block saving this audio.");
      const blob = await response.blob(); if (blob.size < 1024) throw new Error("The API did not return a valid audio file.");
      await saveOffline(selected, blob); setOfflineSongs((current) => [{ ...selected, offline: true }, ...current.filter((item) => item.id !== selected.id)]);
      setNotice("Saved on this device. Open Offline Music to play it without internet.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save this track offline."); }
    finally { setSavingOffline(false); }
  }

  function skip(direction: number) {
    if (!songs.length) return;
    const start = currentIndex < 0 ? 0 : currentIndex;
    const next = (start + direction + songs.length) % songs.length;
    void playSong(songs[next]);
  }

  useEffect(() => {
    const player = audioRef.current;
    if (!player) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => skip(1);
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);
    player.addEventListener("ended", onEnded);
    return () => {
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
      player.removeEventListener("ended", onEnded);
    };
  }, [songs, currentIndex]);

  return (
    <main className="min-h-screen bg-[#08090d] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-32 -top-24 h-96 w-96 rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-cyan-500/10 blur-[130px]" />
      </div>
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-36 pt-5 sm:px-8">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
          <a href="/" className="flex items-center gap-3" aria-label="VFX SYNC home">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-violet-300/30 bg-violet-500/20 text-lg font-black text-violet-200 shadow-lg shadow-violet-950/40">V</div>
            <div><p className="text-sm font-black tracking-[0.2em]">SOURAJIT <span className="text-violet-300">VFX</span></p><p className="mt-0.5 text-[10px] tracking-[0.28em] text-zinc-500">MUSIC VAULT</p></div>
          </a>
          <a href="/" className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:border-violet-300/50 hover:text-white">← VFX SYNC</a>
        </header>

        <section className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1.05fr_.95fr] lg:py-16">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1.5 text-xs text-violet-200"><span className="h-2 w-2 rounded-full bg-emerald-400" /> YOUR SOUND, YOUR SPACE</div>
            <h1 className="max-w-2xl text-5xl font-black leading-[1.02] tracking-tight sm:text-7xl">Find your <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-200 bg-clip-text text-transparent">next vibe.</span></h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">Search songs and artists, explore cover art, and play available audio from one clean music space.</p>
            <form className="mt-8 flex max-w-2xl gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-2 shadow-2xl shadow-black/30 backdrop-blur-xl" onSubmit={(e) => { e.preventDefault(); void search(); }}>
              <span className="grid w-10 shrink-0 place-items-center text-xl text-zinc-400">⌕</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search song, artist, album..." aria-label="Search music" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-600" />
              <button type="submit" disabled={loading} className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-bold transition hover:bg-violet-400 disabled:opacity-60">{loading ? "Searching…" : "Search"}</button>
            </form>
            <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100">＋ Add music from phone</button>{starterSearches.map((item) => <button key={item} onClick={() => { setQuery(item); void search(item); }} className="rounded-full border border-white/10 px-3 py-2 text-xs text-zinc-400 transition hover:border-violet-300/40 hover:text-white">{item}</button>)}</div>
            <input ref={fileInputRef} type="file" accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac" multiple className="hidden" onChange={(e) => { void addLocalFiles(e.target.files); e.currentTarget.value = ""; }} />
            {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
            {notice && <p role="status" className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">{notice}</p>}
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute inset-8 rounded-[3rem] bg-violet-500/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.11] to-white/[0.025] p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-8">
              <div className="flex items-center justify-between"><span className="text-xs font-bold tracking-[0.18em] text-zinc-400">NOW PLAYING</span><span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-bold text-emerald-300">MUSIC PLAYER</span></div>
              <div className="mx-auto my-8 grid aspect-square max-w-[260px] place-items-center overflow-hidden rounded-[1.6rem] border border-white/10 bg-gradient-to-br from-violet-600/60 via-fuchsia-500/20 to-cyan-500/20 shadow-2xl shadow-violet-950/40">
                {selected?.image ? <img src={selected.image} alt={selected.title} className="h-full w-full object-cover" /> : <div className="text-center"><div className="text-7xl">♫</div><p className="mt-3 text-xs tracking-[0.3em] text-white/60">VFX MUSIC</p></div>}
              </div>
              <div className="text-center"><h2 className="truncate text-xl font-bold">{selected?.title ?? "Choose your soundtrack"}</h2><p className="mt-1 truncate text-sm text-zinc-400">{selected?.artist ?? "Your next favourite starts here"}</p></div>
              <div className="mt-6 flex items-center justify-center gap-7"><button onClick={() => skip(-1)} aria-label="Previous song" className="text-2xl text-zinc-400 hover:text-white">↶</button><button onClick={() => { const player = audioRef.current; if (!player) return; if (player.paused) { if (selected) void playSong(selected); } else player.pause(); }} aria-label={playing ? "Pause" : "Play"} className="grid h-14 w-14 place-items-center rounded-full bg-white text-xl text-black shadow-lg shadow-white/10 transition hover:scale-105">{playing ? "Ⅱ" : "▶"}</button><button onClick={() => skip(1)} aria-label="Next song" className="text-2xl text-zinc-400 hover:text-white">↷</button></div>
              <div className="mt-5 flex flex-wrap justify-center gap-2"><button onClick={() => void saveCurrentOffline()} disabled={!selected || savingOffline || selected.local || selected.offline} className="rounded-full border border-violet-300/30 px-4 py-2 text-xs font-semibold text-violet-100 disabled:opacity-40">{savingOffline ? "Saving…" : selected?.offline ? "✓ Saved offline" : "↓ Save offline"}</button><button onClick={() => setSongs(offlineSongs)} className="rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-300">Offline Music ({offlineSongs.length})</button></div><p className="mt-3 text-center text-[11px] text-zinc-500">Device files and saved tracks play offline in this browser.</p>
            </div>
          </div>
        </section>

        <section className="pb-8">
          <div className="mb-5 flex items-end justify-between"><div><p className="text-xs font-bold tracking-[0.22em] text-violet-300">YOUR DISCOVERY</p><h2 className="mt-2 text-2xl font-black">Search results</h2></div><p className="text-xs text-zinc-500">{songs.length ? `${songs.length} tracks` : "Search to get started"}</p></div>
          {songs.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{songs.map((song, index) => <button key={song.id} onClick={() => void playSong(song)} className={`group flex min-w-0 items-center gap-4 rounded-2xl border p-3 text-left transition ${selected?.id === song.id ? "border-violet-300/50 bg-violet-400/10" : "border-white/[0.08] bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.07]"}`}><div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-violet-500/30 to-cyan-500/20">{song.image ? <img src={song.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-2xl">♫</span>}<span className="absolute inset-0 grid place-items-center bg-black/45 text-lg opacity-0 transition group-hover:opacity-100">{selected?.id === song.id && playing ? "Ⅱ" : "▶"}</span></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{song.title}</p><p className="mt-1 truncate text-xs text-zinc-400">{song.artist}</p><p className="mt-1 truncate text-[10px] text-zinc-600">{song.album}</p></div><span className="text-xs text-zinc-500">{index + 1}</span></button>)}</div> : <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-zinc-500">Your search results will appear here.</div>}
        </section>
        <footer className="border-t border-white/10 py-5 text-center text-xs text-zinc-600">SOURAJIT VFX · MUSIC VAULT X · Built for the vibe.</footer>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#0b0b12]/90 px-4 py-3 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3"><div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-white/5">{selected?.image ? <img src={selected.image} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center">♫</div>}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{selected?.title ?? "Nothing playing"}</p><p className="truncate text-[10px] text-zinc-500">{selected?.artist ?? "Search and select a track"}</p></div><button onClick={() => { const player = audioRef.current; if (!player) return; if (player.paused) { if (selected) void playSong(selected); } else player.pause(); }} className="grid h-10 w-10 place-items-center rounded-full bg-violet-500 text-sm font-bold disabled:opacity-50" disabled={!selected?.audio && !selected?.local && !selected?.offline} aria-label={playing ? "Pause music" : "Play music"}>{playing ? "Ⅱ" : "▶"}</button></div>
      </div>
      <audio ref={audioRef} onError={() => { setPlaying(false); setNotice("Playback failed for this audio URL. Try another result; the API may provide metadata without a playable stream."); }} className="hidden" />
    </main>
  );
}
