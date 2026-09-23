import chipsIcon from '../assets/resources/chips.webp'
import foodIcon from '../assets/resources/food.webp'
import treeIcon from '../assets/resources/Tree3.webp'
import './Home.css'

function Home() {
  return (
    <main className="home">
      <section className="home-tools" aria-label="Tools">
        <a className="home-tool" href="#/ResourcesExcessCalculator">
          <span className="home-tool-title">
            <img className="home-tool-icon" src={chipsIcon} alt="" />
            Resources excess calculator
          </span>
          <span className="home-tool-subtitle">after 50% ads bonus</span>
        </a>
        <a className="home-tool" href="#/TycoonBonusCalculator">
          <span className="home-tool-title">
            <img className="home-tool-icon" src={foodIcon} alt="" />
            Food Excess
          </span>
          <span className="home-tool-subtitle">after 5 min with 3x bonus</span>
        </a>
        <a className="home-tool" href="#/TreeComparator">
          <span className="home-tool-title">
            <img className="home-tool-icon" src={treeIcon} alt="" />
            Tree comparator
          </span>
          <span className="home-tool-subtitle">
            payback time per tier and per upgrade
          </span>
        </a>
        <a className="home-tool" href="#/RequirementsDisplay">
          <span className="home-tool-title">Upgrade requirements</span>
          <span className="home-tool-subtitle">
            All conditions to improve levels
          </span>
        </a>
        <a className="home-tool" href="#/TodoMegaLvl">
          <span className="home-tool-title">Todo Mega Levels</span>
          <span className="home-tool-subtitle">
            Track requirements and generate tasks
          </span>
        </a>
      </section>
    </main>
  )
}

export default Home
