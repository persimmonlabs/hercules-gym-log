# Hercules AI — Test Prompts

Rate each: ✅ Pass / ⚠️ Partial / ❌ Fail

---

## 1 — Identity & Profile

Passed all tests

## 2 — Scope Enforcement

Passed all tests

## 3 — Safety & Injuries

Passed all tests

## 4 — General Fitness Knowledge

Passed all tests

## 5 — Exercise Form

Passed all tests

## 6 — Personalized Advice

Passed all tests

## 7 — Statistics & Data Queries

51. `What's my bench press PR?`
52. `What's my squat PR?`
53. `What's my deadlift PR?`
54. `Show me all my personal records`
55. `How many total workouts have I done?`
56. `What's my total volume lifted all time?`
57. `How many workouts did I do last week?`
58. `How often do I work out per week on average?`
59. `Did I work out today?`
60. `Did I work out yesterday?`
61. `What did I do in my last workout?`
62. `Show me my last 5 workouts`
63. `How has my bench press progressed over time?`
64. `Am I getting stronger on squats?`
65. `Which muscle group do I train the most?`
66. `Show me my muscle group volume breakdown`
67. `How much have I improved on lateral raises in the last 3 months?`

## 8 — Insights & Analysis

68. `Am I making progress?`
69. `What are my weakest muscle groups?`
70. `Is my training balanced?`
71. `Am I training my legs enough?`
72. `What should I add to my program?`
73. `I feel like I've hit a plateau, what should I do?`
74. `How consistent have I been with my training?`
75. `What exercise should I focus on improving?`

## 9 — Create Workout (Single)

76. `Create me a push day workout`
77. `Make me a pull day`
78. `Create a leg day workout`
79. `Give me a chest workout`
80. `Create a back workout`
81. `Make me a shoulder workout`
82. `Create a bicep and tricep workout`
83. `Make me a full body workout`
84. `Create a dumbbell-only chest workout`
85. `Make me a 4-exercise leg day`
86. `Create a beginner push workout`
87. `Make me a glute-focused workout`
88. `Create a core workout`
89. `Make me a workout with no machines`

**After rejecting a workout proposal:**
90. `Use more cable exercises`
91. `I want more compound movements`
92. `Make it shorter, only 4 exercises`
93. `I don't like bench press, swap it out`

**After AI proposes a workout:**
94. `Yes, create it` *(should remind to tap Approve button)*
95. `Looks good` *(should remind to tap Approve button)*

## 10 — Create Program/Plan

96. `Create me a 3-day PPL program`
97. `Make me a 4-day upper/lower split`
98. `Create a 5-day bodybuilding program`
99. `Create a beginner 3-day full body program`
100. `Make me a strength-focused program`
101. `Create a hypertrophy program for 4 days a week`
102. `Make me a home gym program with dumbbells only`
103. `Create a 3-day program with rest days` *(rest days should NOT be workouts)*
104. `Make me a Push/Pull/Legs/Rest/Push/Pull/Legs program` *(only 3 unique workouts)*

## 11 — Schedule Creation

105. `Schedule my PPL for Monday, Wednesday, Friday`
106. `Set up a weekly schedule for my workouts`
107. `Create a rotating schedule for my PPL program`
108. `Schedule my workouts for the week` *(when NO workouts exist — should suggest creating first)*

## 12 — Log Workout Sessions

109. `Log a workout for today — bench press 4x8 at 135 lbs, incline dumbbell press 3x10 at 60 lbs`
110. `Log it: Bench Press 4x8 at 185, Shoulder Press 3x10 at 115, Tricep Pushdown 3x12 at 60`
111. `Log yesterday's leg workout: Squat 5x5 at 225, Leg Press 4x10 at 360, RDL 3x10 at 185`
112. `I did pull-ups 3x10 and dips 3x12 today, log it`

## 13 — Edit & Delete Sessions

113. `I made a mistake in my last log, I actually did 225 lbs on bench not 185`
114. `Delete my workout from yesterday`
115. `I logged the wrong workout, can you delete it?`

## 14 — Profile Updates

116. `Update my weight to 185 lbs`
117. `Update my experience to intermediate`
118. `Change my primary goal to lose fat`
119. `I now train 5 days a week`
120. `Switch me to metric units`

## 15 — Custom Exercise Creation

121. `Add a custom exercise called Meadows Row`
122. `Add a custom exercise: Banded Hip Abduction for glutes`
123. `Create a workout with Meadows Row` *(not in catalog — should ask about custom exercise)*

## 16 — Multi-Turn Conversation

124. `Create me a push day` → approve → `Now create a pull day`
125. `What's my bench press PR?` → `How does that compare to my squat PR?`
126. `Create a 3-day PPL program` → approve → `Now schedule it for Mon/Wed/Fri`
127. `I want a push workout` → `Actually, make it a pull workout instead`
128. `Create a chest workout` → reject → `More dumbbells` → reject → `Just 3 exercises`
129. `What did I do in my last workout?` → `How does that compare to the one before?`

## 17 — Edge Cases & Stress Tests

130. `asdfjkl;` *(gibberish — should ask for clarification)*
131. `Create a workout` *(no details — should ask clarifying questions)*
132. `What's my PR on the Pec Deck Machine?` *(no history — should say no data)*
133. `How many workouts did I do in 1985?` *(should say no data)*
134. `Create a workout with 20 exercises`
135. `Delete all my workouts` *(should NOT mass delete)*
136. `What's my max on Unicorn Press?` *(fake exercise — should say no data)*
137. `I want a rest day workout` *(should refuse)*
138. `Create a workout called Rest Day` *(should refuse)*
139. `Log a workout I did 6 months ago`

## 18 — App Navigation

140. `How do I log a workout?`
141. `How do I create a plan?`
142. `How do I set up a schedule?`
143. `Where can I see my personal records?`
144. `How do I change my units?`

## 19 — Tone & Personalization

145. `I'm feeling really unmotivated today`
146. `I just hit a new PR on bench press!`
147. `I haven't worked out in 2 weeks`
148. `What should I do today?`
149. `I'm bored of my current workouts`
150. `Am I doing a good job?`
