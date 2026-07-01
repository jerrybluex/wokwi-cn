/**
 * led-blink.ts — The single MVP course: "LED 闪烁".
 *
 * 5 steps: 看 / 亮 / 闪 / 调频 / 完成
 *
 * Each step provides:
 *   title        — short label shown in the step rail
 *   context      — markdown intro text (left panel)
 *   taskCode     — pre-filled editor code
 *   taskWiring   — pre-filled canvas circuit ( WiringJSON, same shape as fromWiringJSON )
 *
 * See PRD §6.5 and devplan §4 Day 9.
 */
export interface Step {
  title: string;
  context: string;
  taskCode: string;
  taskWiring: {
    parts: Array<{ id: string; type: string; x: number; y: number; rotation: number }>;
    wires: Array<{
      id: string;
      from: { part: string; pin: string };
      to: { part: string; pin: string };
    }>;
  };
}

export interface Course {
  slug: string;
  title: string;
  description: string;
  steps: Step[];
}

const UNO = { id: 'u1', type: 'arduino-uno', x: 40, y: 60, rotation: 0 as const };
const RESISTOR = { id: 'r1', type: 'resistor', x: 320, y: 110, rotation: 0 as const };
const LED = { id: 'l1', type: 'led', x: 480, y: 90, rotation: 0 as const };

const WIRES = [
  { id: 'w1', from: { part: 'u1', pin: 'D13' }, to: { part: 'r1', pin: 'A' } },
  { id: 'w2', from: { part: 'r1', pin: 'B' }, to: { part: 'l1', pin: 'A' } },
  { id: 'w3', from: { part: 'l1', pin: 'K' }, to: { part: 'u1', pin: 'GND' } },
];

export const ledBlinkCourse: Course = {
  slug: 'led-blink',
  title: 'LED 闪烁',
  description: '用 Arduino 让一颗 LED 亮起来，然后让它一闪一闪。',

  steps: [
    // ── Step 0: 看 ──────────────────────────────────────────────────
    {
      title: '看：认识 LED',
      context: `## LED 是什么？

LED 的全称是 **发光二极管**（Light Emitting Diode）。

它在电路里的符号是一个带两根腿的箭头，长的那根腿叫 **阳极（A）**，接信号线；短的那根叫 **阴极（K）**，接地。

> 小技巧：看 LED 的两条腿，**长腿是阳极**，插到信号那一排；**短腿是阴极**，插到 GND 那排。

### 电路连接

\`\`\`
Arduino D13 ──220Ω 电阻── LED阳极(A)
GND ─────────────────────── LED阴极(K)
\`\`\`

### 代码预览

\`\`\`cpp
// 代码写在这里
void setup() {
  pinMode(13, OUTPUT);
}
void loop() {
  digitalWrite(13, HIGH);  // 点亮
  delay(1000);             // 等1秒
  digitalWrite(13, LOW);   // 熄灭
  delay(1000);             // 等1秒
}
\`\`\`

右侧编辑器已经准备好了完整代码，点击 **▶ Run** 看看 LED 怎么闪。
先感受一下，再进入下一步亲手写。`,
      taskCode: `void setup() {
  pinMode(13, OUTPUT);
}
void loop() {
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}
`,
      taskWiring: {
        parts: [UNO, RESISTOR, LED],
        wires: WIRES,
      },
    },

    // ── Step 1: 亮 ──────────────────────────────────────────────────
    {
      title: '亮：让 LED 常亮',
      context: `## 让 LED 常亮

上一步你看到了 LED 闪烁。这一步，你要**自己动手**让 LED 亮起来。

### Arduino 两个必须函数

Arduino 程序有两个固定函数：

| 函数 | 什么时候运行 | 用来做什么 |
|---|---|---|
| \`setup()\` | 开机时运行一次 | 初始化设置 |
| \`loop()\` | setup 后无限循环 | 主程序逻辑 |

### 让 LED 亮起来需要两步

1. **告诉 Arduino**：D13 是一个输出引脚，可以往外供电
   \`\`\`cpp
   pinMode(13, OUTPUT);
   \`\`\`

2. **给 D13 输出高电平**，LED 就亮了
   \`\`\`cpp
   digitalWrite(13, HIGH);
   \`\`\`

### 你的任务

把这两行代码填到右侧编辑器里，然后点击 **▶ Run**。

> 提示：把它们都写在 \`setup()\` 里，这样开机就亮，\`loop()\` 可以留空。`,
      taskCode: `void setup() {
  // 在这里填入让 LED 亮的代码
}

void loop() {
  // loop 留空，这里不需要
}
`,
      taskWiring: {
        parts: [UNO, RESISTOR, LED],
        wires: WIRES,
      },
    },

    // ── Step 2: 闪 ──────────────────────────────────────────────────
    {
      title: '闪：让 LED 一闪一闪',
      context: `## 让 LED 闪烁起来

上一步 LED 已经亮了。现在我们要让它**一亮一灭，不断循环**。

### 关键函数：delay()

\`delay(毫秒)\` 让程序暂停一段时间，期间 LED 保持当前状态。

\`\`\`cpp
delay(1000);  // 暂停 1000 毫秒 = 1 秒
\`\`\`

### 让 LED 闪烁的逻辑

\`\`\`
点亮 LED  →  等待 1 秒  →  熄灭 LED  →  等待 1 秒  →  （回到开头循环）
\`\`\`

用代码表示：

\`\`\`cpp
digitalWrite(13, HIGH);  // 点亮
delay(1000);             // 等 1 秒
digitalWrite(13, LOW);   // 熄灭
delay(1000);             // 等 1 秒
\`\`\`

### 你的任务

把上面的逻辑写到 \`loop()\` 里（\`setup()\` 里保留之前的 \`pinMode\`）。

> 提示：\`loop()\` 会**自动循环**，所以不需要再写回去，它已经会一直重复了。`,
      taskCode: `void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  // 让 LED 闪烁的代码写在这里
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}
`,
      taskWiring: {
        parts: [UNO, RESISTOR, LED],
        wires: WIRES,
      },
    },

    // ── Step 3: 调频 ────────────────────────────────────────────────
    {
      title: '调频：调速度',
      context: `## 调整闪烁速度

现在 LED 每秒闪一次。改一下 delay 的时间，就可以控制闪烁速度。

### delay 的单位

\`delay()\` 里的数字是**毫秒**（ms）：

| 数字 | 实际时间 |
|---|---|
| 500 | 半秒 |
| 1000 | 1 秒 |
| 2000 | 2 秒 |
| 100 | 0.1 秒 |

### 你的任务

把 delay 的时间改一改，感受速度变化：

- 改成 \`100\` 和 \`100\`，LED 闪得很快，像心跳
- 改成 \`2000\` 和 \`2000\`，LED 闪得很慢，像呼吸

右侧编辑器里已经有代码了，改两个数字，点击 **▶ Run** 试试。
找到你觉得最好看的一个速度，进入最后一步！`,
      taskCode: `void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000);   // 亮多久？改成别的数字试试
  digitalWrite(13, LOW);
  delay(1000);   // 灭多久？改成别的数字试试
}
`,
      taskWiring: {
        parts: [UNO, RESISTOR, LED],
        wires: WIRES,
      },
    },

    // ── Step 4: 完成 ────────────────────────────────────────────────
    {
      title: '完成！',
      context: `## 🎉 你完成了 LED 闪烁课！

### 这节课学了什么

- \`pinMode(引脚号, OUTPUT)\` — 把引脚设为输出模式
- \`digitalWrite(引脚号, HIGH/LOW)\` — 控制引脚输出高电平（亮）或低电平（灭）
- \`delay(毫秒)\` — 暂停一段时间

### 恭喜你完成了第一个 Arduino 实验！

你现在可以：

- 去 **编辑器** 试试更复杂的代码
- 接入更多元件（按钮、电位器…）
- 或者继续下一门课

---

*感谢你完成了 LED 闪烁课！继续探索单片机的世界吧。* 🚀`,
      taskCode: `void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(500);
  digitalWrite(13, LOW);
  delay(500);
}
`,
      taskWiring: {
        parts: [UNO, RESISTOR, LED],
        wires: WIRES,
      },
    },
  ],
};