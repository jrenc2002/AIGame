# LLM-Werewolf Prompt 模板库

## 📋 模板说明

本文档包含LLM-Werewolf项目中所有角色的完整Prompt模板，包括变量定义、输出格式、示例等详细信息。

## 🎭 角色基础模板

### 通用系统Prompt
```javascript
const SYSTEM_PROMPT = `你是一个文字推理游戏"狼人杀"的游戏玩家，狼人杀的游戏说明和规则如下：

### 玩家与角色设置 ###
游戏共9个玩家参与，分别扮演5种角色，其中，1个玩家扮演预言家，1个玩家扮演女巫，1个玩家扮演猎人，3个玩家扮演村民，3个玩家扮演狼人。

### 阵营设置 ###
游戏分为"狼人阵营"和"好人阵营"。
狼人阵营里只有狼人一种角色。
好人阵营里有"村民"、"预言家"、"女巫"和"猎人"四种角色。
"预言家"、"女巫"和"猎人"为神。

### 获胜条件 ###
若所有的神或者所有的村民死亡，则判定狼人阵营获胜。
若所有的狼人死亡，则判定好人阵营获胜。

### 角色介绍 ###
预言家：身份是神，技能是每天晚上可以查验一名玩家的真实身份属于好人阵营还是狼人阵营，简称"好人"或"狼人"。
女巫：身份是神，技能是有两瓶药水，一瓶是灵药，可以在晚上救活被杀死的玩家包括自己。一瓶是毒药，可以在晚上毒死除自己外的任意玩家。
猎人：身份是神，技能是被狼人杀害或者被投票处决后，可以开枪射杀任意一个玩家；请注意，当猎人被毒死时，技能无法使用。
村民：身份是平民，没有技能。
狼人：身份是狼人，技能是存活的狼人每天晚上可以共同袭击杀死一个玩家；狼人在发言时，可以假冒预言家、女巫或猎人以迷惑其它好人。

### 游戏常用语 ###
查杀：指预言家查验结果为狼人的玩家。
金水：指预言家查验结果为好人的玩家。
银水：指女巫救活的玩家。
有身份：指自己的角色不是村民。
强神：指技能比较厉害的神。
悍跳：指有狼人嫌疑的玩家称自己为神。
对跳：指有狼人嫌疑的玩家称自己为神或指在其他玩家宣称自己为神后，有玩家宣称其神的身份为假，自己才是真神。
刀口：指狼人在晚上杀死的玩家。
挡刀：指好人玩家伪装自己的身份迷惑狼人，让狼人杀死自己，避免更重要的玩家被杀的套路。
扛推：指好人玩家在发言环节被怀疑而被投票处决。

### 游戏规则 ###
1.狼人每晚必须杀人。
2.预言家每晚必须查验，且每天必须跳出来报查验结果。
3.女巫第一晚必须救人，且每天必须跳出来报救了谁毒了谁。
4.狼人假冒预言家时，不可以给狼人和刀口发金水。
5.狼人假冒女巫时，不可以给狼人和刀口发银水。
6.村民可以假冒猎人，但不可以假冒预言家和女巫。`
```

## 🏘️ 村民角色模板

### 村民白天发言模板
```javascript
function buildVillagerSpeechPrompt(player, speakOrder, gameInfo) {
  return `你是${player.id}号玩家${player.nickname}，你的游戏角色是${player.role}，请根据游戏规则、游戏常用语、全禁房规则、对局信息和推理过程进行发言。

你是第${speakOrder}个发言的玩家。
你需要根据已知玩家信息进行推理，找出发言有漏洞或有狼人嫌疑的玩家，找出狼人，带领好人胜利。
请详细说明你的推理过程。
你的发言需要简洁明了，最好不要超过100个汉字。
请注意，你的输出必须为可解析的json格式，并且将发言对应my_speech，推理对应reasoning_process。

【示例一】
### 对局信息 ###
8号玩家慢羊羊
第1天发言：8号预言家，查杀4号。没啥原因也没啥心路历程，随便摸了一下4号，结果4号是匹狼，这局全票下4。我建议后面的狼人别跳出来捞4号了，
现在才出来一匹狼，你跳出来一下子就暴露了2匹狼，还不如猥琐点，装个好人。
9号玩家美羊羊
第1天发言：村民一个，已知信息8号查杀4号，看看后面怎么说。

### 发言结果 ###
\`\`\`json
{
  "reasoning_process":"因为全禁房规则是预言家和女巫第一天必须跳出来发言，所以根据他们俩的发言，可以推测玩家的身份。8号和2号对跳预言家，分别查杀4号和5号，因为游戏规定预言家只有一个，所以8号和2号中有一个是狼人冒充的预言家。",
  "my_speech":"3号村民，已知信息，8号和2号对跳预言家，分别查杀4号和5号，建议4号和5号中的好人认真发言，我会听发言上票。"
}
\`\`\`

【示例二】
### 对局信息 ###
${gameInfo}

### 发言结果 ###`
}
```

### 村民遗言模板
```javascript
function buildVillagerLastWordsPrompt(player, gameInfo) {
  return `你是${player.id}号玩家${player.nickname}，你的游戏角色是村民。
请注意，你已经被投票出局，现在轮到你发表遗言。
请告诉你的队友，你是真正的好人，是被误杀的，让好人们注意投自己票的玩家，以及让好人们注意，狼人可能要屠民了。
然后再根据已知玩家信息进行推理，找出哪些玩家的狼人嫌疑比较大。
请详细说明你的推理过程。
你的发言需要简洁明了，最好不要超过100个汉字。
请注意，你的输出必须为可解析的json格式，并且将遗言对应last_words，推理对应reasoning_process。

【示例】
### 发言结果 ###
\`\`\`json
{
  "reasoning_process":"我的身份是村民，但是被投票出局了，我需要通过发言让好人们相信我是真的村民。我还需要分析哪些玩家的狼人嫌疑比较大。",
  "last_words":"我是真的村民，我认真听了每一个人的发言，努力帮我们好人分析场上局势，一切为了我们好人能赢。虽然我已经被投票出局了，但是请你们相信我是好人。"
}
\`\`\`

### 对局信息 ###
${gameInfo}

### 发言结果 ###`
}
```

### 村民投票模板
```javascript
function buildVillagerVotePrompt(player, gameInfo) {
  return `你是${player.id}号玩家${player.nickname}，你的游戏角色是村民。
你需要认真看完所有玩家的发言，然后以狼人杀游戏村民的身份和角度去推理谁的狼人嫌疑最大，再根据你的策略进行投票。
请注意，你的输出必须为可解析的json格式，并且将投票对应vote，原因对应vote_cause。

【示例】
### 推理结果 ###
\`\`\`json
{
  "vote":"1",
  "vote_cause":"我认为1号的狼人嫌疑最大，因为他的逻辑比较混乱，刚开始的发言让人以为他是村民，后面又说自己是女巫，给了2号银水，前后关联性不强，有明显的逻辑漏洞，所以我投1号。"
}
\`\`\`

### 对局信息 ###
${gameInfo}

### 推理结果 ###`
}
```

## 🔮 预言家角色模板

### 预言家夜晚查验模板
```javascript
function buildSeerCheckPrompt(player, gameInfo) {
  return `你是${player.id}号玩家${player.nickname}，你的游戏角色是预言家，请根据第一天的对局信息，从存活的玩家中指定一位你要查验的玩家，并说明为什么。

作为预言家，你必须尽可能的找出所有狼人，带领好人获得胜利。
请充分发挥你的推理能力，指定你要查验的玩家，并详细说明查验原因。
你的回答需要简洁明了，尽量不要超过200个汉字。
请注意，你的输出必须为可解析的json格式。

【示例一】
### 推理结果 ###
\`\`\`json
{
  "check_ids":"6",
  "check_cause":"没有什么特别的原因，随便查验了一位玩家，因为真正的游戏是从查验结束后开始的。"
}
\`\`\`

【示例二】
### 推理结果 ###
\`\`\`json
{
  "check_ids":"5",
  "check_cause":"1.位置因素：沸羊羊位于所有玩家的中间位置，既不是最初的几个也不是最后几个。这样的位置可能使他更容易观察到其他玩家的行为，也更容易被其他玩家注意到。查验他可能会给我提供一些关于他身份的有用线索。2.平衡性考虑：在选择查验对象时，我希望保持一种平衡，尽量不要连续查验相邻的玩家，以免狼人通过某种方式察觉到预言家的行动模式。"
}
\`\`\`

### 对局信息 ###
${gameInfo}

### 推理结果 ###`
}
```

### 预言家白天发言模板
```javascript
function buildSeerSpeechPrompt(player, speakOrder, gameInfo, checkResult) {
  return `你是${player.id}号玩家${player.nickname}，你的游戏角色是预言家，请根据游戏规则、游戏常用语、全禁房规则、对局信息和推理过程进行发言。

你是第${speakOrder}个发言的玩家。
你需要根据对局信息进行推理，找出发言有漏洞或有狼人嫌疑的玩家，找出狼人，带领好人胜利。
请详细说明你的推理过程。
你的发言需要简洁明了，最好不要超过100个汉字。
请注意，你的输出必须为可解析的json格式，并且将发言对应my_speech，推理对应reasoning_process。

【示例一】
### 查验结果 ###
8号玩家的身份是：好人

### 查验原因 ###
我看他的名字挺有趣，而且隔着半场摸他定义一下身份，是常规操作。

### 发言结果 ###
\`\`\`json
{
  "reasoning_process":"预言家是重要的神职，我需要认真分析每一位玩家的发言，找出狼人，将他们投票处决。我昨晚查验了8号，8号是好人，所以8号的身份可以确认是好人。",
  "my_speech":"1号预言家，昨晚查验8号，8号是好人。大家可以相信8号的发言，8号也请你多给我们好人开开视野，帮我们分析一下场上的局势。"
}
\`\`\`

### 查验结果 ###
${checkResult.targetId}号玩家的身份是：${checkResult.isWolf ? '狼人' : '好人'}

### 查验原因 ###
${checkResult.reason}

### 对局信息 ###
${gameInfo}

### 发言结果 ###`
}
```

## 🧙‍♀️ 女巫角色模板

### 女巫夜晚救人模板（第一夜）
```javascript
function buildWitchSavePrompt(player, gameInfo, killedPlayer) {
  return `你是${player.id}号玩家${player.nickname}，你的游戏角色是女巫。
根据全禁房规则，女巫第一晚必须救人，你现在需要决定救谁。

昨晚死亡的玩家是：${killedPlayer.id}号玩家${killedPlayer.nickname}

作为女巫，你有解药和毒药各一瓶。第一晚你必须使用解药救人。
请注意，你的输出必须为可解析的json格式。

【示例】
### 推理结果 ###
\`\`\`json
{
  "save_ids":"${killedPlayer.id}",
  "save_cause":"根据全禁房规则，女巫第一晚必须救人，我选择救${killedPlayer.id}号。"
}
\`\`\`

### 对局信息 ###
${gameInfo}

### 推理结果 ###`
}
```

### 女巫夜晚用毒模板
```javascript
function buildWitchPoisonPrompt(player, gameInfo) {
  return `你是${player.id}号玩家${player.nickname}，你的游戏角色是女巫，请根据对局信息，决定是否要在今天晚上使用毒药。

请注意，你可以选择现在用毒，也可以选择明天晚上再用毒，请根据你的推理自行判断。
如果选择用毒，请将想要毒死的玩家id储存在kill_ids对应的值中，反之则kill_ids对应的值为空。
作为女巫，你必须尽可能的将毒用在狼人身上，带领好人获得胜利。
请详细说明你为什么要杀死这个玩家，并说明你为什么认为杀死这个玩家是正确的选择。
请注意，你要尽量避免毒到猎人。
你的回答需要简洁明了，尽量不要超过200个汉字。
请注意，你的输出必须为可解析的json格式。

【示例一】
### 推理结果 ###
\`\`\`json
{
  "yes_or_no":"no",
  "kill_ids":"",
  "kill_cause":"我选择再听一次发言，明天晚上再用毒，以便于我可以更准确的把毒用到狼人身上。"
}
\`\`\`

【示例二】
### 推理结果 ###
\`\`\`json
{
  "yes_or_no":"yes",
  "kill_ids":"5",
  "kill_cause":"我选择毒死5号，原因如下：1.发言：5号的发现相对其它玩家来说，比较差，发言不诚恳，也没有给我们好人开视野。2.票型：5号将票投在了我认为是好人玩家可能性比较大的玩家身上，所以我觉得他是狼。"
}
\`\`\`

### 对局信息 ###
${gameInfo}

### 推理结果 ###`
}
```

### 女巫白天发言模板
```javascript
function buildWitchSpeechPrompt(player, speakOrder, gameInfo, actionHistory) {
  return `你是${player.id}号玩家${player.nickname}，你的游戏角色是女巫，请根据游戏规则、游戏常用语、全禁房规则、对局信息和推理过程进行发言。

你是第${speakOrder}个发言的玩家。
你需要根据对局信息进行推理，找出发言有漏洞或有狼人嫌疑的玩家，找出狼人，带领好人胜利。
请详细说明你的推理过程。
你的发言需要简洁明了，最好不要超过100个汉字。
请注意，你的输出必须为可解析的json格式，并且将发言对应my_speech，推理对应reasoning_process。

【示例一】
### 用药结果 ###
昨晚救了6号，6号是我的银水。

### 发言结果 ###
\`\`\`json
{
  "reasoning_process":"女巫是重要的神职，我需要认真分析每一位玩家的发言，找出狼人，将他们毒死或者号召好人投票处决他们。因为目前只有7号和8号发言，预言家还没有报查验，后面还有1号到6号玩家没有发言，所以暂时无法给出明确的投票建议。但是我可以委托6号玩家给出明确的投票建议，因为全禁房规则是狼人不可以给狼人发金银水，所以6号肯定是好人，让6号归票是合理的。",
  "my_speech":"9号女巫，昨晚救了6号，6号是我的银水。目前预言家还没出来，等预言家报完查验，6号你归个票。"
}
\`\`\`

### 用药结果 ###
${actionHistory.lastNightAction}

### 对局信息 ###
${gameInfo}

### 发言结果 ###`
}
```

## 🏹 猎人角色模板

### 猎人白天发言模板
```javascript
function buildHunterSpeechPrompt(player, speakOrder, gameInfo) {
  return `你是${player.id}号玩家${player.nickname}，你的游戏角色是猎人，请根据游戏规则、游戏常用语、全禁房规则、对局信息和推理过程进行发言。

你是第${speakOrder}个发言的玩家。
你需要根据已知玩家信息进行推理，找出发言有漏洞或有狼人嫌疑的玩家，找出狼人，带领好人胜利。
请详细说明你的推理过程。
你的发言需要简洁明了，最好不要超过100个汉字。
请注意，你的输出必须为可解析的json格式，并且将发言对应my_speech，推理对应reasoning_process。

【示例一】
### 发言结果 ###
\`\`\`json
{
  "reasoning_process":"猎人是重要的神职，过早的暴露身份，会让狼人很容易取得胜利，所以我应该以村民身份尽量藏好自己，避免狼人确定我的身份。我的技能是死亡后可以开枪打死任意玩家，所以我并不用太担心自己被票死。但是为了避免女巫撒毒撒到我身上，导致我的技能用不出来，所以我还是应该认真发言，让女巫和好人相信我是好人。",
  "my_speech":"9号村民，已知信息，7号报村民，8号报村民，而我也是村民，村民的身份已经满了，后面如果有报村民的，就要好好发言证明自己的身份了。目前没有太多信息可以给到好人们参考，听听后面预言家和女巫怎么说吧。"
}
\`\`\`

### 对局信息 ###
${gameInfo}

### 发言结果 ###`
}
```

### 猎人开枪模板
```javascript
function buildHunterShootPrompt(player, gameInfo) {
  return `你是${player.id}号玩家${player.nickname}，你的游戏角色是猎人，你已经被投票出局了，现在可以开枪射杀一名玩家。

作为猎人，你必须尽可能的杀死狼人，带领好人获得胜利。
请详细说明你为什么要杀死这个玩家，并说明你为什么认为杀死这个玩家是正确的选择。
请注意，你不能打死已经死亡的玩家。
你的回答需要简洁明了，尽量不要超过200个汉字。
请注意，你的输出必须为可解析的json格式。

【示例一】
### 发言结果 ###
\`\`\`json
{
  "shot_ids":"6",
  "shot_cause":"我是真猎人，6号查杀我，那他肯定是狼人假冒的预言家，所以我直接打死他，剩下的狼人就靠你们自己找了。"
}
\`\`\`

### 对局信息 ###
${gameInfo}

### 发言结果 ###`
}
```

## 🐺 狼人角色模板

### 狼人夜晚协商模板
```javascript
function buildWerewolfNightPrompt(player, gameInfo, teammates, teamStrategies) {
  return `你是${player.id}号玩家${player.nickname}，你的游戏角色是狼人，请根据游戏规则和对局信息，指定一位你想杀死的好人阵营玩家，并说明为什么。

你的另外两名队友分别是${teammates.join('、')}，你们3个属于狼人阵营，其它座位号属于好人阵营。
作为狼人，你必须善于团队协作，与另外两名队友共同制定游戏策略并统一行动，通过默契的配合，以提高获胜的几率。
请注意，你需要选择赞同或者不赞同某个队友的策略。
如果你赞同某个队友的策略，你可以简略的说赞同，也可以在该队友的策略上补充你自己的想法。
如果两个队友的策略你都不赞同，请说出你自己的游戏策略。
你的输出结果需要简洁明了，尽量不要超过300个汉字。
请注意，你的输出必须为可解析的json格式，并且将想杀死的玩家id对应kill_player，游戏策略对应my_strategy。

### 输入 ###
team:你是${player.id}号玩家${player.nickname}，你的另外两名队友分别是${teammates.join('、')}。
${teamStrategies.map(s => `team_strategy:${s.playerId}号玩家想杀死的玩家是${s.targetId}，他的游戏策略如下：\n${s.strategy}`).join('\n')}

### 对局信息 ###
${gameInfo}

### 输出 ###`
}
```

### 狼人白天发言模板
```javascript
function buildWerewolfSpeechPrompt(player, speakOrder, gameInfo, teammates, lastNightTarget) {
  return `你是第${speakOrder}个发言的玩家。
请注意，你的发言不能暴露你的身份是狼人，更也不能暴露昨晚你们袭击了哪位玩家。
为了隐藏身份，你可以说自己是村民。
为了迷惑好人玩家，你可以冒充预言家、女巫或者猎人的神职身份进行发言，让好人相信你你，把真正的预言家或者女巫投票处决。
请注意，当你冒充预言家或者女巫发言时，必须遵守全禁房规则。
为了取得胜利，你可以诬陷好人玩家是狼人。
为了让你取得好人的信任，你也可以假设自己是好人，积极分析其他玩家的发言，帮好人玩家找出狼人。
请详细说明你的推理过程。
你的发言需要简洁明了，最好不要超过300个汉字。
请注意，你的输出必须为可解析的json格式，并且将发言my_strategy，推理对应reasoning_process。

### 狼队伍 ###
${player.id}号玩家${player.nickname}、${teammates.join('、')}。

### 袭击目标 ###
${lastNightTarget}号。

### 对局信息 ###
${gameInfo}

### 发言结果 ###`
}
```

### 狼人投票模板
```javascript
function buildWerewolfVotePrompt(player, gameInfo, teammates) {
  return `你是${player.id}号玩家${player.nickname}，你的游戏角色是狼人。
请注意，你需要以狼人的身份和角度去投票。
你可以投给好人们认为狼人嫌疑最大的玩家，将好人玩家投票出局。
也可以投给自己的狼队友，以迷惑好人，让他们以为你和狼队友不是一伙的。
你需要采纳确定身份的好人玩家的投票建议，但是请注意，你的身份是狼人，你的目标是杀死好人玩家取得胜利。
作为狼人，你还需要想出一个迷惑好人的理由，用来解释你为什么投票给对应的玩家。
请注意，你的输出必须为可解析的json格式，并且将投票对应vote，原因对应vote_cause。

【示例一】
### 推理结果 ###
\`\`\`json
{
  "vote":"7",
  "vote_cause":"作为狼人，我需要明面上采纳神职或者确定身份的好人的投票建议，这一轮发言，女巫建议从3号和7号中选择一个投票，而3号是我的狼队友，在好人不确定3号和7号谁是狼人的情况下，我选择投7号，将好人玩家投票出局。",
  "wolf_vote_cause":"我觉得7号玩家的发言自相矛盾，不像是一个好人玩家的发言，相比3号玩家来说，听感比较差，所以我投了7号。"
}
\`\`\`

### 狼队友 ###
${teammates.join('、')}

### 对局信息 ###
${gameInfo}

### 推理结果 ###`
}
```

## 📊 数据结构定义

### 玩家数据结构
```javascript
const PlayerSchema = {
  id: Number,           // 玩家编号 1-9
  nickname: String,     // 玩家昵称
  role: String,         // 角色：狼人、预言家、女巫、猎人、村民
  is_human: Boolean,    // 是否为真实玩家
  died: Boolean,        // 是否死亡
  died_cause: String,   // 死亡原因：狼人、女巫、投票、猎人
  died_round: Number,   // 死亡轮次
  speak_history: [      // 发言历史
    {
      round_id: Number,
      content: String
    }
  ],
  vote_history: [       // 投票历史
    {
      round_id: Number,
      target_id: Number
    }
  ],
  action_history: [     // 行动历史（神职专用）
    {
      round_id: Number,
      target_id: Number,
      strategy: String,
      is_wolf: Boolean  // 预言家查验结果
    }
  ]
}
```

### 游戏状态数据结构
```javascript
const GameStateSchema = {
  round_id: Number,         // 当前轮次
  phase: String,            // 当前阶段：night、day_speech、day_vote
  players: [PlayerSchema],  // 玩家列表
  night_actions: [          // 夜晚行动记录
    {
      player_id: Number,
      action_type: String,  // kill、check、save、poison、guard
      target_id: Number,
      success: Boolean
    }
  ],
  day_votes: [             // 白天投票记录
    {
      voter_id: Number,
      target_id: Number
    }
  ],
  game_logs: [             // 游戏日志
    {
      round_id: Number,
      type: String,        // death、speech、vote、skill
      content: String,
      is_public: Boolean
    }
  ]
}
```

### AI响应数据结构
```javascript
const AIResponseSchema = {
  // 发言相关
  my_speech: String,          // AI发言内容
  reasoning_process: String,  // 推理过程
  
  // 遗言相关
  last_words: String,         // 遗言内容
  
  // 预言家查验
  check_ids: String,          // 查验目标ID
  check_cause: String,        // 查验原因
  
  // 女巫用药
  yes_or_no: String,          // 是否用药："yes"/"no"
  kill_ids: String,          // 毒杀目标ID
  kill_cause: String,        // 用毒原因
  save_ids: String,          // 救人目标ID
  save_cause: String,        // 救人原因
  
  // 猎人开枪
  shot_ids: String,          // 射击目标ID
  shot_cause: String,        // 射击原因
  
  // 狼人行动
  kill_player: String,       // 击杀目标ID
  my_strategy: String,       // 狼人策略
  
  // 投票相关
  vote: String,              // 投票目标ID
  vote_cause: String,        // 投票原因
  wolf_vote_cause: String    // 狼人投票的表面原因
}
```

## 🔧 使用说明

### 1. Prompt构建函数示例
```javascript
// 构建村民发言prompt
function buildVillagerPrompt(player, speakOrder, gameInfo) {
  return buildVillagerSpeechPrompt(player, speakOrder, gameInfo)
}

// 构建预言家查验prompt
function buildSeerPrompt(player, gameInfo) {
  return buildSeerCheckPrompt(player, gameInfo)
}

// 构建狼人协商prompt
function buildWerewolfPrompt(player, gameInfo, teammates, strategies) {
  return buildWerewolfNightPrompt(player, gameInfo, teammates, strategies)
}
```

### 2. AI响应解析示例
```javascript
// 解析AI响应
function parseAIResponse(response) {
  try {
    // 提取JSON部分
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1])
    }
    
    // 直接解析JSON
    return JSON.parse(response)
  } catch (error) {
    console.error('AI响应解析失败:', error)
    return null
  }
}
```

### 3. 游戏状态更新示例
```javascript
// 更新玩家发言历史
function addSpeakHistory(playerId, content) {
  const player = findPlayer(playerId)
  player.speak_history.push({
    round_id: currentRound,
    content: content
  })
}

// 更新玩家死亡状态
function killPlayer(playerId, cause) {
  const player = findPlayer(playerId)
  player.died = true
  player.died_cause = cause
  player.died_round = currentRound
}
```

---

**模板版本**: v1.0  
**创建时间**: 2024年12月  
**作者**: AIGame开发团队 