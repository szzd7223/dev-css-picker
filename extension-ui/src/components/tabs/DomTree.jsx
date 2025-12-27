import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Code, Layout, Layers } from 'lucide-react';

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
        const indent = node.isChild ? (depthShift + 1) * 12 : index * 12;
        return { ...node, indent };
    });

    return (
        <div className="mb-4">
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                    <Layers size={14} className="text-indigo-500" />
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Element Hierarchy</h3>
                </div>
            </div>

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
                                    ? 'bg-slate-900 border-slate-800 shadow-lg scale-[1.02] z-20'
                                    : isChild
                                        ? 'bg-blue-50/30 border-dashed border-blue-200 hover:border-blue-400'
                                        : 'bg-white border-gray-100 hover:border-indigo-200 hover:shadow-sm'
                                }
                            `}
                            style={{ marginLeft: `${node.indent}px` }}
                        >
                            <div className={`
                                w-7 h-7 rounded flex items-center justify-center mr-3 shrink-0
                                ${isTarget ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-indigo-50 group-hover:text-indigo-600'}
                            `}>
                                {node.tagName === 'body' ? <Layout size={14} /> : <Code size={14} />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className={`font-mono text-[11px] font-bold ${isTarget ? 'text-indigo-400' : 'text-gray-700'}`}>
                                        &lt;{node.tagName}&gt;
                                    </span>
                                    {isTarget ? (
                                        <ChevronDown size={14} className="text-indigo-400" />
                                    ) : (
                                        <ChevronRight size={14} className="text-gray-300 group-hover:text-indigo-400" />
                                    )}
                                </div>
                                {(node.id || node.classes) && (
                                    <div className={`text-[9px] truncate font-mono ${isTarget ? 'text-gray-400' : 'text-gray-400'}`}>
                                        {node.id && <span className="mr-1 text-yellow-600/80">{node.id}</span>}
                                        {node.classes && <span>{node.classes.replace(/\s+/g, '.')}</span>}
                                    </div>
                                )}
                            </div>

                            {/* Indicator for children */}
                            {isTarget && items.some(it => it.isChild) && (
                                <div className="absolute -bottom-2 left-3 w-px h-2 bg-indigo-500/50" />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
