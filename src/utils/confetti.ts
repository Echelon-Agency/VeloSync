import confetti from 'canvas-confetti';

export function fireTierConfetti(tier: string) {
  let colors = ['#8A2BE2', '#06B6D4', '#10B981', '#F59E0B', '#EC4899'];
  
  if (tier === 'basic') {
    colors = ['#10B981', '#34D399', '#06B6D4', '#6EE7B7', '#A7F3D0'];
  } else if (tier === 'premium') {
    colors = ['#8A2BE2', '#A855F7', '#C084FC', '#EC4899', '#E879F9'];
  } else if (tier === 'gold') {
    colors = ['#F59E0B', '#FBBF24', '#FCD34D', '#FEF08A', '#EAB308'];
  }

  // Wave 1: Side Cannons
  confetti({
    particleCount: 80,
    angle: 60,
    spread: 65,
    origin: { x: 0.1, y: 0.65 },
    colors,
    zIndex: 9999,
  });

  confetti({
    particleCount: 80,
    angle: 120,
    spread: 65,
    origin: { x: 0.9, y: 0.65 },
    colors,
    zIndex: 9999,
  });

  // Wave 2: Center Star/Particle explosion
  setTimeout(() => {
    confetti({
      particleCount: 110,
      spread: 110,
      origin: { x: 0.5, y: 0.4 },
      colors,
      shapes: ['star', 'circle'],
      scalar: 1.25,
      zIndex: 9999,
    });
  }, 250);

  // Wave 3: Top curtain flutter
  setTimeout(() => {
    confetti({
      particleCount: 60,
      angle: 90,
      spread: 140,
      origin: { x: 0.5, y: 0.05 },
      colors,
      drift: 0.1,
      ticks: 220,
      zIndex: 9999,
    });
  }, 600);
}
