import { useState, useEffect, useCallback, useRef } from 'react'
import SidebarLayout from './components/layout/SidebarLayout'
import OverviewTab from './components/tabs/OverviewTab'
import AssetsTab from './components/tabs/AssetsTab'
import ColorsTab from './components/tabs/ColorsTab'
import LayoutTab from './components/tabs/LayoutTab'
import InspectorTab from './components/tabs/InspectorTab'
import { useDevToolsStore } from './store/devtools'

function App() {
  const {
    activeTab,
    setActiveTab,
    isInspectMode,
    setInspectMode,
    selectedElement,
    setSelectedElement,
    updateProperty // exposed if needed for global updates
  } = useDevToolsStore();

  const pickingTabId = useRef(null);

  // Sync inspect mode state with the current tab
  useEffect(() => {
    const targetState = isInspectMode;
    const type = targetState ? 'START_PICKING' : 'STOP_PICKING';

    const sendMessage = (tid) => {
      chrome.tabs.sendMessage(tid, { type }).catch(err => {
        console.warn("Sync failed for tab", tid, err);
      });

      if (targetState) {
        pickingTabId.current = tid;
      } else if (pickingTabId.current === tid) {
        pickingTabId.current = null;
      }
    };

    if (pickingTabId.current) {
      sendMessage(pickingTabId.current);
    } else {
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          sendMessage(tabs[0].id);
        }
      });
    }
  }, [isInspectMode]);

  // Tab Lifecycle Management
  useEffect(() => {
    const handleTabActivated = (activeInfo) => {
      if (pickingTabId.current && pickingTabId.current !== activeInfo.tabId) {
        chrome.tabs.sendMessage(pickingTabId.current, { type: 'STOP_PICKING' }).catch(() => { });
        pickingTabId.current = null;
      }
      chrome.tabs.sendMessage(activeInfo.tabId, { type: 'STOP_PICKING' }).catch(() => { });

      setInspectMode(false);
      setSelectedElement(null);
    };

    const handleTabUpdated = (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.active) {
        setSelectedElement(null);
        if (isInspectMode) {
          // Logic to restore picking if needed, or just let user re-enable
          // For now, disabling to be safe as per previous logic which had complex retry
          setInspectMode(false);
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
  }, [isInspectMode, setInspectMode, setSelectedElement]);

  // Global message listener for element selection
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.connect) {
      chrome.runtime.connect({ name: 'sidepanel-connection' });
    }

    const messageListener = (message) => {
      if (message.type === 'ELEMENT_SELECTED') {
        setSelectedElement(message.payload);
      }
    };

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener(messageListener);
      return () => chrome.runtime.onMessage.removeListener(messageListener);
    }
  }, [setSelectedElement]);

  // Viewport Resizer Logic (Kept as is)
  const handleViewportChange = (size) => {
    // ... same logic as before, just triggering window update
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, t => {
      if (t[0]?.id) {
        const tid = t[0].id;
        chrome.tabs.get(tid, (tab) => {
          if (tab && tab.windowId) {
            let updates = { state: 'normal' };
            const sidebarBuffer = 500;
            switch (size) {
              case 'mobile': updates.width = 393 + 16 + sidebarBuffer; updates.height = 852 + 88; break;
              case 'tablet': updates.width = 744 + 16 + sidebarBuffer; updates.height = 1133 + 88; break;
              case 'desktop': updates.width = 1440 + sidebarBuffer; updates.height = 900; break;
              case 'reset': updates = { state: 'maximized' }; break;
              default: return;
            }
            chrome.windows.update(tab.windowId, updates);
          }
        });
      }
    });
  };

  return (
    <SidebarLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      isInspectMode={isInspectMode}
      onToggleInspect={() => setInspectMode(!isInspectMode)}
      onViewportChange={handleViewportChange}
    >
      {activeTab === 'overview' && (
        <OverviewTab
          onTabChange={setActiveTab}
          onToggleInspect={setInspectMode}
          selectedElement={selectedElement}
          onSelectElement={setSelectedElement} // Overview might still select locally?
        />
      )}
      {activeTab === 'inspector' && (
        <InspectorTab />
      )}
      {activeTab === 'assets' && (
        <AssetsTab
          selectedElement={selectedElement}
          onSelectElement={setSelectedElement}
          onTabChange={setActiveTab}
        />
      )}
      {activeTab === 'layout' && <LayoutTab selectedElement={selectedElement} onUpdateElement={(updates) => {
        // Shim for sub-components using onUpdateElement prop
        Object.entries(updates).forEach(([k, v]) => updateProperty(k, v));
      }} />}
      {activeTab === 'colors' && <ColorsTab selectedElement={selectedElement} onUpdateElement={(updates) => {
        Object.entries(updates).forEach(([k, v]) => updateProperty(k, v));
      }} />}
    </SidebarLayout >
  )
}

export default App
