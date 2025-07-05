const modes = {
  noob: [-3, 3, -3, 3, "+-", 15e3, 10],
  easy: [-10, 10, -10, 10, "*/+-", 2e4, 40],
  medium: [-40, 40, -20, 20, "*/+-", 4e4, 150],
  hard: [-100, 100, -70, 70, "*/+-", 6e4, 350],
  extreme: [-999999, 999999, -999999, 999999, "*/", 99999, 9999],
  impossible: [-99999999999, 99999999999, -99999999999, 999999999999, "*/", 3e4, 35e3],
  impossible2: [-999999999999999, 999999999999999, -999, 999, "/", 3e4, 5e4]
};
const operators = {
  "+": "+",
  "-": "-",
  "*": "×",
  "/": "÷"
};

function randomInt(from, to) {
  if (from > to)[from, to] = [to, from];
  from = Math.floor(from);
  to = Math.floor(to);
  return Math.floor((to - from) * Math.random() + from);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function genMath(mode) {
  const [a1, a2, b1, b2, ops, time, bonus] = modes[mode];
  let a = randomInt(a1, a2);
  const b = randomInt(b1, b2);
  const op = pickRandom([...ops]);
  let result = new Function(`return ${a} ${op.replace("/", "*")} ${b < 0 ? `(${b})` : b}`)();
  if (op === "/") {
    [a, result] = [result, a];
  }
  return {
    str: `${a} ${operators[op]} ${b}`,
    mode: mode,
    time: time,
    bonus: bonus,
    result: result
  };
}
export default async function handler(req, res) {
  const {
    level
  } = req.method === "GET" ? req.query : req.body;
  const levels = Object.keys(modes);
  const randomLevel = level && levels.includes(level) ? level : pickRandom(levels);
  const mathProblem = genMath(randomLevel);
  return res.status(200).json(mathProblem);
}