import { useState, useEffect, useCallback, useRef } from 'react'
import SidebarLayout from './components/layout/SidebarLayout'
import OverviewTab from './components/tabs/OverviewTab'
import ImagesTab from './components/tabs/ImagesTab'
import SvgsTab from './components/tabs/SvgsTab'
import ColorsTab from './components/tabs/ColorsTab'
import InspectorTab from './components/tabs/InspectorTab'
import ProfileTab from './components/tabs/ProfileTab'

function App() {
  const [activeTab, setActiveTab] = useState('overview')
  const [isInspectMode, setIsInspectMode] = useState(false)
  const [inspectorData, setInspectorData] = useState(null)
  const [codeTab, setCodeTab] = useState('tailwind')
  const [error, setError] = useState(null)

  // Function to sync inspect mode state with the current tab
  const syncInspectMode = useCallback((tabId, forceState) => {
    const targetState = forceState !== undefined ? forceState : isInspectMode;
    const type = targetState ? 'START_PICKING' : 'STOP_PICKING';

    if (tabId) {
      chrome.tabs.sendMessage(tabId, { type }).catch(err => {
        // This is expected if content script isn't ready yet
        console.warn("Sync failed for tab", tabId, err);
      });
    } else {
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { type }).catch(() => { });
        }
      });
    }
  }, [isInspectMode]);

  // 1. Sync when isInspectMode changes (User Toggles)
  useEffect(() => {
    syncInspectMode();
  }, [isInspectMode, syncInspectMode]);

  // 2. Tab Lifecycle Management
  const lastActiveTab = useRef(null);

  useEffect(() => {
    // A. Handle Tab Switching (Activation)
    const handleTabActivated = (activeInfo) => {
      // When switching tabs, we should disable inspect mode to prevent confusion

      // CRITICAL FIX: Send STOP_PICKING to the *previous* tab if we know it.
      // Otherwise, the overlay remains on that tab in the background.
      if (lastActiveTab.current && lastActiveTab.current !== activeInfo.tabId) {
        chrome.tabs.sendMessage(lastActiveTab.current, { type: 'STOP_PICKING' }).catch(() => { });
      }

      lastActiveTab.current = activeInfo.tabId;

      setIsInspectMode(false);
      setInspectorData(null);
    };

    // Initialize last active tab tracking
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        if (tabs[0]?.id) lastActiveTab.current = tabs[0].id;
      });
    }

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

  const handleToggleInspect = () => {
    setIsInspectMode(prev => !prev);
  };

  return (
    <SidebarLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      isInspectMode={isInspectMode}
      onToggleInspect={handleToggleInspect}
    >
      {activeTab === 'overview' && (
        <OverviewTab
          onTabChange={handleTabChange}
          onToggleInspect={setIsInspectMode}
          selectedElement={inspectorData}
          onSelectElement={setInspectorData}
        />
      )}
      {activeTab === 'inspector' && (
        <InspectorTab
          key={inspectorData?.cpId || 'no-selection'}
          selectedElement={inspectorData}
          onSelectElement={setInspectorData}
          onTabChange={handleTabChange}
          codeTab={codeTab}
          setCodeTab={setCodeTab}
        />
      )}
      {activeTab === 'images' && (
        <ImagesTab
          selectedElement={inspectorData}
          onSelectElement={setInspectorData}
          onTabChange={handleTabChange}
        />
      )}
      {activeTab === 'svgs' && <SvgsTab />}
      {activeTab === 'colors' && <ColorsTab />}
      {activeTab === 'profile' && <ProfileTab />}
    </SidebarLayout>
  )
}

export default App
