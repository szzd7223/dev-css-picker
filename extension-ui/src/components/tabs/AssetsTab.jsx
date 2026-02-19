import React, { useState, useEffect } from 'react';
import { Maximize2, Minimize2, Copy, Download, MousePointerClick, Layout, Smartphone, Layers, ArrowLeft, FileCode, Ban } from 'lucide-react';
import { SliderInput, SelectInput } from '../ui/StyleControls';

const ControlSection = ({ title, icon: Icon, children }) => (
    <div className="bg-surface rounded-xl border border-border-subtle overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-2">
            <Icon size={16} className="text-dim-text" />
            <span className="text-sm font-bold text-primary-text">{title}</span>
        </div>
        <div className="p-4 space-y-4">
            {children}
        </div>
    </div>
);

export default function AssetsTab({ selectedElement, onTabChange }) {
    const [localStyles, setLocalStyles] = useState({});
    const [originalStyles, setOriginalStyles] = useState({});
    const [isCopied, setIsCopied] = useState(false);
    const [lockAspectRatio, setLockAspectRatio] = useState(false);
    const [aspectRatio, setAspectRatio] = useState(1);

    // Initialize state when selection changes
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

    const handleStyleChange = (property, value) => {
        let updates = { [property]: value };

        // Handle Z-Index auto-positioning
        if (property === 'zIndex' && localStyles.position === 'static') {
            updates.position = 'relative';
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

        if (shape !== 'rounded') {
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

    // 1. No Selection State
    if (!selectedElement) {
        return (
            <div className="h-full flex flex-col p-4 animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => onTabChange('overview')} className="p-2 hover:bg-surface rounded-lg text-dim-text transition-colors">
                        <ArrowLeft size={18} />
                    </button>
                    <h2 className="text-xl font-bold text-white">Assets</h2>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-center pb-20">
                    <div className="w-16 h-16 bg-surface text-dim-text rounded-full flex items-center justify-center mb-4 border border-border-subtle">
                        <MousePointerClick size={32} />
                    </div>
                    <p className="text-dim-text text-sm max-w-[200px] mb-6">
                        Select an element on the page to inspect its asset properties.
                    </p>
                    <button
                        onClick={() => onTabChange('inspector')}
                        className="px-4 py-2 bg-primary hover:bg-primary-hover text-bg rounded-lg text-sm font-bold shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
                    >
                        <MousePointerClick size={16} /> Start Inspecting
                    </button>
                </div>
            </div>
        );
    }

    // 2. Selection exists but no asset info (not an image/bg)
    if (!selectedElement.imageInfo) {
        return (
            <div className="h-full flex flex-col p-4 animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => onTabChange('overview')} className="p-2 hover:bg-surface rounded-lg text-dim-text transition-colors">
                        <ArrowLeft size={18} />
                    </button>
                    <h2 className="text-xl font-bold text-white">Assets</h2>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-center pb-20">
                    <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
                        <Ban size={32} />
                    </div>
                    <h3 className="text-white font-bold mb-2">No Assets Found</h3>
                    <p className="text-dim-text text-sm max-w-[240px]">
                        The selected element is not an Image, SVG, or Background.
                    </p>
                </div>
            </div>
        );
    }

    // 3. Asset Inspector View
    return (
        <div className="p-4 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => onTabChange('overview')} className="p-2 hover:bg-surface rounded-lg text-dim-text transition-colors">
                        <ArrowLeft size={18} />
                    </button>
                    <h2 className="text-xl font-bold text-white">Asset Details</h2>
                </div>
            </div>

            <div className="space-y-6">
                {/* Selected Asset Info */}
                <div className="bg-surface rounded-xl border border-primary/20 p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2">
                        <span className="text-[10px] bg-primary-muted text-primary px-2 py-0.5 rounded-full font-bold uppercase">
                            {selectedElement.imageInfo?.type || 'Element'}
                        </span>
                    </div>
                    <div className="flex gap-4 mb-4">
                        <div className="w-20 h-20 bg-bg rounded-lg overflow-hidden border border-border-subtle flex-shrink-0 flex items-center justify-center">
                            {selectedElement.imageInfo?.type === 'SVG' ? (
                                <FileCode size={32} className="text-dim-text" />
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
                                        <p className="text-[10px] text-primary uppercase font-bold">Intrinsic</p>
                                        <p className="text-xs text-slate-200 font-mono">
                                            {selectedElement.imageInfo.intrinsicSize.width} × {selectedElement.imageInfo.intrinsicSize.height}
                                        </p>
                                    </div>
                                )}
                                {selectedElement.imageInfo?.svgInfo?.viewBox && (
                                    <div>
                                        <p className="text-[10px] text-primary uppercase font-bold">ViewBox</p>
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
                                className="flex-1 flex items-center justify-center gap-2 bg-primary text-bg py-1.5 rounded-lg text-xs font-bold transition-all shadow-md shadow-primary/10"
                            >
                                {isCopied ? <><Smartphone size={14} /> Done</> : <><Copy size={14} /> Copy URL</>}
                            </button>
                            <button
                                onClick={downloadImage}
                                className="flex-1 flex items-center justify-center gap-2 bg-surface text-primary border border-primary/20 hover:bg-primary-muted py-1.5 rounded-lg text-xs font-bold transition-all"
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
                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${lockAspectRatio ? 'bg-primary-muted text-primary' : 'bg-surface text-slate-500 hover:text-slate-300'}`}
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
                            <span className="text-xs font-medium text-dim-text uppercase">Repeat</span>
                            <button
                                onClick={() => handleStyleChange('backgroundRepeat', localStyles.backgroundRepeat === 'repeat' ? 'no-repeat' : 'repeat')}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all border ${localStyles.backgroundRepeat === 'repeat' ? 'bg-primary-muted border-primary text-primary' : 'bg-surface border-slate-700 text-slate-500'}`}
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
                                className={`p-2 bg-surface border rounded hover:border-slate-500 transition-colors ${localStyles.borderRadius === 0 || localStyles.borderRadius === '0px' ? 'border-primary bg-primary-muted' : 'border-slate-700'}`}
                                title="Square"
                            >
                                <div className="w-4 h-4 bg-slate-400"></div>
                            </button>
                            <button
                                onClick={() => applyQuickShape('rounded')}
                                className={`p-2 bg-surface border rounded hover:border-slate-500 transition-colors ${isRadiusCustom ? 'border-primary bg-primary-muted' : 'border-slate-700'}`}
                                title="Rounded"
                            >
                                <div className="w-4 h-4 bg-slate-400 rounded-md"></div>
                            </button>
                            <button
                                onClick={() => applyQuickShape('circle')}
                                className={`p-2 bg-surface border rounded hover:border-slate-500 transition-colors ${localStyles.borderRadius === '50%' ? 'border-primary bg-primary-muted' : 'border-slate-700'}`}
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
                            <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-surface text-[10px] text-dim-text px-2 py-0.5 rounded border border-border-subtle pointer-events-none">
                                Stack Order
                            </div>
                        </div>

                        {localStyles.position === 'static' && (
                            <div className="flex items-start gap-2 bg-primary-muted border border-primary/20 p-2 rounded-lg">
                                <div className="mt-0.5 text-primary">
                                    <Layers size={12} />
                                </div>
                                <p className="text-[10px] text-primary/90 leading-tight">
                                    Z-Index requires positioning. Changing it will set <code>position: relative</code>.
                                </p>
                            </div>
                        )}
                    </div>
                </ControlSection>
            </div>
        </div>
    );
}
