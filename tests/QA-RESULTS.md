# 自动检查记录

这些检查使用 Node 与内存 DOM/存储模拟，不是原生浏览器验收。

## 引擎

```
PASS new learner has only G1 unlocked
PASS diagnostic cannot unlock G2
PASS practice completed cannot unlock G2
PASS partial retest or unsaved completed session cannot unlock
PASS 80 percent with coverage passes, hints during practice are permitted
PASS retake with lower score re-locks next level only when completed and saved
PASS all grammar levels required for Spelling
PASS Spelling uses ten questions with separate spelling and sentence domains
PASS every independent item is disjoint from teaching items
PASS I-am errors target similar new I-am items, preserve independent blueprint
PASS practice errors adapt next items and H3 does not survive next item
PASS serialized draft preserves answers, attempts, hints and fixed retest questions
PASS focus sessions never grant whole-module mastery
PASS wrong book confirms recurrence and keeps learner records isolated
PASS forged summary alone cannot unlock
PASS 80 percent cannot mask complete failure of two I-am coverage items
PASS spelling refresher revisits only the selected word and grants no domain pass
PASS adaptive practice remains disjoint and complete under repeated errors
PASS earned journey stars are not removed by later review difficulty
PASS two unassisted successes introduce a contrast instead of endless same-answer practice
ALL 20 ENGINE TESTS PASSED
```

## 模拟界面流程与媒体

```
PASS actual map DOM starts G2 locked
PASS returning from adaptive practice does not unlock G2
PASS refresh resumes H3 and first wrong attempt
PASS next question has fresh hint state and no previous H3
PASS reloaded paused independent test keeps wrong book unavailable
PASS reloaded independent test keeps language activities unavailable
PASS pure music is available during independent pause without autoplay
PASS switching rest modes stops local music
PASS returning from rest stops music before answering
PASS refresh after independent answer cannot retry it
PASS failed final save offers retry and does not grant a pass
PASS successful full retest save unlocks G2
PASS identity switch blocks old page
PASS second learner inherits no unlock or draft
PASS blocked forged summary without evidence does not qualify UI learner
PASS full UI workflow completes and saves G2
PASS full UI workflow completes and saves G3
PASS full UI workflow completes and saves S
PASS full UI workflow completes and saves C
PASS real recording screen is separate from content score
PASS unsupported microphone does not create fake audio or scores
PASS animation station links to official released resources, not a fake local video
PASS sound preview resumes context and applies persisted adjustable gain
PASS independent answer still does not reveal correctness through sound
ALL 24 DOM-SIMULATION TESTS PASSED (not native-browser visual QA)
```

## 存储

```
PASS preferences persist with revision
PASS stale tab cannot overwrite newer state
PASS quota failure preserves prior stored evidence
PASS identity change prevents cross-learner write
PASS corrupt records are not silently overwritten
ALL 5 STORAGE TESTS PASSED
```
