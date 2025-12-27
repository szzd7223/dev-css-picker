import { useState, useEffect, useCallback } from 'react'
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

  // 1. Regular sync when isInspectMode changes
  useEffect(() => {
    syncInspectMode();
  }, [isInspectMode, syncInspectMode]);

  // 2. Tab Update / Navigation Listener to re-re-sync
  useEffect(() => {
    const handleTabUpdated = (tabId, changeInfo, tab) => {
      // When page reloads or navigates, we want to clear selected element 
      // but potentially re-enable picking mode if it was active
      if (changeInfo.status === 'complete' && tab.active) {
        console.log("Tab reloaded, re-syncing inspect mode...");

        // Clear data if URL changed significantly? Or just refresh info.
        // For now, let's clear data because IDs will be gone.
        setInspectorData(null);

        // Re-send START_PICKING if mode is active
        if (isInspectMode) {
          // Wait a tiny bit for the script to be ready
          setTimeout(() => syncInspectMode(tabId), 300);
        }
      }
    };

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.onUpdated.addListener(handleTabUpdated);
    }
    return () => {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.onUpdated.removeListener(handleTabUpdated);
      }
    };
  }, [isInspectMode, syncInspectMode]);

  // 3. Global message listener for element selection
  useEffect(() => {
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
          selectedElement={inspectorData}
          onSelectElement={setInspectorData}
          onTabChange={handleTabChange}
        />
      )}
      {activeTab === 'images' && <ImagesTab />}
      {activeTab === 'svgs' && <SvgsTab />}
      {activeTab === 'colors' && <ColorsTab />}
      {activeTab === 'profile' && <ProfileTab />}
    </SidebarLayout>
  )
}

export default App
