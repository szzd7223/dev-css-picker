import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [output, setOutput] = useState("Picker active! Click an element on the page...")
  const [isPicking, setIsPicking] = useState(false)

  useEffect(() => {
    // Listen for messages from content script
    const handleMessage = (message, sender, sendResponse) => {
      if (message.type === 'ELEMENT_SELECTED') {
        const displayText = `--- CSS INFO ---\n${message.css}\n\n--- HTML ---\n${message.html}`
        setOutput(displayText)
        setIsPicking(false) // Reset picking state if desired
      }
    }

    // Check if chrome variable exists (development environment fallback)
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(handleMessage)
    }

    return () => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.removeListener(handleMessage)
      }
    }
  }, [])

  const handlePickClick = async () => {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      console.error("Chrome API not available")
      return
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, { type: 'START_PICKING' })
        setOutput("Picker active! Click an element on the page...")
        setIsPicking(true)
      } else {
        console.error("No active tab found")
      }
    } catch (error) {
      console.error("Error starting picker:", error)
      setOutput("Error: Could not connect to page. Try reloading the tab.")
    }
  }

  return (
    <div className="container">
      <header>
        <h1>CSS Picker</h1>
      </header>

      <main>
        <button
          className={`pick-btn ${isPicking ? 'active' : ''}`}
          onClick={handlePickClick}
        >
          {isPicking ? 'Picking...' : 'Pick Element'}
        </button>

        <div className="output-wrapper">
          <textarea
            value={output}
            readOnly
            placeholder="Select an element to see CSS..."
          />
        </div>
      </main>
    </div>
  )
}

export default App
