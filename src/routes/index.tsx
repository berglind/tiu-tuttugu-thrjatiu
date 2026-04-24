import { createFileRoute } from '@tanstack/react-router'
import Solitaire from '../components/Solitaire'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="min-h-screen space-bg">
      <div className="min-h-screen stars-layer">
        <Solitaire />
      </div>
    </div>
  )
}
