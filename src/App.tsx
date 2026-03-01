import { CityCanvas } from './components/CityCanvas'
import { StatsBar } from './components/StatsBar'

function App() {
  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <CityCanvas />
      <StatsBar />
      <div className="pointer-events-none absolute bottom-4 left-4 z-20 rounded border border-[rgba(130,180,255,0.35)] bg-[rgba(8,10,20,0.75)] px-3 py-2 text-xs text-[#87a0ca]">
        Pan: drag • Zoom: mouse wheel
      </div>
    </main>
  )
}

export default App
