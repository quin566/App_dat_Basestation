import React, { useState } from 'react';
import { Plus, X, Image, Link, FileText, Maximize2 } from 'lucide-react';
import { useAppState } from '../../contexts/StateContext';

const InspirationBoard = ({ client, onClientUpdate }) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [addMode, setAddMode] = useState(null); // 'url' | 'note' | null
  const [fullscreenAsset, setFullscreenAsset] = useState(null);
  const [loading, setLoading] = useState(false);

  const assets = client.inspirationAssets || [];

  const saveAssets = (updated) => {
    onClientUpdate({ ...client, inspirationAssets: updated, updatedAt: new Date().toISOString() });
  };

  const handleUpload = async () => {
    if (!window.electronAPI) return;
    setLoading(true);
    try {
      // Use Electron dialog via IPC workaround — send message to main
      // We use a hidden file input as fallback since dialog.showOpenDialog needs a dedicated IPC channel
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) { setLoading(false); return; }
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const arrayBuffer = ev.target.result;
          const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const res = await window.electronAPI.clientSaveFile({
            clientId: client.id,
            filename,
            buffer: Array.from(new Uint8Array(arrayBuffer)),
          });
          if (res?.success) {
            const newAsset = {
              id: crypto.randomUUID(),
              type: 'image',
              value: filename,
              label: file.name,
              addedAt: new Date().toISOString(),
            };
            saveAssets([...assets, newAsset]);
          }
          setLoading(false);
        };
        reader.readAsArrayBuffer(file);
      };
      input.click();
    } catch (err) {
      console.error('[InspirationBoard] upload error:', err);
      setLoading(false);
    }
    setPopoverOpen(false);
  };

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;
    setLoading(true);
    try {
      const res = await window.electronAPI?.fetchProxy?.({ url: urlInput.trim(), options: {} });
      if (res?.success) {
        // Try to treat as image — save as base64
        const isImage = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(urlInput.trim());
        if (isImage && typeof res.data === 'string') {
          const filename = `${Date.now()}_url_image.jpg`;
          // data may be base64 already from fetchProxy; save whatever we got
          const buffer = Array.from(Buffer.from(res.data, 'base64'));
          const saveRes = await window.electronAPI?.clientSaveFile?.({
            clientId: client.id,
            filename,
            buffer,
          });
          if (saveRes?.success) {
            saveAssets([...assets, {
              id: crypto.randomUUID(), type: 'image', value: filename,
              label: urlInput.trim(), addedAt: new Date().toISOString(),
            }]);
            setUrlInput('');
            setAddMode(null);
            setPopoverOpen(false);
            setLoading(false);
            return;
          }
        }
      }
    } catch (_) { /* fall through to URL card */ }
    // Fallback: store as URL card
    saveAssets([...assets, {
      id: crypto.randomUUID(), type: 'url', value: urlInput.trim(),
      label: urlInput.trim(), addedAt: new Date().toISOString(),
    }]);
    setUrlInput('');
    setAddMode(null);
    setPopoverOpen(false);
    setLoading(false);
  };

  const handleAddNote = () => {
    if (!noteInput.trim()) return;
    saveAssets([...assets, {
      id: crypto.randomUUID(), type: 'note', value: noteInput.trim(),
      label: '', addedAt: new Date().toISOString(),
    }]);
    setNoteInput('');
    setAddMode(null);
    setPopoverOpen(false);
  };

  const handleDelete = async (asset) => {
    if (asset.type === 'image' && window.electronAPI) {
      await window.electronAPI.clientDeleteFile({ clientId: client.id, filename: asset.value });
    }
    saveAssets(assets.filter(a => a.id !== asset.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-black uppercase tracking-widest text-[#9C8A7A]">Inspiration</div>
        <div className="relative">
          <button
            onClick={() => { setPopoverOpen(p => !p); setAddMode(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5F6F65] hover:bg-[#4A6657] text-white text-xs font-black rounded-xl transition-colors"
          >
            <Plus size={13} /> Add
          </button>
          {popoverOpen && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-[#E8E4E1] rounded-2xl shadow-lg z-10 overflow-hidden">
              {addMode === null && (
                <>
                  <button onClick={handleUpload} className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-bold text-[#2C2511] hover:bg-[#F4F1EE] transition-colors">
                    <Image size={14} className="text-[#5F6F65]" /> Upload image
                  </button>
                  <button onClick={() => setAddMode('url')} className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-bold text-[#2C2511] hover:bg-[#F4F1EE] transition-colors">
                    <Link size={14} className="text-[#5F6F65]" /> Paste URL
                  </button>
                  <button onClick={() => setAddMode('note')} className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-bold text-[#2C2511] hover:bg-[#F4F1EE] transition-colors">
                    <FileText size={14} className="text-[#5F6F65]" /> Add note
                  </button>
                </>
              )}
              {addMode === 'url' && (
                <div className="p-3 space-y-2">
                  <input
                    autoFocus
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddUrl()}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-[#FAF8F3] border border-[#E8E4E1] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#5F6F65]/30"
                  />
                  <button onClick={handleAddUrl} disabled={loading} className="w-full py-1.5 bg-[#5F6F65] text-white text-xs font-black rounded-lg disabled:opacity-50">
                    {loading ? 'Saving…' : 'Save URL'}
                  </button>
                </div>
              )}
              {addMode === 'note' && (
                <div className="p-3 space-y-2">
                  <textarea
                    autoFocus
                    value={noteInput}
                    onChange={e => setNoteInput(e.target.value)}
                    placeholder="Add a note…"
                    rows={3}
                    className="w-full px-3 py-2 bg-[#FAF8F3] border border-[#E8E4E1] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#5F6F65]/30 resize-none"
                  />
                  <button onClick={handleAddNote} className="w-full py-1.5 bg-[#5F6F65] text-white text-xs font-black rounded-lg">
                    Save Note
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {assets.length === 0 && (
        <div className="py-10 text-center text-sm text-[#C0B0A0] font-medium">
          No inspiration yet — add images, URLs, or notes.
        </div>
      )}

      {/* Masonry grid */}
      <div className="columns-2 gap-3 space-y-3">
        {assets.map(asset => (
          <AssetTile
            key={asset.id}
            asset={asset}
            clientId={client.id}
            onDelete={() => handleDelete(asset)}
            onExpand={() => setFullscreenAsset(asset)}
          />
        ))}
      </div>

      {/* Fullscreen overlay */}
      {fullscreenAsset && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8"
          onClick={() => setFullscreenAsset(null)}
        >
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setFullscreenAsset(null)}>
            <X size={28} />
          </button>
          <FullscreenContent asset={fullscreenAsset} clientId={client.id} />
        </div>
      )}
    </div>
  );
};

const AssetTile = ({ asset, clientId, onDelete, onExpand }) => {
  const [imgSrc, setImgSrc] = useState(null);

  React.useEffect(() => {
    if (asset.type === 'image' && window.electronAPI) {
      window.electronAPI.clientReadFile({ clientId, filename: asset.value })
        .then(res => {
          if (res?.success) setImgSrc(`data:image/jpeg;base64,${res.data}`);
        })
        .catch(() => {});
    }
  }, [asset, clientId]);

  return (
    <div className="break-inside-avoid mb-3 group relative rounded-xl overflow-hidden border border-[#E8E4E1] bg-white">
      {asset.type === 'image' && imgSrc && (
        <img src={imgSrc} alt={asset.label} className="w-full object-cover" />
      )}
      {asset.type === 'image' && !imgSrc && (
        <div className="w-full h-20 bg-[#F2F2F0] flex items-center justify-center">
          <Image size={20} className="text-[#C0B0A0]" />
        </div>
      )}
      {asset.type === 'url' && (
        <div className="p-3">
          <Link size={13} className="text-[#5F6F65] mb-1.5" />
          <p className="text-xs text-[#5F6F65] font-bold truncate">{asset.label}</p>
        </div>
      )}
      {asset.type === 'note' && (
        <div className="p-3">
          <FileText size={13} className="text-[#9C8A7A] mb-1.5" />
          <p className="text-xs text-[#4A3A2A] leading-relaxed whitespace-pre-wrap">{asset.value}</p>
        </div>
      )}
      {/* Hover actions */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-start justify-end gap-1.5 p-2 opacity-0 group-hover:opacity-100">
        {asset.type === 'image' && (
          <button onClick={onExpand} className="w-7 h-7 bg-white/90 rounded-lg flex items-center justify-center shadow text-[#2C2511] hover:bg-white">
            <Maximize2 size={13} />
          </button>
        )}
        <button onClick={onDelete} className="w-7 h-7 bg-white/90 rounded-lg flex items-center justify-center shadow text-rose-600 hover:bg-white">
          <X size={13} />
        </button>
      </div>
    </div>
  );
};

const FullscreenContent = ({ asset, clientId }) => {
  const [imgSrc, setImgSrc] = useState(null);
  React.useEffect(() => {
    if (asset.type === 'image' && window.electronAPI) {
      window.electronAPI.clientReadFile({ clientId, filename: asset.value })
        .then(res => { if (res?.success) setImgSrc(`data:image/jpeg;base64,${res.data}`); })
        .catch(() => {});
    }
  }, [asset, clientId]);
  if (asset.type === 'image' && imgSrc) {
    return <img src={imgSrc} alt={asset.label} className="max-w-full max-h-full object-contain rounded-xl" onClick={e => e.stopPropagation()} />;
  }
  return null;
};

export default InspirationBoard;
