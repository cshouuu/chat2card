import { ChatMessage } from './core/types';

/** 示例一:开源自嘲梗(默认加载) */
export const DEFAULT_SAMPLE: { title: string; messages: ChatMessage[] } = {
  title: '如何让一个开源项目拿到 200 star',
  messages: [
    {
      role: 'user',
      content: '我想申请 Codex for OSS,但要求项目有 200 star。我现在的项目有 0 个 star,怎么办?',
    },
    {
      role: 'assistant',
      content:
        '经典困境:先有 star 才能申请,先申请才能有 star。不过别慌,我可以帮你:\n\n1. **做一个真正有用的工具**(而不是又一个 Todo App)\n2. README 放上效果图,让人 3 秒看懂\n3. 提供在线 Demo,打开就能玩\n4. 配好 CI + 测试,显得很专业\n5. 然后…去 HN / V2EX / 掘金 吆喝\n\n要不要我现在就帮你写一个?',
    },
    {
      role: 'user',
      content: '好,那先帮我写个 Python 快速排序吧,顺便秀一下你的代码块渲染能力。',
    },
    {
      role: 'assistant',
      content:
        '没问题,代码块长这样:\n\n```python\ndef quicksort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    mid = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quicksort(left) + mid + quicksort(right)\n```\n\n> 提示:这是最简单版本,实际工程中建议用 `sorted()`。\n\n看到没?**代码块、引用、粗体、行内代码**全都支持。这张卡片就是 chat2card 的演示效果。',
    },
    {
      role: 'user',
      content: '太强了,这项目叫什么名字?',
    },
    {
      role: 'assistant',
      content:
        '它叫 **chat2card** —— 把 AI 对话一键变成精美卡片/长图。\n\n- 支持粘贴 ChatGPT 导出 JSON 或纯文本对话\n- 6 套主题随便换\n- 一键导出 PNG / HTML / Markdown\n- 纯前端,零依赖,浏览器里直接跑\n\n打开 https://github.com/yourname/chat2card 点个 ⭐ 呗?',
    },
  ],
};

/** 示例二:正经技术问答 */
export const TECH_SAMPLE: { title: string; messages: ChatMessage[] } = {
  title: 'React 性能优化入门',
  messages: [
    {
      role: 'user',
      content: 'React 应用越来越卡,有什么优化手段?',
    },
    {
      role: 'assistant',
      content: '按优先级来:\n\n1. **useMemo / useCallback** —— 缓存昂贵的计算和函数引用\n2. **React.memo** —— 避免不必要的子组件重渲染\n3. **代码分割** —— 用 `React.lazy()` 按需加载\n4. **虚拟列表** —— 长列表用 react-window\n\n记住一句话:先测量,再优化。别上来就堆 memo,性能问题要先看 Profiler。',
    },
    {
      role: 'user',
      content: '那 useMemo 是不是能解决所有问题?',
    },
    {
      role: 'assistant',
      content:
        '当然不是。useMemo 本身也有开销,滥用反而更慢。\n\n```js\n// ❌ 没必要:基本类型的计算没有缓存价值\nconst double = useMemo(() => n * 2, [n]);\n\n// ✅ 有价值:昂贵的计算\nconst filtered = useMemo(\n  () => bigList.filter(x => x.score > 90),\n  [bigList]\n);\n```\n\n> 铁律:useMemo 的依赖项是引用类型时才有意义。',
    },
  ],
};
