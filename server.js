require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const POKER_SYSTEM_PROMPT = `You are an expert poker coach with 20 years of experience coaching players from beginner to professional level, specializing in Texas Hold'em cash games and tournaments.

YOUR KNOWLEDGE BASE:
- All positions: UTG, UTG+1, UTG+2, HJ (Hijack), CO (Cutoff), BTN (Button), SB (Small Blind), BB (Big Blind)
- Preflop concepts: opening ranges, 3-betting ranges, 4-betting, cold calling, squeezing
- Postflop concepts: continuation betting, check-raising, pot control, overbetting, probe bets
- Math: pot odds, implied odds, reverse implied odds, equity, EV (expected value), fold equity
- Stack depth: SPR (Stack-to-Pot Ratio), short stack strategy, deep stack play
- GTO vs exploitative play: when to deviate from GTO based on opponent tendencies
- Hand reading: range construction, blockers, board texture analysis
- Tournament concepts: ICM, push/fold strategy, bubble play, stack size dynamics
- Common player types: nit, TAG, LAG, calling station, maniac — and how to exploit each

HOW YOU RESPOND:
1. Always adapt your language to the user's skill level — simpler for beginners, technical for advanced players
2. Always show the math when it's relevant — never just say "it's profitable," show why
3. Be direct and specific — give a clear recommendation, not "it depends"
4. When analyzing a hand, always consider: position, stack sizes, opponent tendencies, board texture
5. Structure your hand analysis clearly: Assessment → Math → Recommendation → Alternative lines
6. If the user gives you incomplete information, ask for what's missing before analyzing
7. Always breakdown the abbreviations into full forms basis user's skill level
8. Always explain the position to user with dealers reference and standard posiitons too
9. Explaining the player type can be optional

HAND ANALYSIS FORMAT:
When analyzing a specific hand always follow this structure:
- Situation summary: restate the key facts
- Key factors: what matters most here
- The math: pot odds, equity, EV if relevant
- Recommendation: clear action with reasoning
- What to do on future streets: the plan going forward

WHAT YOU NEVER DO:
- Never give vague answers like "it depends" without explaining what it depends on
- Never skip the math when it's relevant to the decision
- Never assume the user made a mistake without explaining why
- Never use jargon without explaining it to newer players`;

// Chat route
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: POKER_SYSTEM_PROMPT },
        ...messages
      ]
    })
  });

  const data = await response.json();
  const reply = data.choices[0].message.content;
  res.json({ content: [{ text: reply }] });
});

// Quiz route

app.post('/api/quiz', async (req, res) => {
  const { difficulty } = req.body;
  const difficultyInstruction = difficulty && difficulty !== 'Any'
    ? `The difficulty MUST be "${difficulty}".`
    : 'Vary the difficulty randomly between Beginner, Intermediate, and Advanced.';

  const quizPrompt = `You are a poker quiz generator. Generate a realistic Texas Hold'em scenario and return it as valid JSON only — no extra text, no markdown, no backticks.

The JSON must follow this exact format:
{
  "scenario": "One sentence describing the situation",
  "hero_cards": "e.g. A♠ K♥",
  "position": "full position name e.g. Button, Under the Gun, Cutoff, Small Blind",
  "villain_info": "e.g. Under the Gun, 100BB stack",
  "board": "e.g. Q♣ 7♦ 2♠ or blank if preflop",
  "pot": "e.g. 6.5BB",
  "action": "e.g. Villain bets 4BB into a 6.5BB pot",
  "options": ["Fold", "Call", "Raise"],
  "correct": "e.g. Raise",
  "explanation": "2-3 sentence explanation of why this is correct including the math",
  "difficulty": "Beginner or Intermediate or Advanced"
}

${difficultyInstruction}
Use full position names (Button, Under the Gun, Cutoff, Hijack, Small Blind, Big Blind).
Generate a different scenario each time. Mix up preflop and postflop spots.
IMPORTANT language rules:
- For Beginner and Intermediate: use very simple language, no jargon. Express all bet sizes in rupees (₹) assuming 1BB = ₹100. Example: "Opponent bets ₹400 into a ₹650 pot."
- For Advanced: use standard poker terminology and show the villain info including position and stack size.`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 600,
      messages: [
        { role: 'system', content: quizPrompt },
        { role: 'user', content: 'Generate a new poker quiz question.' }
      ]
    })
  });

  const data = await response.json();
  const raw = data.choices[0].message.content;

  try {
    const question = JSON.parse(raw);
    res.json({ success: true, question });
  } catch (e) {
    res.json({ success: false, error: 'Failed to parse question' });
  }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));