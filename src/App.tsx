import { useEffect, useState } from 'react'
import logo from './assets/logo.png'
import chipsIcon from './assets/resources/chips.webp'
import foodIcon from './assets/resources/food.webp'
import treeIcon from './assets/resources/Tree3.webp'
import Home from './pages/Home'
import ResourcesExcessCalculator from './pages/ResourcesExcessCalculator'
import FoodAdsExcess from './pages/FoodAdsExcess'
import TreeComparator from './pages/TreeComparator'
import RequirementsDisplay from './pages/RequirementsDisplay'
import TodoMegaLvl from './pages/TodoMegaLvl'
import './App.css'

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash)

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const path = hash.replace(/^#/, '') || '/'
  return path.startsWith('/') ? path : `/${path}`
}

const PAGES: Record<
  string,
  { title: string; subtitle?: string; icon?: string }
> = {
  '/ResourcesExcessCalculator': {
    title: 'Resources excess calculator',
    subtitle: 'after 50% ads bonus',
    icon: chipsIcon,
  },
  '/TycoonBonusCalculator': {
    title: 'Food Excess',
    subtitle: 'after 5 min with 3x bonus',
    icon: foodIcon,
  },
  '/TreeComparator': {
    title: 'Tree comparator',
    subtitle: 'payback time per tier and per upgrade',
    icon: treeIcon,
  },
  '/RequirementsDisplay': {
    title: 'Upgrade requirements',
    subtitle: 'All conditions to improve levels',
  },
  '/TodoMegaLvl': {
    title: 'Todo Mega Levels',
    subtitle: 'Track requirements and generate tasks',
  },
}

function App() {
  const route = useHashRoute()
  const page = PAGES[route] ?? { title: 'Post Apo Tycoon helpers' }

  useEffect(() => {
    document.title = PAGES[route]
      ? `${page.title} · Post Apo Tycoon helpers`
      : 'Post Apo Tycoon helpers'
  }, [page.title, route])

  return (
    <>
      <header className="site-header">
        <a
          className="site-brand"
          href="#/"
          aria-label="Post Apo Tycoon helpers home"
        >
          <img
            className="site-logo"
            src={logo}
            alt=""
            height={96}
          />
        </a>
        <div className="site-heading">
          <h1>
            {page.icon ? (
              <img className="site-heading-icon" src={page.icon} alt="" />
            ) : null}
            {page.title}
          </h1>
          {page.subtitle ? <p>{page.subtitle}</p> : null}
        </div>
      </header>
      <div className="site-main">
        {route === '/ResourcesExcessCalculator' ? (
          <ResourcesExcessCalculator />
        ) : route === '/TycoonBonusCalculator' ? (
          <FoodAdsExcess />
        ) : route === '/TreeComparator' ? (
          <TreeComparator />
        ) : route === '/RequirementsDisplay' ? (
          <RequirementsDisplay />
        ) : route === '/TodoMegaLvl' ? (
          <TodoMegaLvl />
        ) : (
          <Home />
        )}
      </div>
      <footer className="site-footer">
        <a
          href="https://github.com/Theo-Farnole/postapo-helpers"
          target="_blank"
          rel="noreferrer"
        >
          <svg
            className="github-icon"
            viewBox="0 0 19 19"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              fillRule="evenodd"
              clipRule="evenodd"
              d="M9.356 1.85C5.05 1.85 1.57 5.356 1.57 9.694a7.84 7.84 0 0 0 5.324 7.44c.387.079.528-.168.528-.376 0-.182-.013-.805-.013-1.454-2.165.467-2.616-.935-2.616-.935-.349-.91-.864-1.143-.864-1.143-.71-.48.051-.48.051-.48.787.051 1.2.805 1.2.805.695 1.194 1.817.857 2.268.649.064-.507.27-.857.49-1.052-1.728-.182-3.545-.857-3.545-3.87 0-.857.31-1.558.8-2.104-.078-.195-.349-1 .077-2.078 0 0 .657-.208 2.14.805a7.5 7.5 0 0 1 1.946-.26c.657 0 1.328.092 1.946.26 1.483-1.013 2.14-.805 2.14-.805.426 1.078.155 1.883.078 2.078.502.546.799 1.247.799 2.104 0 3.013-1.818 3.675-3.558 3.87.284.247.528.714.528 1.454 0 1.052-.012 1.896-.012 2.156 0 .208.142.455.528.377a7.84 7.84 0 0 0 5.324-7.441c.013-4.338-3.48-7.844-7.773-7.844"
            />
          </svg>
          GitHub
        </a>
      </footer>
    </>
  )
}

export default App
