/**
 * Confetti utility functions
 */
import confetti from 'canvas-confetti'

/**
 * Trigger a celebration confetti effect
 */
export function triggerConfetti() {
  const duration = 3000
  const animationEnd = Date.now() + duration
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min
  }

  const interval: NodeJS.Timeout = setInterval(function() {
    const timeLeft = animationEnd - Date.now()

    if (timeLeft <= 0) {
      return clearInterval(interval)
    }

    const particleCount = 50 * (timeLeft / duration)
    
    // Launch confetti from the left
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
    })
    
    // Launch confetti from the right
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
    })
  }, 250)
}

/**
 * Trigger a simple burst confetti effect
 */
export function triggerConfettiBurst() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444']
  })
}

