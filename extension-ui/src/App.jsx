import { useState, useEffect, useCallback, useRef } from 'react'
import SidebarLayout from './components/layout/SidebarLayout'
import OverviewTab from './components/tabs/OverviewTab'
import AssetsTab from './components/tabs/AssetsTab'
import ColorsTab from './components/tabs/ColorsTab'
import LayoutTab from './components/tabs/LayoutTab'
import InspectorTab from './components/tabs/InspectorTab'
import ProfileTab from './components/tabs/ProfileTab'

function App() {
  const [activeTab, setActiveTab] = useState('overview')
  const [isInspectMode, setIsInspectMode] = useState(false)
  const [inspectorData, setInspectorData] = useState(null)
  const [codeTab, setCodeTab] = useState('tailwind')
  const [error, setError] = useState(null)

  // Track specifically which tab we are currently picking on
  const pickingTabId = useRef(null);

  // Function to sync inspect mode state with the current tab
  const syncInspectMode = useCallback((tabId, forceState) => {
    const targetState = forceState !== undefined ? forceState : isInspectMode;
    const type = targetState ? 'START_PICKING' : 'STOP_PICKING';

    const sendMessage = (tid) => {
      chrome.tabs.sendMessage(tid, { type }).catch(err => {
        console.warn("Sync failed for tab", tid, err);
      });

      // Update our tracking ref
      if (targetState) {
        pickingTabId.current = tid;
      } else if (pickingTabId.current === tid) {
        pickingTabId.current = null;
      }
    };

    if (tabId) {
      sendMessage(tabId);
    } else {
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          sendMessage(tabs[0].id);
        }
      });
    }
  }, [isInspectMode]);

  // 1. Sync when isInspectMode changes (User Toggles)
  useEffect(() => {
    syncInspectMode();
  }, [isInspectMode, syncInspectMode]);

  // 2. Tab Lifecycle Management
  useEffect(() => {
    // A. Handle Tab Switching (Activation)
    const handleTabActivated = (activeInfo) => {
      // CRITICAL FIX: Explicitly stop picking on the tab we were tracking, 
      // regardless of whether it was the "last active" one or not.
      if (pickingTabId.current && pickingTabId.current !== activeInfo.tabId) {
        chrome.tabs.sendMessage(pickingTabId.current, { type: 'STOP_PICKING' }).catch(() => { });
        pickingTabId.current = null;
      }

      // Also ensure the new tab is clean
      chrome.tabs.sendMessage(activeInfo.tabId, { type: 'STOP_PICKING' }).catch(() => { });

      setIsInspectMode(false);
      setInspectorData(null);
    };

    // B. Handle Page Reloads / Navigation (Updates)
    const handleTabUpdated = (tabId, changeInfo, tab) => {
      // Only act when the page is fully loaded and it is the active tab
      if (changeInfo.status === 'complete' && tab.active) {
        console.log("Tab updated (reload/nav), checking restore state...");

        // Clear old selection data as the DOM is gone
        setInspectorData(null);

        // If inspect mode was active, try to re-apply it to the new page
        if (isInspectMode) {
          // Retry logic to ensure content script is ready
          let attempts = 0;
          const maxAttempts = 5;
          const retryInterval = 500;

          const trySync = () => {
            if (!tabId) return;
            chrome.tabs.sendMessage(tabId, { type: 'START_PICKING' })
              .then(() => console.log("Restored picking mode on reload"))
              .catch(() => {
                attempts++;
                if (attempts < maxAttempts) {
                  setTimeout(trySync, retryInterval);
                } else {
                  // If we fail too many times, just turn it off to sync UI
                  console.warn("Failed to restore picking mode after reload");
                  setIsInspectMode(false);
                }
              });
          };

          trySync();
        }
      }
    };

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.onActivated.addListener(handleTabActivated);
      chrome.tabs.onUpdated.addListener(handleTabUpdated);
    }

    return () => {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.onActivated.removeListener(handleTabActivated);
        chrome.tabs.onUpdated.removeListener(handleTabUpdated);
      }
    };
  }, [isInspectMode]);

  // 3. Global message listener for element selection
  useEffect(() => {
    // Connect to background to detect closure
    if (typeof chrome !== 'undefined' && chrome.runtime?.connect) {
      chrome.runtime.connect({ name: 'sidepanel-connection' });
    }

    const messageListener = (message) => {
      if (message.type === 'ELEMENT_SELECTED') {
        setInspectorData(message.payload);
      }
    };

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener(messageListener);
      return () => chrome.runtime.onMessage.removeListener(messageListener);
    }
  }, []);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    // Auto-enable inspect mode when switching to inspector tab
    if (newTab === 'inspector') {
      setIsInspectMode(true);
    }
  };

  const onUpdateElement = (updatedStyles) => {
    setInspectorData(prev => {
      if (!prev) return null;

      // Create a shallow copy of prev
      const newData = { ...prev };

      // Update specific top-level layout properties
      if (updatedStyles.width !== undefined) {
        newData.width = updatedStyles.width;
        newData.inlineStyle = { ...newData.inlineStyle, width: updatedStyles.width };
      }
      if (updatedStyles.height !== undefined) {
        newData.height = updatedStyles.height;
        newData.inlineStyle = { ...newData.inlineStyle, height: updatedStyles.height };
      }

      // Update nested objects immutably
      if (updatedStyles.display) {
        newData.boxModel = { ...newData.boxModel, display: updatedStyles.display };
      }

      const boxProps = ['padding', 'margin', 'borderRadius', 'borderWidth', 'borderStyle'];
      boxProps.forEach(p => {
        if (updatedStyles[p] !== undefined) {
          newData.boxModel = { ...newData.boxModel, [p]: updatedStyles[p] };
        }
      });

      const posProps = ['position', 'top', 'right', 'bottom', 'left', 'zIndex'];
      posProps.forEach(p => {
        if (updatedStyles[p] !== undefined) {
          newData.positioning = { ...newData.positioning, [p]: updatedStyles[p] };
        }
      });

      const colorMapping = {
        color: 'text',
        backgroundColor: 'background',
        backgroundImage: 'backgroundImage',
        borderColor: 'border'
      };
      Object.entries(colorMapping).forEach(([prop, key]) => {
        if (updatedStyles[prop] !== undefined) {
          newData.colors = { ...newData.colors, [key]: updatedStyles[prop] };
        }
      });

      const fgProps = ['flexDirection', 'justifyContent', 'alignItems', 'gap', 'rowGap', 'columnGap', 'gridTemplateColumns', 'gridTemplateRows', 'gridAutoFlow'];
      fgProps.forEach(p => {
        if (updatedStyles[p] !== undefined) {
          newData.flexGrid = { ...newData.flexGrid, [p]: updatedStyles[p] };
        }
      });

      // Handle direct flexGrid object update
      if (updatedStyles.flexGrid) {
        newData.flexGrid = { ...newData.flexGrid, ...updatedStyles.flexGrid };
      }

      // Typography
      if (updatedStyles.fontSize) {
        newData.typography = { ...newData.typography, size: updatedStyles.fontSize };
      }
      if (updatedStyles.fontWeight) {
        newData.typography = { ...newData.typography, weight: updatedStyles.fontWeight };
      }

      return newData;
    });
  };

  const handleToggleInspect = () => {
    setIsInspectMode(prev => !prev);
  };

  // Viewport Resizer Logic
  const getTargetTab = (cb) => {
    if (pickingTabId.current) cb(pickingTabId.current);
    else chrome.tabs.query({ active: true, lastFocusedWindow: true }, t => t[0]?.id && cb(t[0].id));
  };

  const handleViewportChange = (size) => {
    getTargetTab((tid) => {
      if (!tid) return;
      chrome.tabs.get(tid, (tab) => {
        if (tab && tab.windowId) {
          let updates = { state: 'normal' };

          // Detect if we are currently running in the Sidebar (not Popout)
          // Since Popout is removed, we are always in Sidebar.

          // If in Sidebar Mode, we need to account for the Side Panel width taking up space in the browser window.
          // We can't know the exact Side Panel width, but we'll assume a generous buffer (e.g. 400px) + Chrome UI padding.
          const sidebarBuffer = 500; // Increased buffer to be safe

          chrome.windows.get(tab.windowId, (win) => {
            // Standard Dimensions:
            // Mobile (iPhone 14 Pro): 393 x 852
            // Tablet (iPad mini): 744 x 1133
            // Desktop: 1440 x 900

            switch (size) {
              case 'mobile':
                updates.width = 393 + 16 + sidebarBuffer;
                updates.height = 852 + 88;
                break;
              case 'tablet':
                updates.width = 744 + 16 + sidebarBuffer;
                updates.height = 1133 + 88;
                break;
              case 'desktop':
                updates.width = 1440 + sidebarBuffer;
                updates.height = 900;
                break;
              case 'reset':
                updates = { state: 'maximized' };
                break;
              default:
                return;
            }
            chrome.windows.update(tab.windowId, updates);
          });
        }
      });
    });
  };

  return (
    <SidebarLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      isInspectMode={isInspectMode}
      onToggleInspect={handleToggleInspect}
      onViewportChange={handleViewportChange}
    >
      {activeTab === 'overview' && (
        <OverviewTab
          onTabChange={handleTabChange}
          onToggleInspect={setIsInspectMode}
          selectedElement={inspectorData}
          onSelectElement={setInspectorData}
        />
      )
      }
      {
        activeTab === 'inspector' && (
          <InspectorTab
            key={inspectorData?.cpId || 'no-selection'}
            selectedElement={inspectorData}
            onSelectElement={setInspectorData}
            onUpdateElement={onUpdateElement}
            onTabChange={handleTabChange}
            codeTab={codeTab}
            setCodeTab={setCodeTab}
          />
        )
      }
      {
        activeTab === 'assets' && (
          <AssetsTab
            selectedElement={inspectorData}
            onSelectElement={setInspectorData}
            onTabChange={handleTabChange}
          />
        )
      }
      {activeTab === 'layout' && <LayoutTab selectedElement={inspectorData} onUpdateElement={onUpdateElement} />}
      {activeTab === 'colors' && <ColorsTab selectedElement={inspectorData} onUpdateElement={onUpdateElement} />}
      {activeTab === 'profile' && <ProfileTab />}
    </SidebarLayout >
  )
}

export default App
