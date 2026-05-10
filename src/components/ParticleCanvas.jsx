import React, { useRef, useEffect } from 'react'
import p5 from 'p5'

const ParticleCanvas = () => {
  const containerRef = useRef()

  useEffect(() => {
    if (!containerRef.current) return

    const Sketch = (p) => {
      let particles = []
      const particleCount = 30

      class Particle {
        constructor() {
          this.reset()
        }
        reset() {
          this.x = p.random(p.width)
          this.y = p.random(p.height)
          this.vx = p.random(-0.1, 0.1)
          this.vy = p.random(-0.1, 0.1)
          this.size = p.random(1.2, 3.0)
          this.alpha = p.random(25, 65)
          this.noiseOffset = p.random(1000)
        }
        update() {
          const time = p.millis() * 0.001
          const noiseVal = p.noise(this.noiseOffset + time * 0.08)
          const angle = noiseVal * p.TWO_PI
          this.x += p.cos(angle) * 0.08
          this.y += p.sin(angle) * 0.08
          this.x += this.vx
          this.y += this.vy
          if (this.x < -20 || this.x > p.width + 20 || this.y < -20 || this.y > p.height + 20) {
            this.reset()
          }
        }
        draw() {
          p.noStroke()
          p.fill(140, 160, 220, this.alpha)
          p.ellipse(this.x, this.y, this.size)
        }
      }

      p.setup = () => {
        p.createCanvas(window.innerWidth, window.innerHeight)
        for (let i = 0; i < particleCount; i++) {
          particles.push(new Particle())
        }
      }

      p.windowResized = () => {
        p.resizeCanvas(window.innerWidth, window.innerHeight)
      }

      p.draw = () => {
        p.clear()
        particles.forEach(p => {
          p.update()
          p.draw()
        })
      }
    }

    const p5Instance = new p5(Sketch, containerRef.current)

    return () => {
      p5Instance.remove()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        pointerEvents: 'none'
      }}
    />
  )
}

export default ParticleCanvas
