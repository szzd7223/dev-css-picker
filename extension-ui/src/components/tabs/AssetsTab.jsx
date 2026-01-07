import React, { useState, useEffect, useCallback } from 'react';
import { Image, Maximize2, Minimize2, Copy, Download, MousePointerClick, RefreshCw, Layout, Smartphone, Layers, ArrowLeft, Box } from 'lucide-react';
import { SliderInput, SelectInput, ColorInput } from '../ui/StyleControls';
import { isRestrictedUrl } from '../../utils/browserUtils';

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


export default function AssetsTab({ selectedElement, onSelectElement, onTabChange }) {
    const [assets, setAssets] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all'); // all, image, svg, background
    const [localStyles, setLocalStyles] = useState({});
    const [originalStyles, setOriginalStyles] = useState({});
    const [isCopied, setIsCopied] = useState(false);
    const [lockAspectRatio, setLockAspectRatio] = useState(false);
    const [aspectRatio, setAspectRatio] = useState(1);

    const scanPage = useCallback(() => {
        setIsScanning(true);
        setError(null);
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            if (!activeTab?.id) {
                setError("No active tab.");
                setIsScanning(false);
                return;
            }

            if (isRestrictedUrl(activeTab.url)) {
                setError("RESTRICTED_PAGE");
                setIsScanning(false);
                return;
            }

            chrome.tabs.sendMessage(activeTab.id, { type: 'SCAN_ASSETS' }, (response) => {
                if (chrome.runtime.lastError) {
                    setError("Could not connect to page.");
                    setIsScanning(false);
                    return;
                }
                if (response) {
                    setAssets(response);
                }
                setIsScanning(false);
            });
        });
    }, []);

    useEffect(() => {
        scanPage();
    }, [scanPage]);

    useEffect(() => {
        if (selectedElement?.imageInfo) {
            const styles = selectedElement.imageInfo.styles;

            let borderRadius = parseFloat(styles.borderRadius) || 0;
            const w = selectedElement.width || 0;
            const h = selectedElement.height || 0;

            // Detect if it is a circle
            if (w > 0 && h > 0) {
                const minSide = Math.min(w, h);
                if (borderRadius >= minSide / 2 - 1) { // -1 tolerance
                    borderRadius = '50%';
                }
            }

            const initialState = {
                width: selectedElement.width + 'px',
                height: selectedElement.height + 'px',
                borderRadius: borderRadius,
                opacity: parseFloat(styles.opacity), // Leave raw to handle 0/1 properly
                objectFit: styles.objectFit,
                objectPosition: styles.objectPosition,
                backgroundSize: styles.backgroundSize,
                backgroundPosition: styles.backgroundPosition,
                backgroundRepeat: styles.backgroundRepeat,
                overflow: styles.overflow || 'visible',
                zIndex: styles.zIndex === 'auto' ? 0 : (parseInt(styles.zIndex) || 0),
                position: styles.position
            };

            // Safety measure for NaN opacity
            if (isNaN(initialState.opacity)) initialState.opacity = 1;

            setLocalStyles(initialState);
            setOriginalStyles(initialState);

            const initialW = parseInt(initialState.width) || 0;
            const initialH = parseInt(initialState.height) || 0;
            if (initialH > 0) setAspectRatio(initialW / initialH);
        }
    }, [selectedElement]);

    const handleSelectAsset = (asset) => {
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'SELECT_NODE',
                    payload: { cpId: asset.cpId }
                }, (response) => {
                    if (response) {
                        onSelectElement(response);
                    }
                });
                chrome.tabs.sendMessage(tabs[0].id, { type: 'HIGHLIGHT_NODE', payload: { cpId: asset.cpId } });
            }
        });
    };

    const handleStyleChange = (property, value) => {
        let updates = { [property]: value };

        // Handle Z-Index auto-positioning
        if (property === 'zIndex' && localStyles.position === 'static') {
            updates.position = 'relative';
            // We should notify or just do it. For now, just do it.
        }

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

        // Format specific values if needed
        if (property === 'borderRadius' && typeof value === 'number') {
            updates.borderRadius = `${value}px`;
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

    // Quick Shape Helper
    const applyQuickShape = (shape) => {
        let radius = '0px';
        if (shape === 'rounded') radius = '12px';
        if (shape === 'circle') radius = '50%';

        handleStyleChange('borderRadius', radius);

        // Update local state is handled by handleStyleChange usually, but if we need slider state:
        if (shape !== 'rounded') {
            // Force local update if logic depends on it immediately
            setLocalStyles(p => ({ ...p, borderRadius: radius }));
        } else {
            setLocalStyles(p => ({ ...p, borderRadius: 12 }));
        }
    };

    const handleReset = (property) => {
        if (originalStyles[property] !== undefined) {
            handleStyleChange(property, originalStyles[property]);
        }
    };

    // Check if border radius is in a "custom" state (meaning, not 0 and not 50%)
    // Or if it is currently being edited (we can assume if it's not 0 or 50%, it's custom/rounded)
    const isRadiusCustom = localStyles.borderRadius !== 0 && localStyles.borderRadius !== '0px' && localStyles.borderRadius !== '50%';

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
            link.download = `asset-${selectedElement.cpId}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const filteredAssets = assets.filter(a => {
        if (filter === 'all') return true;
        if (filter === 'image') return a.type === 'Image';
        if (filter === 'svg') return a.type === 'SVG';
        if (filter === 'background') return a.type === 'Background';
        return true;
    });

    return (
        <div className="p-4 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => onTabChange('overview')} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                        <ArrowLeft size={18} />
                    </button>
                    <h2 className="text-xl font-bold text-white">Assets</h2>
                </div>
                <button
                    onClick={scanPage}
                    disabled={isScanning}
                    className="p-2 bg-slate-800 rounded-full text-blue-400 hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 custom-scrollbar">
                {[
                    { id: 'all', label: 'All' },
                    { id: 'image', label: 'Images' },
                    { id: 'svg', label: 'SVGs' },
                    { id: 'background', label: 'Backgrounds' }
                ].map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${filter === f.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Gallery View */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {filter === 'all' ? 'All Assets' : filter} ({filteredAssets.length})
                    </h3>
                </div>

                {error ? (
                    <div className="bg-slate-900/50 p-8 rounded-xl border border-slate-800 text-center flex flex-col items-center">
                        <div className={`w-10 h-10 ${error === 'RESTRICTED_PAGE' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'} rounded-full flex items-center justify-center mb-3`}>
                            <Box size={20} />
                        </div>
                        <p className="text-slate-400 text-xs max-w-[180px]">
                            {error === 'RESTRICTED_PAGE'
                                ? "Assets cannot be scanned on restricted browser pages."
                                : error}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-4 gap-2 bg-slate-900/50 p-2 rounded-xl border border-slate-800 max-h-[180px] overflow-y-auto">
                        {filteredAssets.map((asset) => (
                            <button
                                key={asset.cpId}
                                onClick={() => handleSelectAsset(asset)}
                                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all group flex items-center justify-center bg-slate-950 ${selectedElement?.cpId === asset.cpId ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-800 hover:border-slate-600'
                                    }`}
                            >
                                {asset.type === 'SVG' ? (
                                    <FileCode size={24} className="text-slate-500" />
                                ) : (
                                    <img src={asset.url} alt="" className="w-full h-full object-cover" />
                                )}

                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Maximize2 size={12} className="text-white" />
                                </div>
                                {asset.type !== 'Image' && (
                                    <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/50 rounded text-[8px] text-white font-bold uppercase backdrop-blur-sm">
                                        {asset.type === 'SVG' ? 'SVG' : 'BG'}
                                    </div>
                                )}
                            </button>
                        ))}
                        {filteredAssets.length === 0 && !isScanning && (
                            <div className="col-span-4 py-8 text-center text-slate-500 text-xs font-medium">
                                No assets found using this filter
                            </div>
                        )
                        }
                    </div>
                )}
            </div>

            {selectedElement?.imageInfo ? (
                <div className="space-y-6">
                    {/* Selected Asset Info */}
                    <div className="bg-slate-800 rounded-xl border border-blue-500/30 p-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2">
                            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold uppercase">
                                {selectedElement.imageInfo?.type || 'Element'}
                            </span>
                        </div>
                        <div className="flex gap-4 mb-4">
                            <div className="w-20 h-20 bg-slate-950 rounded-lg overflow-hidden border border-slate-700 flex-shrink-0 flex items-center justify-center">
                                {selectedElement.imageInfo?.type === 'SVG' ? (
                                    <FileCode size={32} className="text-slate-500" />
                                ) : (
                                    <img src={selectedElement.imageInfo?.url || ''} alt="" className="w-full h-full object-contain" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-slate-400 truncate mb-1">
                                    {selectedElement.imageInfo?.url || `<${selectedElement.tagName}>`}
                                </p>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {selectedElement.imageInfo?.renderedSize && (
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Rendered</p>
                                            <p className="text-xs text-slate-200 font-mono">
                                                {selectedElement.imageInfo.renderedSize.width} × {selectedElement.imageInfo.renderedSize.height}
                                            </p>
                                        </div>
                                    )}
                                    {selectedElement.imageInfo?.intrinsicSize && (
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Intrinsic</p>
                                            <p className="text-xs text-slate-200 font-mono">
                                                {selectedElement.imageInfo.intrinsicSize.width} × {selectedElement.imageInfo.intrinsicSize.height}
                                            </p>
                                        </div>
                                    )}
                                    {selectedElement.imageInfo?.svgInfo?.viewBox && (
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">ViewBox</p>
                                            <p className="text-xs text-slate-200 font-mono truncate">
                                                {selectedElement.imageInfo.svgInfo.viewBox}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {selectedElement.imageInfo?.url && (
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
                        )}
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

                        {selectedElement.imageInfo?.type === 'Image' && (
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
                    {selectedElement.imageInfo?.type === 'Background' && (
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
                        {/* Quick Shapes */}
                        <div className="mb-4">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Quick Shapes</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => applyQuickShape('square')}
                                    className={`p-2 bg-slate-800 border rounded hover:border-slate-500 transition-colors ${localStyles.borderRadius === 0 || localStyles.borderRadius === '0px' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700'}`}
                                    title="Square"
                                >
                                    <div className="w-4 h-4 bg-slate-400"></div>
                                </button>
                                <button
                                    onClick={() => applyQuickShape('rounded')}
                                    className={`p-2 bg-slate-800 border rounded hover:border-slate-500 transition-colors ${isRadiusCustom ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700'}`}
                                    title="Rounded"
                                >
                                    <div className="w-4 h-4 bg-slate-400 rounded-md"></div>
                                </button>
                                <button
                                    onClick={() => applyQuickShape('circle')}
                                    className={`p-2 bg-slate-800 border rounded hover:border-slate-500 transition-colors ${localStyles.borderRadius === '50%' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700'}`}
                                    title="Circle"
                                >
                                    <div className="w-4 h-4 bg-slate-400 rounded-full"></div>
                                </button>
                            </div>
                        </div>

                        {isRadiusCustom && (
                            <SliderInput
                                label="Border Radius"
                                value={parseInt(localStyles.borderRadius) || 0}
                                onChange={(val) => handleStyleChange('borderRadius', val)}
                                originalValue={parseInt(originalStyles.borderRadius) || 0}
                                onReset={() => handleReset('borderRadius')}
                                min={0} max={100}
                            />
                        )}

                        <SliderInput
                            label="Opacity"
                            value={localStyles.opacity}
                            onChange={(val) => handleStyleChange('opacity', val)}
                            originalValue={originalStyles.opacity}
                            onReset={() => handleReset('opacity')}
                            min={0} max={1} step={0.01}
                            unitless
                        />

                        <div className="space-y-4 pt-2">
                            <div className="relative group">
                                <SliderInput
                                    label="Z-Index"
                                    value={localStyles.zIndex}
                                    onChange={(val) => handleStyleChange('zIndex', val)}
                                    originalValue={originalStyles.zIndex}
                                    onReset={() => handleReset('zIndex')}
                                    min={0} max={99999}
                                    unitless
                                    hideSlider
                                />
                                <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-[10px] text-slate-400 px-2 py-0.5 rounded border border-slate-700 pointer-events-none">
                                    Stack Order
                                </div>
                            </div>

                            {localStyles.position === 'static' && (
                                <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 p-2 rounded-lg">
                                    <div className="mt-0.5 text-blue-400">
                                        <Layers size={12} />
                                    </div>
                                    <p className="text-[10px] text-blue-300/90 leading-tight">
                                        Z-Index requires positioning. Changing it will set <code>position: relative</code>.
                                    </p>
                                </div>
                            )}
                        </div>


                    </ControlSection>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-slate-800 text-slate-600 rounded-full flex items-center justify-center mb-4">
                        <MousePointerClick size={32} />
                    </div>
                    <p className="text-slate-400 text-sm max-w-[200px]">
                        Select an asset from the gallery or use inspect mode to edit properties
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
