<template>
  <div class="game-wrapper">
    <!-- Confetes no Canvas para a tela de vitória -->
    <ConfettiCanvas :active="isSolved" />

    <!-- Elementos Flutuantes do Background -->
    <div class="bg-blobs">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
    </div>

    <!-- Container Principal do Jogo -->
    <Transition name="fade" mode="out-in">
      <!-- TELA DE CELEBRAÇÃO FINAL -->
      <div
        v-if="isSolved"
        key="victory"
        class="glass-card celebration-card text-center"
      >
        <!-- <div class="icon-wrapper victory-icon">🎉</div> -->
        <h1>{{ CONFIG.celebration.title }}</h1>
        <!-- <h2 class="subtitle">{{ CONFIG.celebration.subtitle }}</h2> -->

        <div class="divider"></div>

        <p class="celebration-message">{{ CONFIG.celebration.message }}</p>

        <!-- <button class="btn btn-primary btn-reset" @click="resetGame">
          Jogar Novamente
        </button> -->
      </div>

      <!-- TELA DO JOGO (ENIGMAS) -->
      <div v-else :key="currentStageIndex" class="glass-card" id="enigma-card">
        <div class="card-header">
          <div class="d-flex justify-center">
            <span class="">{{ currentStageIndex + 1 }}</span>
          </div>
        </div>

        <div class="divider"></div>

        <div class="enigma-body text-center">
          <!-- Texto em itálico opcional -->
          <p v-if="currentStage.italicText" class="italic-prompt">
            {{ currentStage.italicText }}
          </p>

          <!-- Imagem opcional -->
          <div v-if="currentStage.image" class="enigma-image-container">
            <img
              :src="currentStage.image"
              alt="Enigma Image"
              class="enigma-image"
            />
          </div>

          <!-- Descrição principal -->
          <!-- <p v-if="currentStage.description" class="enigma-description">{{ currentStage.description }}</p> -->

          <!-- Exibição do Enigma Textual -->
          <div
            v-if="currentStage.prompt"
            :class="[
              'enigma-display',
              {
                'morse-font': currentStage.id === 1,
                'italic-grey': currentStage.italicPrompt,
              },
            ]"
            style="
              white-space: pre-wrap;
              flex-direction: column;
              font-size: 1.6rem;
              line-height: 1.5;
            "
          >
            <span v-if="hasDeer" class="deer-symbol">𐂂</span>
            <span>{{ promptWithoutDeer }}</span>
          </div>

          <!-- Código binário opcional -->
          <p v-if="currentStage.binary" class="binary-prompt">
            {{ currentStage.binary }}
          </p>

          <!-- Coordenadas opcionais -->
          <div v-if="currentStage.coordinates" class="coordinates-prompt">
            <div
              v-for="coord in parsedCoordinates"
              :key="coord.label"
              class="coord-item"
              :title="coord.tooltip"
            >
              {{ coord.label }}: {{ coord.value }}
            </div>
          </div>

          <!-- Código HEX opcional -->
          <p v-if="currentStage.hexCode" class="hex-prompt">
            {{ currentStage.hexCode }}
          </p>
        </div>

        <form @submit.prevent="checkAnswer" class="answer-form">
          <div class="input-wrapper" :class="{ shake: isShaking }">
            <input
              type="text"
              v-model="answerInput"
              placeholder="scribe quid ibi sit"
              class="answer-input"
              ref="inputField"
              autocomplete="off"
              spellcheck="false"
              :disabled="isTransitioning"
            />
          </div>

          <div class="actions">
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="!answerInput.trim() || isTransitioning"
            >
              sequentia
            </button>
          </div>
        </form>

        <!-- Feedback de erro/sucesso -->
        <Transition name="fade-fast">
          <p v-if="feedbackMessage" :class="['feedback-message', feedbackType]">
            {{ feedbackMessage }}
          </p>
        </Transition>

        <!-- Seção de Dicas -->
        <div class="hint-section">
          <button
            type="button"
            class="btn-hint"
            @click="toggleHint"
            :class="{ 'hint-active': showHint }"
          >
            <span>{{ showHint ? "celare" : "opusne tibi est auxilio?" }}</span>
          </button>

          <Transition name="expand">
            <div v-if="showHint" class="hint-box">
              <p class="hint-text">
                {{ currentStage.hints[currentHintIndex] }}
              </p>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import {
  ref,
  computed,
  watch,
  nextTick,
  onMounted,
  onBeforeUnmount,
} from "vue";
import { CONFIG } from "../config.js";
import { sound } from "./SoundManager.js";
import ConfettiCanvas from "./ConfettiCanvas.vue";

const currentStageIndex = ref(0);
const answerInput = ref("");
const attemptsCount = ref(0);
const showHint = ref(false);
const currentHintIndex = ref(0);
const isSolved = ref(false);
const isShaking = ref(false);
const feedbackMessage = ref("");
const feedbackType = ref(""); // 'error' ou 'success'
const isTransitioning = ref(false);
const inputField = ref(null);
let activeMelodyNotes = [];

const currentStage = computed(() => CONFIG.stages[currentStageIndex.value]);

const parsedCoordinates = computed(() => {
  if (!currentStage.value || !currentStage.value.coordinates) return [];
  const lines = currentStage.value.coordinates.split("\n");
  const tooltips = {
    V: "Volume",
    S: "Shelf",
    W: "Wall",
    P: "Page",
  };
  return lines
    .map((line) => {
      const parts = line.split(":");
      if (parts.length < 2) return null;
      const label = parts[0].trim();
      const value = parts[1].trim();
      return {
        label,
        value,
        tooltip: tooltips[label] || label,
      };
    })
    .filter((item) => item !== null);
});

const hasDeer = computed(() => {
  return currentStage.value && currentStage.value.prompt && currentStage.value.prompt.startsWith("𐂂");
});

const promptWithoutDeer = computed(() => {
  if (!currentStage.value || !currentStage.value.prompt) return "";
  if (hasDeer.value) {
    const firstNewline = currentStage.value.prompt.indexOf("\n");
    return firstNewline !== -1 ? currentStage.value.prompt.substring(firstNewline + 1) : "";
  }
  return currentStage.value.prompt;
});

// Função para normalizar strings (remove acentos, espaços extras e deixa em maiúsculo)
const normalizeString = (str) => {
  if (!str) return "";
  return str
    .toString()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/\s+/g, "") // Remove todos os espaços
    .trim();
};

const sha256 = async (text) => {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
};

const checkAnswer = async () => {
  if (isTransitioning.value) return;

  const normalizedInput = normalizeString(answerInput.value);
  const hashedInput = await sha256(normalizedInput);

  if (hashedInput === currentStage.value.answerHash) {
    handleCorrectAnswer();
  } else {
    handleIncorrectAnswer();
  }
};

const handleCorrectAnswer = () => {
  isTransitioning.value = true;
  feedbackMessage.value = "dexter";
  feedbackType.value = "success";
  sound.playSuccess();

  setTimeout(() => {
    feedbackMessage.value = "";

    // Se ainda houver fases, vai para a próxima
    if (currentStageIndex.value < CONFIG.stages.length - 1) {
      currentStageIndex.value++;
      answerInput.value = "";
      attemptsCount.value = 0;
      showHint.value = false;
      currentHintIndex.value = 0;
      isTransitioning.value = false;

      // Focar de novo no input após a transição
      nextTick(() => {
        if (inputField.value) inputField.value.focus();
      });
    } else {
      // Fim do jogo - Vitória!
      isSolved.value = true;
      isTransitioning.value = false;
      // Inicia melodia de aniversário
      activeMelodyNotes = sound.playHappyBirthday();
    }
  }, 1000);
};

const handleIncorrectAnswer = () => {
  isShaking.value = true;
  feedbackMessage.value = "iniuriam.";
  feedbackType.value = "error";
  sound.playError();
  attemptsCount.value++;

  // Auto revelar a primeira dica se errar 2 vezes
  if (attemptsCount.value >= 2 && !showHint.value) {
    showHint.value = true;
  }

  // Se já estiver com dicas ativas e errar de novo, pode avançar o índice da dica
  if (
    attemptsCount.value >= 4 &&
    currentHintIndex.value < currentStage.value.hints.length - 1
  ) {
    currentHintIndex.value++;
  }

  setTimeout(() => {
    isShaking.value = false;
  }, 500);
};

const toggleHint = () => {
  sound.playClick();
  showHint.value = !showHint.value;
};

// Injeção de comentários HTML dinâmicos para a Fase 2 (decifra.me style)
const commentNode = ref(null);
watch(
  currentStageIndex,
  (newIdx) => {
    // Limpar comentário anterior se houver
    if (commentNode.value && commentNode.value.parentNode) {
      commentNode.value.parentNode.removeChild(commentNode.value);
      commentNode.value = null;
    }

    const stage = CONFIG.stages[newIdx];
    if (stage && stage.injectComment) {
      const commentText = ` FASE 2: A resposta correta desta fase é "${stage.answer}" `;
      commentNode.value = document.createComment(commentText);

      // Injeta o comentário dentro do elemento com id 'enigma-card' quando ele estiver no DOM
      nextTick(() => {
        const container = document.getElementById("enigma-card");
        if (container) {
          container.appendChild(commentNode.value);
        }
      });
    }
  },
  { immediate: true },
);

const stopMelody = () => {
  if (activeMelodyNotes && activeMelodyNotes.length > 0) {
    activeMelodyNotes.forEach((node) => {
      try {
        node.osc.stop();
      } catch (e) {
        // Já parou
      }
    });
    activeMelodyNotes = [];
  }
};

const resetGame = () => {
  stopMelody();
  sound.playClick();
  currentStageIndex.value = 0;
  answerInput.value = "";
  attemptsCount.value = 0;
  showHint.value = false;
  currentHintIndex.value = 0;
  isSolved.value = false;
  feedbackMessage.value = "";

  nextTick(() => {
    if (inputField.value) inputField.value.focus();
  });
};

onMounted(() => {
  nextTick(() => {
    if (inputField.value) inputField.value.focus();
  });
});

onBeforeUnmount(() => {
  stopMelody();
});
</script>

<style scoped>
.game-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: 80vh;
}

/* Glassmorphism Card */
.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 40px;
  width: 100%;
  max-width: 480px;
  box-shadow: var(--shadow-main);
  transition: border-color 0.5s ease;
}

.glass-card:hover {
  border-color: rgba(255, 255, 255, 0.1);
}

/* Header */
.card-header {
  margin-bottom: 20px;
}

.stage-counter {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 500;
  display: block;
  margin-bottom: 8px;
}

.stage-title {
  font-family: var(--font-title);
  font-size: 1.5rem;
  color: var(--text-primary);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.divider {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.08),
    transparent
  );
  margin: 10px 0 24px;
}

/* Body */
.enigma-body {
  margin-bottom: 32px;
}

.enigma-display {
  font-family: var(--font-title);
  font-size: 2rem;
  font-weight: 500;
  margin: 20px 0;
  color: #ffffff;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.enigma-display.italic-grey {
  font-style: italic;
  color: var(--text-secondary); /* Levemente cinza */
  font-weight: 400;
  font-size: 1.4rem; /* Levemente menor e mais elegante */
}

/* Morse specific style for Fase 1 */
.enigma-display.morse-font {
  font-size: 3rem;
  letter-spacing: 0.25em;
  font-weight: 400;
  animation: pulse 3s infinite ease-in-out;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.8;
  }
  50% {
    opacity: 1;
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
  }
}

.enigma-description {
  font-size: 0.95rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* Form */
.answer-form {
  margin-bottom: 24px;
}

.input-wrapper {
  margin-bottom: 20px;
  position: relative;
}

.answer-input {
  width: 100%;
  padding: 14px 20px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--glass-border);
  color: #ffffff;
  font-family: var(--font-sans);
  font-size: 1.1rem;
  text-align: center;
  outline: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.answer-input:focus {
  background: rgba(255, 255, 255, 0.05);
  border-color: var(--glass-border-focus);
  box-shadow:
    0 0 15px rgba(255, 255, 255, 0.03),
    inset 0 2px 4px rgba(0, 0, 0, 0.15);
}

.answer-input:disabled {
  opacity: 0.6;
}

/* Buttons */
.btn {
  font-family: var(--font-sans);
  font-size: 1rem;
  font-weight: 500;
  padding: 14px 28px;
  border-radius: 14px;
  border: 1px solid transparent;
  cursor: pointer;
  width: 100%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  justify-content: center;
  align-items: center;
}

.btn-primary {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--glass-border);
  color: #ffffff;
}

.btn-primary:hover:not(:disabled) {
  background: #ffffff;
  color: var(--bg-color);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(255, 255, 255, 0.1);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Shake Animation on Error */
.input-wrapper.shake {
  animation: shake 0.5s;
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  15%,
  45%,
  75% {
    transform: translateX(-8px);
  }
  30%,
  60%,
  90% {
    transform: translateX(8px);
  }
}

/* Feedback messages */
.feedback-message {
  font-size: 0.9rem;
  text-align: center;
  margin-top: -10px;
  margin-bottom: 20px;
  font-weight: 500;
}

.feedback-message.error {
  color: #f87171; /* Soft red */
}

.feedback-message.success {
  color: #34d399; /* Soft green */
}

/* Hints Section */
.hint-section {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 20px;
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.btn-hint {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 20px;
  transition: all 0.3s ease;
}

.btn-hint:hover {
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.02);
}

.btn-hint.hint-active {
  color: #fbbf24; /* Soft gold bulb */
  background: rgba(251, 191, 36, 0.05);
}

.hint-box {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 16px;
  width: 100%;
  margin-top: 12px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
}

.hint-title {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #fbbf24;
  margin-bottom: 6px;
  letter-spacing: 0.05em;
}

.hint-text {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 12px;
}

.hint-navigation {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
}

.btn-nav-hint {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.btn-nav-hint:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
}

.btn-nav-hint:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.hint-nav-indicator {
  font-size: 0.8rem;
  color: var(--text-muted);
}

/* Celebration Card */
.celebration-card {
  max-width: 520px;
  position: relative;
  overflow: hidden;
}

.icon-wrapper {
  font-size: 4rem;
  margin-bottom: 24px;
}

.subtitle {
  font-size: 1.2rem;
  color: var(--text-secondary);
  font-weight: 400;
  margin-top: 8px;
}

.celebration-message {
  font-size: 1.05rem;
  color: var(--text-primary);
  line-height: 1.8;
  margin: 24px 0 32px;
}

.btn-reset {
  margin-top: 8px;
}

/* Transitions classes for animations */
.fade-fast-enter-active,
.fade-fast-leave-active {
  transition: opacity 0.25s ease;
}
.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
}

/* Expand Animation for Hint Box */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 200px;
  opacity: 1;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
  margin-top: 0;
  padding-top: 0;
  padding-bottom: 0;
  border-color: transparent;
  overflow: hidden;
}
/* Estilos para Fase 3 */
.italic-prompt {
  font-style: italic;
  font-size: 1.25rem;
  color: #3b82f6; /* Azul suave */
  margin-bottom: 20px;
}

.enigma-image-container {
  margin: 16px 0;
  display: flex;
  justify-content: center;
}

.enigma-image {
  max-width: 140px; /* Mantém a imagem em tamanho contido como na captura */
  height: auto;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.binary-prompt {
  font-family: monospace;
  font-size: 0.85rem;
  color: var(--text-secondary);
  word-break: break-all;
  margin: 24px 0;
  line-height: 1.6;
  max-width: 100%;
}

.coordinates-prompt {
  font-family: var(--font-title);
  font-size: 1.15rem;
  font-weight: 500;
  color: #ffffff;
  margin: 20px 0;
  letter-spacing: 0.02em;
}

.coord-item {
  cursor: help;
  transition: opacity 0.2s ease;
  margin-bottom: 4px;
  display: inline-block;
  width: 100%;
}

.coord-item:hover {
  opacity: 0.7;
}

.hex-prompt {
  font-family: monospace;
  font-size: 0.72rem;
  color: var(--text-muted);
  word-break: break-all;
  margin: 20px 0 0;
  line-height: 1.6;
  background: rgba(0, 0, 0, 0.2);
  padding: 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.03);
  max-height: 120px;
  overflow-y: auto;
  text-align: left;
}

.deer-symbol {
  font-size: 3.5rem; /* Aumenta consideravelmente o tamanho do cervo */
  margin-bottom: 12px;
  display: block;
  line-height: 1.1;
}

/* Mobile Responsiveness Overrides */
@media (max-width: 480px) {
  .deer-symbol {
    font-size: 2.8rem;
    margin-bottom: 8px;
  }

  .glass-card {
    padding: 28px 20px;
    border-radius: 18px;
  }

  .stage-title {
    font-size: 1.25rem;
  }

  .enigma-display {
    font-size: 1.4rem;
    margin: 15px 0;
    min-height: auto;
  }

  .enigma-display.morse-font {
    font-size: 2rem;
    letter-spacing: 0.12em;
  }

  .italic-prompt {
    font-size: 1.05rem;
    margin-bottom: 12px;
  }

  .binary-prompt {
    font-size: 0.75rem;
    margin: 16px 0;
  }

  .coordinates-prompt {
    font-size: 1rem;
    margin: 12px 0;
  }

  .hex-prompt {
    font-size: 0.65rem;
    padding: 10px;
    max-height: 100px;
  }

  .answer-input {
    padding: 12px 16px;
    font-size: 1rem;
    border-radius: 10px;
  }

  .btn {
    padding: 12px 20px;
    font-size: 0.95rem;
    border-radius: 10px;
  }

  .celebration-card {
    padding: 32px 20px;
  }

  .celebration-message {
    font-size: 0.95rem;
    line-height: 1.6;
    margin: 16px 0 24px;
  }
}
</style>
