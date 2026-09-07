'use client'

import { useEffect, useRef } from 'react'

/**
 * Interactive particle constellation background.
 * - Particles float organically and connect when near each other
 * - Reacts to mouse movement (particles are gently attracted)
 * - Gradient color zones shift slowly across the canvas
 * - Fully GPU-composited, fixed behind all content
 */
export default function MeshBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let animId
    let w, h, dpr
    let mouse = { x: -1000, y: -1000, active: false }

    // ── Particle config ──
    const PARTICLE_COUNT = w < 640 ? 25 : 45
    const CONNECTION_DIST = 140
    const MOUSE_RADIUS = 120
    const MOUSE_FORCE = 0.002
    const BASE_SPEED = 0.2

    // Color palette (brand-aligned)
    const COLORS = [
      { r: 43,  g: 95,  b: 224 }, // blue-600
      { r: 96,  g: 165, b: 250 }, // blue-400
      { r: 124, g: 58,  b: 237 }, // violet
      { r: 59,  g: 130, b: 246 }, // blue-500
      { r: 14,  g: 165, b: 233 }, // sky-500
    ]

    let particles = []

    function createParticles() {
      particles = []
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const color = COLORS[Math.floor(Math.random() * COLORS.length)]
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * BASE_SPEED,
          vy: (Math.random() - 0.5) * BASE_SPEED,
          size: Math.random() * 2.5 + 1,
          color,
          opacity: Math.random() * 0.3 + 0.15,
          pulsePhase: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 0.02 + 0.008,
        })
      }
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (particles.length === 0) createParticles()
    }

    resize()
    window.addEventListener('resize', resize, { passive: true })

    // Mouse tracking (viewport-relative since canvas is fixed)
    function onMouseMove(e) {
      mouse.x = e.clientX
      mouse.y = e.clientY
      mouse.active = true
    }
    function onMouseLeave() {
      mouse.active = false
    }
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    window.addEventListener('mouseleave', onMouseLeave, { passive: true })

    // Gradient time
    let time = 0

    function draw() {
      time += 1

      ctx.clearRect(0, 0, w, h)

      // ── Ambient gradient blobs (slow-moving color zones) ──
      const glow1x = w * (0.25 + Math.sin(time * 0.003) * 0.15)
      const glow1y = h * (0.3 + Math.cos(time * 0.004) * 0.15)
      const g1 = ctx.createRadialGradient(glow1x, glow1y, 0, glow1x, glow1y, w * 0.4)
      g1.addColorStop(0, 'rgba(43, 95, 224, 0.035)')
      g1.addColorStop(1, 'rgba(43, 95, 224, 0)')
      ctx.fillStyle = g1
      ctx.fillRect(0, 0, w, h)

      const glow2x = w * (0.75 + Math.cos(time * 0.0025) * 0.15)
      const glow2y = h * (0.6 + Math.sin(time * 0.0035) * 0.2)
      const g2 = ctx.createRadialGradient(glow2x, glow2y, 0, glow2x, glow2y, w * 0.35)
      g2.addColorStop(0, 'rgba(124, 58, 237, 0.03)')
      g2.addColorStop(1, 'rgba(124, 58, 237, 0)')
      ctx.fillStyle = g2
      ctx.fillRect(0, 0, w, h)

      const glow3x = w * (0.5 + Math.sin(time * 0.002 + 2) * 0.2)
      const glow3y = h * (0.8 + Math.cos(time * 0.003 + 1) * 0.1)
      const g3 = ctx.createRadialGradient(glow3x, glow3y, 0, glow3x, glow3y, w * 0.3)
      g3.addColorStop(0, 'rgba(14, 165, 233, 0.025)')
      g3.addColorStop(1, 'rgba(14, 165, 233, 0)')
      ctx.fillStyle = g3
      ctx.fillRect(0, 0, w, h)



      // ── Update & draw particles ──
      for (const p of particles) {
        // Mouse interaction
        if (mouse.active) {
          const dx = mouse.x - p.x
          const dy = mouse.y - p.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < MOUSE_RADIUS && dist > 30) {
            const force = (1 - dist / MOUSE_RADIUS) * MOUSE_FORCE
            p.vx -= dx * force
            p.vy -= dy * force
          }
        }

        // Speed cap
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        const MAX_SPEED = 0.5
        if (speed > MAX_SPEED) {
          p.vx = (p.vx / speed) * MAX_SPEED
          p.vy = (p.vy / speed) * MAX_SPEED
        }

        // Move
        p.x += p.vx
        p.y += p.vy

        // Wrap around edges
        if (p.x < -20) p.x = w + 20
        if (p.x > w + 20) p.x = -20
        if (p.y < -20) p.y = h + 20
        if (p.y > h + 20) p.y = -20

        // Pulse
        p.pulsePhase += p.pulseSpeed
        const pulse = 0.6 + Math.sin(p.pulsePhase) * 0.4
        const currentOpacity = p.opacity * pulse

        // Draw particle
        const { r, g, b } = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${currentOpacity})`
        ctx.fill()

        // Outer glow
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${currentOpacity * 0.15})`
        ctx.fill()
      }

      // ── Draw connections ──
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i]
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < CONNECTION_DIST) {
            const opacity = (1 - dist / CONNECTION_DIST) * 0.08

            // Use average color of connected particles
            const r = Math.round((a.color.r + b.color.r) / 2)
            const g = Math.round((a.color.g + b.color.g) / 2)
            const bl = Math.round((a.color.b + b.color.b) / 2)

            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(${r},${g},${bl},${opacity})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }
      }



      animId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    />
  )
}
