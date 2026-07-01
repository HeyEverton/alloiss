<template>
  <canvas ref="canvas" class="confetti-canvas"></canvas>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';

const props = defineProps({
  active: {
    type: Boolean,
    default: false
  }
});

const canvas = ref(null);
let ctx = null;
let animationFrameId = null;
let width = 0;
let height = 0;
const particles = [];

const colors = [
  '#f43f5e', // Rose
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#eab308', // Yellow
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#06b6d4'  // Cyan
];

class Particle {
  constructor() {
    this.reset(true);
  }

  reset(initY = false) {
    this.x = Math.random() * width;
    this.y = initY ? Math.random() * -height : Math.random() * -100 - 20;
    this.size = Math.random() * 8 + 6;
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.speedX = Math.random() * 2 - 1;
    this.speedY = Math.random() * 3 + 2;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = Math.random() * 4 - 2;
    this.wobble = Math.random() * 10;
    this.wobbleSpeed = Math.random() * 0.05 + 0.02;
    this.shape = Math.random() > 0.5 ? 'circle' : 'rect';
  }

  update() {
    this.y += this.speedY;
    this.x += this.speedX + Math.sin(this.wobble) * 0.5;
    this.wobble += this.wobbleSpeed;
    this.rotation += this.rotationSpeed;

    if (this.y > height) {
      if (props.active) {
        this.reset();
      }
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.fillStyle = this.color;

    ctx.beginPath();
    if (this.shape === 'circle') {
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size / 2);
    }
    ctx.restore();
  }
}

const resizeCanvas = () => {
  if (!canvas.value) return;
  width = canvas.value.width = window.innerWidth;
  height = canvas.value.height = window.innerHeight;
};

const initParticles = () => {
  particles.length = 0;
  const particleCount = Math.min(120, Math.floor(width / 8));
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }
};

const loop = () => {
  ctx.clearRect(0, 0, width, height);

  let activeParticles = 0;
  particles.forEach((p) => {
    p.update();
    p.draw();
    if (p.y <= height) {
      activeParticles++;
    }
  });

  if (props.active || activeParticles > 0) {
    animationFrameId = requestAnimationFrame(loop);
  } else {
    ctx.clearRect(0, 0, width, height);
  }
};

const startAnimation = () => {
  if (animationFrameId) return;
  resizeCanvas();
  initParticles();
  loop();
};

const stopAnimation = () => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
};

watch(() => props.active, (newVal) => {
  if (newVal) {
    startAnimation();
  }
});

onMounted(() => {
  ctx = canvas.value.getContext('2d');
  window.addEventListener('resize', resizeCanvas);
  if (props.active) {
    startAnimation();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCanvas);
  stopAnimation();
});
</script>

<style scoped>
.confetti-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 99;
  pointer-events: none;
}
</style>
