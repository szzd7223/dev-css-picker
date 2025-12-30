import React, { useState, useEffect, useCallback } from 'react';
import { Image, Maximize2, Minimize2, Copy, Download, MousePointerClick, RefreshCw, Layout, Smartphone, Layers, ArrowLeft } from 'lucide-react';
import { SliderInput, SelectInput, ColorInput } from '../ui/StyleControls';

const ControlSection = ({ title, icon: Icon, children }) => (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
            <Icon size={16} className="text-slate-400" />
            <span className="text-sm font-bold text-slate-200">{title}</span>
        </div>
        <div className="p-4 space-y-4">
            {children}
        </div>
    </div>
);

export default function ImagesTab({ selectedElement, onSelectElement, onTabChange }) {
    const [images, setImages] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const [localStyles, setLocalStyles] = useState({});
    const [originalStyles, setOriginalStyles] = useState({});
    const [isCopied, setIsCopied] = useState(false);
    const [lockAspectRatio, setLockAspectRatio] = useState(false);
    const [aspectRatio, setAspectRatio] = useState(1);

    const scanPage = useCallback(() => {
        setIsScanning(true);
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, { type: 'SCAN_IMAGES' }, (response) => {
                    if (response) {
                        setImages(response);
                    }
                    setIsScanning(false);
                });
            } else {
                setIsScanning(false);
            }
        });
    }, []);

    useEffect(() => {
        scanPage();
    }, [scanPage]);

    useEffect(() => {
        if (selectedElement && selectedElement.imageInfo) {
            const styles = selectedElement.imageInfo.styles;
            const initialState = {
                width: selectedElement.width + 'px',
                height: selectedElement.height + 'px',
                borderRadius: styles.borderRadius,
                opacity: styles.opacity,
                objectFit: styles.objectFit,
                objectPosition: styles.objectPosition,
                backgroundSize: styles.backgroundSize,
                backgroundPosition: styles.backgroundPosition,
                backgroundRepeat: styles.backgroundRepeat,
                overflow: styles.overflow || 'visible'
            };
            setLocalStyles(initialState);
            setOriginalStyles(initialState);

            const w = parseInt(initialState.width) || 0;
            const h = parseInt(initialState.height) || 0;
            if (h > 0) setAspectRatio(w / h);
        }
    }, [selectedElement]);

    const handleSelectImage = (img) => {
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'SELECT_NODE',
                    payload: { cpId: img.cpId }
                }, (response) => {
                    if (response) {
                        onSelectElement(response);
                    }
                });
                chrome.tabs.sendMessage(tabs[0].id, { type: 'HIGHLIGHT_NODE', payload: { cpId: img.cpId } });
            }
        });
    };

    const handleStyleChange = (property, value) => {
        let updates = { [property]: value };

        if (lockAspectRatio && (property === 'width' || property === 'height')) {
            if (property === 'width') {
                const val = parseInt(value) || 0;
                const newHeight = Math.round(val / aspectRatio);
                updates.height = `${newHeight}px`;
            } else {
                const val = parseInt(value) || 0;
                const newWidth = Math.round(val * aspectRatio);
                updates.width = `${newWidth}px`;
            }
        }

        setLocalStyles(prev => ({ ...prev, ...updates }));
        if (selectedElement) {
            chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
                if (tabs[0]?.id) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        type: 'UPDATE_STYLE',
                        payload: {
                            cpId: selectedElement.cpId,
                            styles: updates
                        }
                    });
                }
            });
        }
    };

    const handleReset = (property) => {
        if (originalStyles[property] !== undefined) {
            handleStyleChange(property, originalStyles[property]);
        }
    };

    const copyUrl = () => {
        if (selectedElement?.imageInfo?.url) {
            navigator.clipboard.writeText(selectedElement.imageInfo.url);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    const downloadImage = () => {
        if (selectedElement?.imageInfo?.url) {
            const link = document.createElement('a');
            link.href = selectedElement.imageInfo.url;
            link.download = `image-${selectedElement.cpId}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="p-4 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => onTabChange('overview')} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                        <ArrowLeft size={18} />
                    </button>
                    <h2 className="text-xl font-bold text-white">Images</h2>
                </div>
                <button
                    onClick={scanPage}
                    disabled={isScanning}
                    className="p-2 bg-slate-800 rounded-full text-blue-400 hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Gallery View */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Page Assets ({images.length})</h3>
                </div>
                <div className="grid grid-cols-4 gap-2 bg-slate-900/50 p-2 rounded-xl border border-slate-800 max-h-[180px] overflow-y-auto">
                    {images.map((img) => (
                        <button
                            key={img.cpId}
                            onClick={() => handleSelectImage(img)}
                            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all group ${selectedElement?.cpId === img.cpId ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-800 hover:border-slate-600'
                                }`}
                        >
                            <img src={img.url} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Maximize2 size={12} className="text-white" />
                            </div>
                        </button>
                    ))}
                    {images.length === 0 && !isScanning && (
                        <div className="col-span-4 py-8 text-center text-slate-500 text-xs font-medium">
                            No images found on this page
                        </div>
                    )}
                </div>
            </div>

            {selectedElement && selectedElement.imageInfo ? (
                <div className="space-y-6">
                    {/* Selected Image Info */}
                    <div className="bg-slate-800 rounded-xl border border-blue-500/30 p-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2">
                            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold uppercase">
                                {selectedElement.imageInfo.type}
                            </span>
                        </div>
                        <div className="flex gap-4 mb-4">
                            <div className="w-20 h-20 bg-slate-950 rounded-lg overflow-hidden border border-slate-700 flex-shrink-0">
                                <img src={selectedElement.imageInfo.url} alt="" className="w-full h-full object-contain" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-slate-400 truncate mb-1">{selectedElement.imageInfo.url}</p>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold">Rendered</p>
                                        <p className="text-xs text-slate-200 font-mono">
                                            {selectedElement.imageInfo.renderedSize.width} × {selectedElement.imageInfo.renderedSize.height}
                                        </p>
                                    </div>
                                    {selectedElement.imageInfo.intrinsicSize && (
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Intrinsic</p>
                                            <p className="text-xs text-slate-200 font-mono">
                                                {selectedElement.imageInfo.intrinsicSize.width} × {selectedElement.imageInfo.intrinsicSize.height}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={copyUrl}
                                className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            >
                                {isCopied ? <><Smartphone size={14} className="text-green-500" /> Done</> : <><Copy size={14} /> Copy URL</>}
                            </button>
                            <button
                                onClick={downloadImage}
                                className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            >
                                <Download size={14} /> Download
                            </button>
                        </div>
                    </div>

                    {/* Layout & Sizing */}
                    <ControlSection title="Layout & Sizing" icon={Layout}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Proportions</span>
                            <button
                                onClick={() => setLockAspectRatio(!lockAspectRatio)}
                                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${lockAspectRatio ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}
                            >
                                {lockAspectRatio ? <Maximize2 size={10} /> : <Minimize2 size={10} />}
                                Lock Aspect Ratio
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <SliderInput
                                label="Width"
                                value={localStyles.width}
                                onChange={(val) => handleStyleChange('width', val)}
                                originalValue={originalStyles.width}
                                onReset={() => handleReset('width')}
                                allowAuto
                            />
                            <SliderInput
                                label="Height"
                                value={localStyles.height}
                                onChange={(val) => handleStyleChange('height', val)}
                                originalValue={originalStyles.height}
                                onReset={() => handleReset('height')}
                                allowAuto
                            />
                        </div>

                        {selectedElement.imageInfo.type === 'Image' && (
                            <>
                                <SelectInput
                                    label="Object Fit"
                                    value={localStyles.objectFit}
                                    onChange={(val) => handleStyleChange('objectFit', val)}
                                    originalValue={originalStyles.objectFit}
                                    onReset={() => handleReset('objectFit')}
                                    options={[
                                        { value: 'fill', label: 'Fill' },
                                        { value: 'contain', label: 'Contain' },
                                        { value: 'cover', label: 'Cover' },
                                        { value: 'none', label: 'None' },
                                        { value: 'scale-down', label: 'Scale Down' },
                                    ]}
                                />
                                <SelectInput
                                    label="Object Position"
                                    value={localStyles.objectPosition}
                                    onChange={(val) => handleStyleChange('objectPosition', val)}
                                    originalValue={originalStyles.objectPosition}
                                    onReset={() => handleReset('objectPosition')}
                                    options={[
                                        { value: 'top', label: 'Top' },
                                        { value: 'center', label: 'Center' },
                                        { value: 'bottom', label: 'Bottom' },
                                        { value: 'left', label: 'Left' },
                                        { value: 'right', label: 'Right' },
                                    ]}
                                />
                            </>
                        )}
                    </ControlSection>

                    {/* Background Helpers */}
                    {selectedElement.imageInfo.type === 'Background' && (
                        <ControlSection title="Background Helpers" icon={Layers}>
                            <SelectInput
                                label="Background Size"
                                value={localStyles.backgroundSize}
                                onChange={(val) => handleStyleChange('backgroundSize', val)}
                                originalValue={originalStyles.backgroundSize}
                                onReset={() => handleReset('backgroundSize')}
                                options={[
                                    { value: 'auto', label: 'Auto' },
                                    { value: 'cover', label: 'Cover' },
                                    { value: 'contain', label: 'Contain' },
                                ]}
                            />
                            <SelectInput
                                label="Background Position"
                                value={localStyles.backgroundPosition}
                                onChange={(val) => handleStyleChange('backgroundPosition', val)}
                                originalValue={originalStyles.backgroundPosition}
                                onReset={() => handleReset('backgroundPosition')}
                                options={[
                                    { value: 'top', label: 'Top' },
                                    { value: 'center', label: 'Center' },
                                    { value: 'bottom', label: 'Bottom' },
                                    { value: 'left', label: 'Left' },
                                    { value: 'right', label: 'Right' },
                                ]}
                            />
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-400 uppercase">Repeat</span>
                                <button
                                    onClick={() => handleStyleChange('backgroundRepeat', localStyles.backgroundRepeat === 'repeat' ? 'no-repeat' : 'repeat')}
                                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all border ${localStyles.backgroundRepeat === 'repeat' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                                >
                                    {localStyles.backgroundRepeat === 'repeat' ? 'Repeat On' : 'No Repeat'}
                                </button>
                            </div>
                        </ControlSection>
                    )}

                    {/* Styling Helpers */}
                    <ControlSection title="Styling Helpers" icon={Smartphone}>
                        <SliderInput
                            label="Border Radius"
                            value={localStyles.borderRadius}
                            onChange={(val) => handleStyleChange('borderRadius', val)}
                            originalValue={originalStyles.borderRadius}
                            onReset={() => handleReset('borderRadius')}
                            min={0} max={100}
                        />
                        <SliderInput
                            label="Opacity"
                            value={localStyles.opacity}
                            onChange={(val) => handleStyleChange('opacity', val)}
                            originalValue={originalStyles.opacity}
                            onReset={() => handleReset('opacity')}
                            min={0} max={1}
                        />

                        <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                            <span className="text-xs font-medium text-slate-400 uppercase">Overflow</span>
                            <div className="flex gap-1">
                                {['visible', 'hidden'].map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => handleStyleChange('overflow', mode)}
                                        className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all border ${localStyles.overflow === mode ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </ControlSection>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-slate-800 text-slate-600 rounded-full flex items-center justify-center mb-4">
                        <MousePointerClick size={32} />
                    </div>
                    <p className="text-slate-400 text-sm max-w-[200px]">
                        Select an image from the gallery or use inspect mode to edit properties
                    </p>
                    <button
                        onClick={() => onTabChange('inspector')}
                        className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2"
                    >
                        <MousePointerClick size={16} /> Start Inspecting
                    </button>
                </div>
            )}
        </div>
    );
}
