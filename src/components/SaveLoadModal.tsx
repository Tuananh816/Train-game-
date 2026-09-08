import React, { useState, useEffect, useRef } from 'react';
import { SaveData } from '../types';
import {
  getSaveSlots,
  saveToSlot,
  loadFromSlot,
  deleteSlot,
  exportSaveDataJSON,
  importSaveDataJSON,
  resetGameSave,
  SaveSlotInfo,
} from '../utils/storage';
import { audioSynthesizer } from '../utils/audioSynthesizer';
import {
  Save,
  FolderOpen,
  X,
  Clock,
  Coins,
  MapPin,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface SaveLoadModalProps {
  isOpen: boolean;
  currentSaveData: SaveData;
  onLoadSave: (data: SaveData) => void;
  onClose: () => void;
  onNewGame?: () => void;
  initialTab?: 'SAVE' | 'LOAD';
}

export const SaveLoadModal: React.FC<SaveLoadModalProps> = ({
  isOpen,
  currentSaveData,
  onLoadSave,
  onClose,
  onNewGame,
  initialTab = 'SAVE',
}) => {
  const [activeTab, setActiveTab] = useState<'SAVE' | 'LOAD'>(initialTab);
  const [slots, setSlots] = useState<SaveSlotInfo[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshSlots = () => {
    setSlots(getSaveSlots());
  };

  useEffect(() => {
    if (isOpen) {
      refreshSlots();
      setStatusMessage(null);
      setConfirmDeleteId(null);
    }
  }, [isOpen]);

  const showToast = (text: string, type: 'success' | 'error') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  if (!isOpen) return null;

  const handleSaveToSlot = (slotId: string) => {
    const success = saveToSlot(slotId, currentSaveData);
    if (success) {
      audioSynthesizer.playChimeSuccess();
      showToast(`Đã lưu thành công vào ${slots.find((s) => s.id === slotId)?.name || slotId}!`, 'success');
      refreshSlots();
    } else {
      showToast('Lỗi khi lưu dữ liệu vào trình duyệt!', 'error');
    }
  };

  const handleLoadFromSlot = (slotId: string) => {
    const data = loadFromSlot(slotId);
    if (data) {
      audioSynthesizer.playStationBell();
      onLoadSave(data);
      showToast(`Đã tải thành công dữ liệu từ ${slots.find((s) => s.id === slotId)?.name || slotId}!`, 'success');
      setTimeout(() => {
        onClose();
      }, 500);
    } else {
      showToast('Không tìm thấy dữ liệu trong khe lưu này!', 'error');
    }
  };

  const handleDeleteSlot = (slotId: string) => {
    const success = deleteSlot(slotId);
    if (success) {
      audioSynthesizer.playSteamHiss();
      showToast('Đã xóa dữ liệu khe lưu!', 'success');
      setConfirmDeleteId(null);
      refreshSlots();
    } else {
      showToast('Không thể xóa khe lưu này!', 'error');
    }
  };

  const handleExportJSON = () => {
    try {
      const jsonStr = exportSaveDataJSON(currentSaveData);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const now = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.download = `train_world_save_${now}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      audioSynthesizer.playChimeSuccess();
      showToast('Đã xuất file lưu (.json) về thiết bị thành công!', 'success');
    } catch {
      showToast('Lỗi khi xuất dữ liệu!', 'error');
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const imported = importSaveDataJSON(text);
        if (imported) {
          saveToSlot('autosave', imported);
          audioSynthesizer.playStationBell();
          onLoadSave(imported);
          showToast('Đã khôi phục file lưu thành công!', 'success');
          refreshSlots();
          setTimeout(() => onClose(), 600);
        } else {
          showToast('File lưu không đúng định dạng của Train World!', 'error');
        }
      } catch {
        showToast('Không thể đọc dữ liệu từ file!', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetGame = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tiến trình hiện tại và tạo chuyến đi mới hoàn toàn?')) {
      const def = resetGameSave();
      audioSynthesizer.playWhistle();
      onLoadSave(def);
      if (onNewGame) onNewGame();
      showToast('Đã khởi động lại hành trình mới!', 'success');
      refreshSlots();
      setTimeout(() => onClose(), 600);
    }
  };

  return (
    <div
      id="save-load-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="save-load-modal-card"
        className="w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border-2 border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-slate-950/80 border-b border-slate-800 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              {activeTab === 'SAVE' ? <Save className="w-5 h-5" /> : <FolderOpen className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-amber-300 tracking-wide flex items-center gap-2">
                HỆ THỐNG LƯU & TẢI GAME
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-mono border border-amber-500/30">
                  v2.0
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Quản lý tiến trình hành trình đường sắt, xuất file dự phòng và tải lại dữ liệu.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-3 gap-2">
          <button
            onClick={() => {
              setActiveTab('SAVE');
              audioSynthesizer.playChuff(0.4);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-sm transition cursor-pointer border-t border-x ${
              activeTab === 'SAVE'
                ? 'bg-slate-900 border-amber-500/50 text-amber-300 shadow-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>Lưu Trò Chơi (Save)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('LOAD');
              audioSynthesizer.playChuff(0.4);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-sm transition cursor-pointer border-t border-x ${
              activeTab === 'LOAD'
                ? 'bg-slate-900 border-amber-500/50 text-amber-300 shadow-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Tải Trò Chơi (Load)</span>
          </button>
        </div>

        {/* Toast alert banner */}
        {statusMessage && (
          <div
            className={`px-5 py-2.5 text-xs font-semibold flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/80 text-emerald-300 border-b border-emerald-500/30'
                : 'bg-rose-950/80 text-rose-300 border-b border-rose-500/30'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Content Body: Slot List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {slots.map((slot) => {
            const isDeleting = confirmDeleteId === slot.id;

            return (
              <div
                key={slot.id}
                className={`p-4 rounded-xl border transition-all ${
                  slot.isEmpty
                    ? 'bg-slate-900/30 border-slate-800/80 text-slate-500'
                    : 'bg-slate-900/80 border-slate-700/80 hover:border-amber-500/50 shadow-md'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-200">{slot.name}</span>
                      {slot.isAutosave && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-600/40 font-mono">
                          Tự Động Lưu (5s)
                        </span>
                      )}
                      {slot.isEmpty && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          (Chưa có dữ liệu)
                        </span>
                      )}
                    </div>

                    {!slot.isEmpty ? (
                      <div className="flex items-center gap-4 text-xs text-slate-300 flex-wrap">
                        <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{slot.stationName || 'Ga Khởi Hành'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-amber-300 font-mono">
                          <Coins className="w-3.5 h-3.5" />
                          <span>{slot.gold?.toLocaleString('vi-VN')} G</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 font-mono">
                          <span>🚂 Động cơ Lv{slot.engineLevel}</span>
                          <span>•</span>
                          <span>{slot.carCount} toa tàu</span>
                          <span>•</span>
                          <span>{slot.distanceKm} km</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                          <Clock className="w-3 h-3" />
                          <span>{slot.timestamp}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">Khe trống, sẵn sàng lưu dữ liệu hành trình mới.</p>
                    )}
                  </div>

                  {/* Slot Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {activeTab === 'SAVE' ? (
                      <button
                        onClick={() => handleSaveToSlot(slot.id)}
                        className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 active:scale-95 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer shadow-md"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{slot.isEmpty ? 'Lưu vào đây' : 'Ghi đè'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleLoadFromSlot(slot.id)}
                        disabled={slot.isEmpty}
                        className={`flex items-center gap-1.5 font-bold px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer shadow-md ${
                          slot.isEmpty
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                            : 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white'
                        }`}
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>Tải Slot này</span>
                      </button>
                    )}

                    {!slot.isEmpty && !slot.isAutosave && (
                      <>
                        {isDeleting ? (
                          <div className="flex items-center gap-1 bg-rose-950/90 border border-rose-600/60 p-1 rounded-lg">
                            <span className="text-[10px] text-rose-300 font-semibold px-1">Xóa?</span>
                            <button
                              onClick={() => handleDeleteSlot(slot.id)}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded cursor-pointer"
                            >
                              Có
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded cursor-pointer"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(slot.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                            title="Xóa khe lưu này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Utilities: Import/Export JSON and Reset */}
        <div className="bg-slate-950/90 border-t border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg font-medium transition active:scale-95 cursor-pointer"
              title="Tải toàn bộ file lưu .json về máy để sao lưu hoặc chuyển đổi"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Xuất File Lưu (.json)</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg font-medium transition active:scale-95 cursor-pointer"
              title="Tải file .json đã lưu từ máy lên để khôi phục tiến trình"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Nhập File Lưu</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFile}
              accept=".json"
              className="hidden"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleResetGame}
              className="flex items-center gap-1 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 px-2.5 py-1.5 rounded-lg transition cursor-pointer text-xs"
              title="Xóa tiến trình và khởi động lại game từ đầu"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Tạo Game Mới (Reset)</span>
            </button>

            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-1.5 rounded-lg transition active:scale-95 cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
