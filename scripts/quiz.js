import { getLeaderboardEntries, saveLeaderboardEntry } from './leaderboard-store.js';

const QUESTION_TIME_SECONDS = 60;
const MAX_QUESTION_SCORE = 1000;
const QUESTIONS = [
  {
    id: 1,
    text: '以下哪種動物最稀有？',
    options: ['藍鯨', '野生大熊貓', '野生穿山甲'],
    answerIndex: 2,
  },
  {
    id: 2,
    text: '哪種植物在台灣最稀有？',
    options: ['棉花樹', '水晶蘭', '鐵線蕨'],
    answerIndex: 1,
  },
  {
    id: 3,
    text: '以下哪座山最高？',
    options: ['干城章嘉峰', '富士山', '玉山'],
    answerIndex: 2,
  },
  {
    id: 4,
    text: '世界旅遊人次最多的國家？',
    options: ['中國', '美國', '法國'],
    answerIndex: 2,
  },
  {
    id: 5,
    text: '下列哪家航空公司的經濟艙平均票價最高？',
    options: ['國泰航空', '新加坡航空', '卡達航空'],
    answerIndex: 1,
  },
  {
    id: 6,
    text: '哪座城市旅客「每日平均花費」最高？',
    options: ['倫敦', '東京', '杜拜'],
    answerIndex: 0,
  },
  {
    id: 7,
    text: '哪個國家的高鐵相對最便宜？',
    options: ['中國', '日本', '台灣'],
    answerIndex: 2,
  },
  {
    id: 8,
    text: '最受歡迎的手搖飲品牌？',
    options: ['CoCo', '50嵐', '珍煮丹'],
    answerIndex: 1,
  },
  {
    id: 9,
    text: '哪項台灣國產水果價格最高？',
    options: ['玉女小番茄', '黑糖芭比蓮霧', '龍眼肉（乾）'],
    answerIndex: 2,
  },
  {
    id: 10,
    text: '下列哪一項「最不可能買到原價」？',
    options: ['演唱會門票', '羅東夜市烤香腸', '螃蟹漁港直播喊價的海鮮'],
    answerIndex: 0,
  },
  {
    id: 11,
    text: '哪一個是「全台最會不見的物品」？',
    options: ['雨傘', '充電線', '手機'],
    answerIndex: 0,
  },
  {
    id: 12,
    text: '哪個行為最能看出一個人的真正價值？',
    options: ['壓力時的反應', '成功時的態度', '對待人的方式'],
    answerIndex: 2,
  },
  {
    id: 13,
    text: '哪一個最能體現「無形但最有價值」？',
    options: ['真誠的眼神', '無情的擁抱', '一次認真聆聽你的朋友話'],
    answerIndex: 2,
  },
  {
    id: 14,
    text: '哪個更能代表一個人生命的價值？',
    options: ['擁有什麼', '穿什麼', '成為怎樣的人'],
    answerIndex: 2,
  },
];

const letters = ['A', 'B', 'C'];
const totalQuestions = QUESTIONS.length;

const elements = {
  stageLoading: document.getElementById('stageLoading'),
  stageTeam: document.getElementById('stageTeam'),
  stageQuestion: document.getElementById('stageQuestion'),
  stageSummary: document.getElementById('stageSummary'),
  teamForm: document.getElementById('teamForm'),
  teamInput: document.getElementById('teamInput'),
  teamError: document.getElementById('teamError'),
  topicName: document.getElementById('topicName'),
  scoreValue: document.getElementById('scoreValue'),
  progressValue: document.getElementById('progressValue'),
  questionText: document.getElementById('questionText'),
  options: document.getElementById('options'),
  timerFill: document.getElementById('timerFill'),
  timerScore: document.getElementById('timerScore'),
  summaryTeam: document.getElementById('summaryTeam'),
  summaryScore: document.getElementById('summaryScore'),
  summaryAccuracy: document.getElementById('summaryAccuracy'),
  summaryLeaderboard: document.getElementById('summaryLeaderboard'),
  btnRefreshSummary: document.getElementById('btnRefreshSummary'),
};

const state = {
  teamName: '',
  currentIndex: 0,
  score: 0,
  correct: 0,
  timerId: null,
  locked: false,
  questionStart: 0,
  currentPotential: MAX_QUESTION_SCORE,
  startTimestamp: null,
};

const stageMap = {
  loading: elements.stageLoading,
  team: elements.stageTeam,
  question: elements.stageQuestion,
  summary: elements.stageSummary,
};

function setStage(stage) {
  Object.entries(stageMap).forEach(([key, section]) => {
    if (!section) {
      return;
    }
    section.classList.toggle('hidden', key !== stage);
  });
  if (stage === 'team') {
    window.requestAnimationFrame(() => {
      elements.teamInput?.focus();
    });
  }
}

function escapeHtml(text) {
  const str = String(text ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function computePotentialScore() {
  if (!state.questionStart) {
    return MAX_QUESTION_SCORE;
  }
  const elapsed = (performance.now() - state.questionStart) / 1000;
  const remaining = Math.max(0, QUESTION_TIME_SECONDS - elapsed);
  return Math.max(0, Math.round((remaining / QUESTION_TIME_SECONDS) * MAX_QUESTION_SCORE));
}

function startTimer() {
  stopTimer();
  state.questionStart = performance.now();
  state.locked = false;
  state.currentPotential = MAX_QUESTION_SCORE;
  elements.timerFill.style.transform = 'scaleX(1)';
  elements.timerScore.textContent = `剩餘分數：${MAX_QUESTION_SCORE}`;

  const runner = (timestamp) => {
    if (state.locked) {
      return;
    }
    const ratio = Math.max(0, 1 - (timestamp - state.questionStart) / (QUESTION_TIME_SECONDS * 1000));
    state.currentPotential = Math.max(0, Math.round(ratio * MAX_QUESTION_SCORE));
    elements.timerFill.style.transform = `scaleX(${ratio})`;
    elements.timerScore.textContent = `剩餘分數：${state.currentPotential}`;

    if (ratio <= 0) {
      finishQuestion({ selectionIndex: null, triggeredByTimer: true });
      return;
    }
    state.timerId = window.requestAnimationFrame(runner);
  };

  state.timerId = window.requestAnimationFrame(runner);
}

function stopTimer() {
  if (state.timerId) {
    window.cancelAnimationFrame(state.timerId);
    state.timerId = null;
  }
}

function updateScorePanel() {
  if (elements.scoreValue) {
    elements.scoreValue.textContent = `分數：${state.score}`;
  }
  if (elements.progressValue) {
    elements.progressValue.textContent = `題目：${Math.min(state.currentIndex + 1, totalQuestions)}/${totalQuestions}`;
  }
}

function renderOptions(question) {
  if (!elements.options) {
    return;
  }
  elements.options.innerHTML = '';
  question.options.forEach((optionText, index) => {
    const option = document.createElement('div');
    option.className = 'option';
    option.dataset.index = String(index);
    option.innerHTML = `
      <span class="tag">${letters[index] || ''}</span>
      <span>${escapeHtml(optionText)}</span>
    `;
    option.addEventListener('click', () => handleAnswer(index));
    elements.options.appendChild(option);
  });
}

function showQuestion() {
  const question = QUESTIONS[state.currentIndex];
  elements.questionText.textContent = `${state.currentIndex + 1}. ${question.text}`;
  renderOptions(question);
  updateScorePanel();
  startTimer();
}

function disableOptions() {
  elements.options?.querySelectorAll('.option').forEach((option) => {
    option.classList.add('disabled');
  });
}

function finishQuestion({ selectionIndex, triggeredByTimer }) {
  if (state.locked) {
    return;
  }
  state.locked = true;
  stopTimer();
  const question = QUESTIONS[state.currentIndex];
  const correctIndex = question.answerIndex;
  const options = Array.from(elements.options?.querySelectorAll('.option') || []);
  let earned = 0;

  options.forEach((option, index) => {
    option.classList.add('disabled');
    if (index === correctIndex) {
      option.classList.add('correct');
    }
    if (selectionIndex === index) {
      option.classList.add('selected');
      if (index !== correctIndex) {
        option.classList.add('incorrect');
      }
    }
  });

  if (!triggeredByTimer && selectionIndex === correctIndex) {
    state.currentPotential = computePotentialScore();
    earned = state.currentPotential;
    state.score += earned;
    state.correct += 1;
  }

  disableOptions();
  elements.timerScore.textContent = `本題得分：${earned}`;
  updateScorePanel();

  window.setTimeout(nextQuestion, 1100);
}

function handleAnswer(selectionIndex) {
  if (state.locked) {
    return;
  }
  finishQuestion({ selectionIndex, triggeredByTimer: false });
}

function nextQuestion() {
  state.currentIndex += 1;
  if (state.currentIndex >= totalQuestions) {
    finishGame().catch(() => {});
    return;
  }
  state.currentPotential = MAX_QUESTION_SCORE;
  setStage('question');
  showQuestion();
}

function renderLeaderboardList(container, entries) {
  if (!container) {
    return;
  }
  if (!entries.length) {
    container.innerHTML = '<div class="leaderboard-empty">尚無紀錄，歡迎第一個挑戰！</div>';
    return;
  }
  const header = `
    <div class="leaderboard-row header">
      <div>名次</div>
      <div>隊伍</div>
      <div>分數</div>
      <div>答對題數</div>
    </div>
  `;
  const rows = entries
    .map((entry, index) => {
      const accuracy = entry.total ? `${entry.correct}/${entry.total}` : `${entry.correct}`;
      return `
        <div class="leaderboard-row">
          <div class="leaderboard-rank">#${index + 1}</div>
          <div class="leaderboard-team">${escapeHtml(entry.teamName)}</div>
          <div class="leaderboard-score">${entry.score}</div>
          <div class="leaderboard-meta">${accuracy}</div>
        </div>
      `;
    })
    .join('');
  container.innerHTML = `<div class="leaderboard-grid">${header}${rows}</div>`;
}

function renderSummaryInfo(entry) {
  elements.summaryTeam.textContent = `隊伍：${entry.teamName}`;
  elements.summaryScore.textContent = `分數：${entry.score}`;
  elements.summaryAccuracy.textContent = `答對：${entry.correct}/${entry.total}`;
}

async function finishGame() {
  stopTimer();
  const durationSeconds = state.startTimestamp ? Math.round((Date.now() - state.startTimestamp) / 1000) : null;
  const entry = {
    teamName: state.teamName,
    score: state.score,
    correct: state.correct,
    total: totalQuestions,
    durationSeconds,
    playedAt: Date.now(),
  };

  renderSummaryInfo(entry);
  if (elements.summaryLeaderboard) {
    elements.summaryLeaderboard.innerHTML = '<div class="leaderboard-empty">更新中...</div>';
  }
  setStage('summary');

  try {
    const leaderboard = await saveLeaderboardEntry(entry);
    renderLeaderboardList(elements.summaryLeaderboard, leaderboard);
  } catch (error) {
    console.error('[Top Fun 3.0] 更新排行榜失敗', error);
    if (elements.summaryLeaderboard) {
      elements.summaryLeaderboard.innerHTML = '<div class="leaderboard-empty">無法更新排行榜，請稍後再試。</div>';
    }
  }
}

async function refreshSummaryLeaderboard() {
  if (elements.summaryLeaderboard) {
    elements.summaryLeaderboard.innerHTML = '<div class="leaderboard-empty">重新整理中...</div>';
  }
  try {
    const entries = await getLeaderboardEntries();
    renderLeaderboardList(elements.summaryLeaderboard, entries);
  } catch (error) {
    console.error('[Top Fun 3.0] 重新整理排行榜失敗', error);
    if (elements.summaryLeaderboard) {
      elements.summaryLeaderboard.innerHTML = '<div class="leaderboard-empty">排行榜暫時無法載入，請稍後再試。</div>';
    }
  }
}

function resetState() {
  state.currentIndex = 0;
  state.score = 0;
  state.correct = 0;
  state.currentPotential = MAX_QUESTION_SCORE;
  state.questionStart = 0;
  state.locked = false;
  state.timerId = null;
  state.startTimestamp = null;
  elements.timerFill.style.transform = 'scaleX(1)';
  elements.timerScore.textContent = `剩餘分數：${MAX_QUESTION_SCORE}`;
  elements.questionText.textContent = '';
  elements.options.innerHTML = '';
  if (elements.teamForm) {
    elements.teamForm.reset();
  }
  if (elements.teamError) {
    elements.teamError.classList.add('hidden');
  }
  updateScorePanel();
  elements.progressValue.textContent = `題目：0/${totalQuestions}`;
}

function startGame(teamName) {
  state.teamName = teamName;
  resetState();
  state.startTimestamp = Date.now();
  setStage('question');
  showQuestion();
}

function handleTeamSubmit(event) {
  event.preventDefault();
  const name = elements.teamInput?.value.trim();
  if (!name) {
    if (elements.teamError) {
      elements.teamError.textContent = '請輸入隊伍名稱';
      elements.teamError.classList.remove('hidden');
    }
    return;
  }
  if (elements.teamError) {
    elements.teamError.classList.add('hidden');
  }
  startGame(name);
}

function init() {
  if (elements.topicName) {
    elements.topicName.textContent = '問答題˙';
  }
  resetState();
  elements.progressValue.textContent = `題目：0/${totalQuestions}`;
  setStage('team');
  if (elements.teamForm) {
    elements.teamForm.addEventListener('submit', handleTeamSubmit);
  }
  if (elements.btnRefreshSummary) {
    elements.btnRefreshSummary.addEventListener('click', () => {
      refreshSummaryLeaderboard().catch(() => {});
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
