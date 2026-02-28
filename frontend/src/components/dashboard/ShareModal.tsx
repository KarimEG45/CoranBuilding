'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Download, Copy, Check, Share2 } from 'lucide-react';

type PageStatus = 'locked' | 'started' | 'revise' | 'mastered';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    username: string;
    stats: { mastered: number; total: number; percentage: number; streak: number };
    progress: Record<number, PageStatus>;
}

const STATUS_COLORS: Record<PageStatus, string> = {
    mastered: '#10b981',  // emerald-500
    revise: '#f59e0b',  // amber-500
    started: '#60a5fa',  // blue-400
    locked: '#1e293b',  // slate-800
};

export default function ShareModal({ isOpen, onClose, username, stats, progress }: ShareModalProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [copied, setCopied] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && canvasRef.current) {
            generateCard();
        }
    }, [isOpen, username, stats, progress]);

    const generateCard = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const W = 1080;
        const H = 1080;
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d')!;

        // ── Background gradient ──────────────────────────────────────
        const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0, '#0f172a');   // slate-900
        bgGrad.addColorStop(0.5, '#1e3a5f');
        bgGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // ── Decorative circles (glow) ─────────────────────────────────
        const drawGlow = (x: number, y: number, r: number, color: string, alpha: number) => {
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, color.replace(')', `, ${alpha})`).replace('rgb', 'rgba'));
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        };
        drawGlow(150, 200, 250, 'rgb(14, 165, 233)', 0.15);  // sky top-left
        drawGlow(950, 800, 300, 'rgb(139, 92, 246)', 0.12);  // purple bottom-right
        drawGlow(540, 540, 400, 'rgb(16, 185, 129)', 0.06);  // green center

        // ── Header ───────────────────────────────────────────────────
        // Logo / icon area
        ctx.fillStyle = 'rgba(14,165,233,0.15)';
        roundRect(ctx, 80, 70, 70, 70, 18);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 38px serif';
        ctx.textAlign = 'center';
        ctx.fillText('🕌', 115, 120);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 44px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Mon Coran Building', 165, 110);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '26px system-ui, sans-serif';
        ctx.fillText(`@${username}  •  ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`, 165, 148);

        // Separator line
        ctx.strokeStyle = 'rgba(148,163,184,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(80, 170);
        ctx.lineTo(W - 80, 170);
        ctx.stroke();

        // ── Building mini-visualization ──────────────────────────────
        // Represent 604 pages as tiny colored blocks in a building shape
        const FLOORS = 30;     // 30 floors visible
        const PAGES_PER_FLOOR = Math.ceil(604 / FLOORS);  // ~20 pages/floor
        const COLS = PAGES_PER_FLOOR;

        const bldgX = 80;
        const bldgY = 195;
        const bldgW = W - 160;
        const bldgH = 420;

        const cellW = bldgW / COLS;
        const cellH = bldgH / FLOORS;
        const pad = 1.5;

        for (let floor = 0; floor < FLOORS; floor++) {
            for (let col = 0; col < COLS; col++) {
                const pageNum = floor * COLS + col + 1;
                if (pageNum > 604) break;

                const status: PageStatus = progress[pageNum] || 'locked';
                const color = STATUS_COLORS[status];

                const x = bldgX + col * cellW + pad;
                const y = bldgY + (FLOORS - 1 - floor) * cellH + pad;
                const w = cellW - pad * 2;
                const h = cellH - pad * 2;

                ctx.fillStyle = color;
                ctx.globalAlpha = status === 'locked' ? 0.25 : 0.9;
                roundRect(ctx, x, y, w, h, 3);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;

        // Building outline
        ctx.strokeStyle = 'rgba(148,163,184,0.3)';
        ctx.lineWidth = 2;
        roundRect(ctx, bldgX - 2, bldgY - 2, bldgW + 4, bldgH + 4, 8);
        ctx.stroke();

        // Floor labels
        ctx.fillStyle = 'rgba(148,163,184,0.6)';
        ctx.font = '18px system-ui';
        ctx.textAlign = 'left';
        ctx.fillText('Page 1', bldgX, bldgY + bldgH + 22);
        ctx.textAlign = 'right';
        ctx.fillText('Page 604', bldgX + bldgW, bldgY + bldgH + 22);

        // ── Stats row ────────────────────────────────────────────────
        const statsY = 670;

        const drawStat = (x: number, label: string, value: string, accent: string, emoji: string) => {
            // Card bg
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            roundRect(ctx, x, statsY, 260, 140, 20);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1;
            roundRect(ctx, x, statsY, 260, 140, 20);
            ctx.stroke();

            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 42px system-ui';
            ctx.textAlign = 'left';
            ctx.fillText(value, x + 22, statsY + 68);

            ctx.fillStyle = '#94a3b8';
            ctx.font = '22px system-ui';
            ctx.fillText(label, x + 22, statsY + 102);

            ctx.font = '32px serif';
            ctx.textAlign = 'right';
            ctx.fillText(emoji, x + 242, statsY + 72);
        };

        drawStat(80, 'Pages maîtrisées', `${stats.mastered}`, '#10b981', '📖');
        drawStat(360, 'Progression', `${stats.percentage.toFixed(1)}%`, '#38bdf8', '📊');
        drawStat(640, 'Série actuelle', `${stats.streak} j.`, '#f59e0b', '🔥');

        // Progress bar
        const barY = statsY + 155;
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        roundRect(ctx, 80, barY, W - 160, 28, 14);
        ctx.fill();

        const fillW = Math.max(28, (stats.percentage / 100) * (W - 160));
        const barGrad = ctx.createLinearGradient(80, 0, 80 + fillW, 0);
        barGrad.addColorStop(0, '#10b981');
        barGrad.addColorStop(1, '#38bdf8');
        ctx.fillStyle = barGrad;
        roundRect(ctx, 80, barY, fillW, 28, 14);
        ctx.fill();

        // ── Legend ───────────────────────────────────────────────────
        const legendY = barY + 50;
        const legends: [string, string][] = [
            [STATUS_COLORS.mastered, 'Maîtrisé'],
            [STATUS_COLORS.revise, 'À réviser'],
            [STATUS_COLORS.started, 'En cours'],
            [STATUS_COLORS.locked, 'Non débuté'],
        ];
        let lx = 80;
        ctx.font = '20px system-ui';
        for (const [color, label] of legends) {
            ctx.fillStyle = color;
            ctx.globalAlpha = color === STATUS_COLORS.locked ? 0.4 : 1;
            ctx.beginPath();
            ctx.arc(lx + 10, legendY + 10, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#94a3b8';
            ctx.textAlign = 'left';
            ctx.fillText(label, lx + 26, legendY + 15);
            lx += ctx.measureText(label).width + 60;
        }

        // ── Footer ───────────────────────────────────────────────────
        ctx.fillStyle = 'rgba(148,163,184,0.4)';
        ctx.font = '22px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Généré par The Coran Building App', W / 2, H - 45);

        // ── Export ───────────────────────────────────────────────────
        setImageUrl(canvas.toDataURL('image/png'));
    };

    const handleDownload = () => {
        if (!imageUrl) return;
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = `coran-building-${username}-${new Date().toISOString().slice(0, 10)}.png`;
        a.click();
    };

    const handleCopy = async () => {
        if (!canvasRef.current) return;
        try {
            canvasRef.current.toBlob(async (blob) => {
                if (!blob) return;
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
            });
        } catch {
            // Fallback: just download
            handleDownload();
        }
    };

    const handleNativeShare = async () => {
        if (!canvasRef.current) return;
        canvasRef.current.toBlob(async (blob) => {
            if (!blob) return;
            const file = new File([blob], `coran-building-${username}.png`, { type: 'image/png' });
            if (navigator.canShare?.({ files: [file] })) {
                await navigator.share({ files: [file], title: 'Mon Coran Building', text: `J'ai maîtrisé ${stats.mastered}/604 pages du Coran ! 📖` });
            } else {
                handleDownload();
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                            <Share2 size={20} className="text-sky-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Partager ma progression</h2>
                            <p className="text-sm text-slate-400">{stats.mastered} pages maîtrisées sur 604</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <X size={22} />
                    </button>
                </div>

                {/* Preview */}
                <div className="px-8 py-6">
                    {/* Hidden canvas used for generation */}
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Preview image */}
                    {imageUrl && (
                        <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-lg w-full">
                            <img src={imageUrl} alt="Carte de progression" className="w-full object-contain" />
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-8 pb-8 flex gap-3">
                    <button
                        onClick={handleDownload}
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl font-semibold transition-all shadow-lg shadow-sky-500/25 hover:-translate-y-0.5 active:scale-95"
                    >
                        <Download size={20} />
                        Télécharger PNG
                    </button>

                    <button
                        onClick={handleCopy}
                        className="flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-semibold transition-all hover:-translate-y-0.5 active:scale-95"
                    >
                        {copied ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} />}
                        {copied ? 'Copié !' : 'Copier'}
                    </button>

                    <button
                        onClick={handleNativeShare}
                        className="flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-semibold transition-all hover:-translate-y-0.5 active:scale-95"
                    >
                        <Share2 size={20} />
                        Partager
                    </button>
                </div>
            </div>
        </div>
    );
}

// Helper: rounded rectangle path
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}
