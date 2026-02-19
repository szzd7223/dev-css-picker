import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Code } from 'lucide-react';

export default function DomTree({ hierarchy, onSelectNode }) {
    if (!hierarchy || hierarchy.length === 0) return null;

    const handleNodeHover = (cpId, isEnter) => {
        if (!cpId) return;
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'HIGHLIGHT_NODE',
                    payload: { cpId, noScroll: true }
                });
            }
        });
    };

    // Calculate indentation based on hierarchy depth and child status
    let depthShift = 0;
    const items = hierarchy.map((node, index) => {
        if (node.isTarget) {
            depthShift = index;
        }
        // Normalize indent for visual tree
        const indent = node.isChild ? (depthShift + 1) * 16 : index * 16;
        return { ...node, indent };
    });

    return (
        <div className="space-y-1 relative">
            {items.map((node, index) => {
                const isTarget = node.isTarget;
                const isChild = node.isChild;

                return (
                    <div
                        key={node.cpId || index}
                        onClick={() => onSelectNode(node.cpId)}
                        onMouseEnter={() => handleNodeHover(node.cpId, true)}
                        className={`
                                relative flex items-center p-2 rounded-lg transition-all cursor-pointer group border
                                ${isTarget
                                ? 'bg-surface border-slate-700 shadow-md z-10'
                                : isChild
                                    ? 'bg-surface/30 border-dashed border-slate-700/50 hover:border-slate-600'
                                    : 'bg-transparent border-transparent hover:bg-surface/50'
                            }
                            `}
                        style={{ marginLeft: `${node.indent}px` }}
                    >
                        {/* Tag Icon */}
                        <div className={`
                                w-6 h-6 rounded flex items-center justify-center mr-2 shrink-0
                                ${isTarget ? 'bg-primary-muted text-primary' : 'bg-surface text-slate-500 group-hover:text-slate-400'}
                            `}>
                            <Code size={12} />
                        </div>

                        <div className="flex-1 min-w-0 flex items-baseline gap-2">
                            <span className={`font-mono text-xs font-bold ${isTarget ? 'text-primary' : 'text-primary/70'}`}>
                                &lt;{node.tagName}&gt;
                            </span>

                            {(node.id || node.classes) && (
                                <div className="text-[10px] truncate font-mono text-dim-text">
                                    {node.id && <span className="mr-1 text-primary">#{node.id}</span>}
                                    {node.classes && <span>.{node.classes.replace(/\s+/g, '.')}</span>}
                                </div>
                            )}
                        </div>

                        {/* Expand/Collapse Indicator (visual only for now) */}
                        {isTarget ? (
                            <ChevronDown size={14} className="text-slate-500 ml-2" />
                        ) : (
                            <ChevronRight size={14} className="text-slate-700 group-hover:text-slate-500 ml-2" />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
