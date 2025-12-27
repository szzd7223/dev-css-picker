import { useState } from 'react'
import SidebarLayout from './components/layout/SidebarLayout'
import OverviewTab from './components/tabs/OverviewTab'
import ImagesTab from './components/tabs/ImagesTab'
import SvgsTab from './components/tabs/SvgsTab'
import ColorsTab from './components/tabs/ColorsTab'
import InspectorTab from './components/tabs/InspectorTab'
import ProfileTab from './components/tabs/ProfileTab'

function App() {
  const [activeTab, setActiveTab] = useState('overview')
  const [inspectorData, setInspectorData] = useState(null)

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab onTabChange={setActiveTab} />
      case 'images': return <ImagesTab />
      case 'svgs': return <SvgsTab />
      case 'colors': return <ColorsTab />
      case 'inspector': return <InspectorTab selectedElement={inspectorData} onSelectElement={setInspectorData} onTabChange={setActiveTab} />
      case 'profile': return <ProfileTab />
      default: return <OverviewTab />
    }
  }

  return (
    <SidebarLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderTab()}
    </SidebarLayout>
  )
}

export default App
