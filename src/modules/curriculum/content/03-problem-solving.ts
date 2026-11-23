import { py } from "../dedent";
import type { Module } from "../types";

export const problemSolving: Module = {
  id: "problem-solving",
  order: 3,
  title: "Problem Solving Patterns",
  track: "foundations",
  tagline:
    "LeetCode-style practice: hash maps, two pointers, sliding windows, stacks, binary search.",
  outcomes: [
    "Recognise the 5 patterns behind most coding-screen questions",
    "State time/space complexity for your solution unprompted",
    "Talk through an approach before coding — the way interviewers want",
  ],
  lessons: [
    {
      id: "hashing-and-pointers",
      title: "Hash maps & two pointers",
      summary: "Trade memory for time; walk inward from both ends.",
      minutes: 30,
      content: [
        {
          kind: "text",
          body: "**The interview loop:** (1) restate the problem and ask about edge cases, (2) give the brute force and its Big-O, (3) improve it, (4) code it, (5) test with examples out loud. Most of the score is steps 1, 2 and 5.",
        },
        {
          kind: "text",
          body: '**Hash map pattern:** when you need "have I seen X?" or "where did I see X?", store it in a dict as you go. Turns O(n²) nested loops into O(n).',
        },
        {
          kind: "text",
          body: "**Two pointers:** on sorted data or when comparing ends (palindromes), use `left = 0`, `right = len(xs) - 1` and move them toward each other.",
        },
        {
          kind: "callout",
          tone: "interview",
          body: 'Say the complexity before the interviewer asks. "This is O(n) time and O(n) extra space for the dict" is a senior signal.',
        },
      ],
      exercises: [
        {
          kind: "code",
          id: "ps-two-sum",
          title: "Two Sum",
          difficulty: "easy",
          prompt:
            "Given `nums` and `target`, return indices `[i, j]` (i < j) of the two numbers that add up to target. Exactly one answer exists. Aim for O(n).",
          starter: py`
            def two_sum(nums, target):
                pass
          `,
          solution: py`
            def two_sum(nums, target):
                index_of = {}
                for j, n in enumerate(nums):
                    if target - n in index_of:
                        return [index_of[target - n], j]
                    index_of[n] = j
                return []
          `,
          tests: [
            {
              name: "example",
              code: `assert two_sum([2, 7, 11, 15], 9) == [0, 1]`,
            },
            {
              name: "not adjacent",
              code: `assert two_sum([3, 2, 4], 6) == [1, 2]`,
            },
            { name: "duplicates", code: `assert two_sum([3, 3], 6) == [0, 1]` },
            {
              name: "fast on large input",
              code: py`
                import time
                nums = list(range(200_000)); t = time.perf_counter()
                assert two_sum(nums, 399_997) == [199_998, 199_999]
                assert time.perf_counter() - t < 2.0
              `,
              hidden: true,
            },
          ],
          hints: [
            "For each number n, the partner you need is `target - n`.",
            "Store each value's index in a dict *after* checking for its partner — that handles `[3, 3]`.",
          ],
          explanation:
            "One pass, O(n) time, O(n) space. Checking before inserting guarantees i < j and avoids pairing an element with itself.",
        },
        {
          kind: "code",
          id: "ps-palindrome",
          title: "Valid palindrome",
          difficulty: "easy",
          prompt:
            "Write `is_palindrome(s)` — True if `s` reads the same forwards and backwards considering only alphanumeric characters, case-insensitive. Use two pointers (O(1) extra space).",
          starter: py`
            def is_palindrome(s):
                left, right = 0, len(s) - 1
                pass
          `,
          solution: py`
            def is_palindrome(s):
                left, right = 0, len(s) - 1
                while left < right:
                    if not s[left].isalnum():
                        left += 1
                    elif not s[right].isalnum():
                        right -= 1
                    elif s[left].lower() != s[right].lower():
                        return False
                    else:
                        left += 1
                        right -= 1
                return True
          `,
          tests: [
            {
              name: "classic",
              code: `assert is_palindrome("A man, a plan, a canal: Panama")`,
            },
            {
              name: "not palindrome",
              code: `assert not is_palindrome("race a car")`,
            },
            {
              name: "empty / symbols",
              code: `assert is_palindrome("") and is_palindrome(".,")`,
              hidden: true,
            },
          ],
          hints: [
            "Skip non-alphanumeric characters with `str.isalnum()`.",
            "Compare `.lower()` versions and move both pointers inward when they match.",
          ],
          explanation:
            "The one-liner `cleaned == cleaned[::-1]` is O(n) extra space. Two pointers is O(1) space — mention both and the trade-off.",
        },
      ],
    },
    {
      id: "windows-stacks-search",
      title: "Sliding window, stacks & binary search",
      summary:
        "Three more patterns that cover a large share of coding screens.",
      minutes: 40,
      content: [
        {
          kind: "text",
          body: '**Sliding window:** for "longest/shortest substring/subarray such that…" keep a window `[left, right]`, expand right, and shrink left while the window is invalid.',
        },
        {
          kind: "text",
          body: '**Stack:** for matching brackets, undo, "next greater element". Python lists are stacks: `append()` and `pop()` are O(1).',
        },
        {
          kind: "code",
          caption:
            "Binary search template — halve the search space each step, O(log n)",
          code: py`
            def bisect_left(xs, target):
                lo, hi = 0, len(xs)
                while lo < hi:
                    mid = (lo + hi) // 2
                    if xs[mid] < target:
                        lo = mid + 1
                    else:
                        hi = mid
                return lo
          `,
        },
      ],
      exercises: [
        {
          kind: "code",
          id: "ps-longest-unique",
          title: "Longest substring without repeats",
          difficulty: "medium",
          prompt:
            "Return the length of the longest substring of `s` with no repeated characters. O(n) please.",
          starter: py`
            def longest_unique(s):
                pass
          `,
          solution: py`
            def longest_unique(s):
                last_seen = {}
                left = best = 0
                for right, ch in enumerate(s):
                    if ch in last_seen and last_seen[ch] >= left:
                        left = last_seen[ch] + 1
                    last_seen[ch] = right
                    best = max(best, right - left + 1)
                return best
          `,
          tests: [
            {
              name: "abcabcbb",
              code: `assert longest_unique("abcabcbb") == 3`,
            },
            { name: "bbbbb", code: `assert longest_unique("bbbbb") == 1` },
            { name: "pwwkew", code: `assert longest_unique("pwwkew") == 3` },
            {
              name: "empty",
              code: `assert longest_unique("") == 0`,
              hidden: true,
            },
            {
              name: "abba",
              code: `assert longest_unique("abba") == 2`,
              hidden: true,
            },
          ],
          hints: [
            "Track the last index where each character appeared.",
            'When you see a repeat inside the window, jump `left` to one past its previous index — but never move `left` backwards (see "abba").',
          ],
          explanation:
            "Each index is visited once by `right` and `left` only moves forward, so it's O(n) time and O(min(n, alphabet)) space.",
        },
        {
          kind: "code",
          id: "ps-brackets",
          title: "Valid brackets",
          difficulty: "easy",
          prompt:
            "Write `is_valid(s)` returning True if every `(`, `[`, `{` is closed by the matching bracket in the right order. Other characters are ignored.",
          starter: py`
            def is_valid(s):
                pairs = {")": "(", "]": "[", "}": "{"}
                stack = []
                pass
          `,
          solution: py`
            def is_valid(s):
                pairs = {")": "(", "]": "[", "}": "{"}
                stack = []
                for ch in s:
                    if ch in "([{":
                        stack.append(ch)
                    elif ch in pairs:
                        if not stack or stack.pop() != pairs[ch]:
                            return False
                return not stack
          `,
          tests: [
            { name: "nested", code: `assert is_valid("{[()]}")` },
            { name: "wrong order", code: `assert not is_valid("([)]")` },
            { name: "unclosed", code: `assert not is_valid("((")` },
            {
              name: "ignores text",
              code: `assert is_valid("f(x[0]) { return }")`,
              hidden: true,
            },
            {
              name: "early close",
              code: `assert not is_valid(")(")`,
              hidden: true,
            },
          ],
          hints: [
            "Push openers onto a stack; on a closer, the top of the stack must be its partner.",
            "At the end, the stack must be empty.",
          ],
          explanation:
            '`not stack` is truthiness on a list. Checking `not stack` before `pop()` avoids an IndexError on inputs like `")("`.',
        },
        {
          kind: "code",
          id: "ps-search-rotated",
          title: "Search a rotated sorted array",
          difficulty: "hard",
          prompt:
            "A sorted list of unique ints was rotated (e.g. `[4,5,6,7,0,1,2]`). Return the index of `target` or -1, in O(log n).",
          starter: py`
            def search(nums, target):
                lo, hi = 0, len(nums) - 1
                pass
          `,
          solution: py`
            def search(nums, target):
                lo, hi = 0, len(nums) - 1
                while lo <= hi:
                    mid = (lo + hi) // 2
                    if nums[mid] == target:
                        return mid
                    if nums[lo] <= nums[mid]:
                        if nums[lo] <= target < nums[mid]:
                            hi = mid - 1
                        else:
                            lo = mid + 1
                    else:
                        if nums[mid] < target <= nums[hi]:
                            lo = mid + 1
                        else:
                            hi = mid - 1
                return -1
          `,
          tests: [
            {
              name: "found",
              code: `assert search([4, 5, 6, 7, 0, 1, 2], 0) == 4`,
            },
            {
              name: "missing",
              code: `assert search([4, 5, 6, 7, 0, 1, 2], 3) == -1`,
            },
            {
              name: "single",
              code: `assert search([1], 1) == 0 and search([1], 2) == -1`,
            },
            {
              name: "every element findable",
              code: py`
                base = list(range(50))
                for r in range(50):
                    arr = base[r:] + base[:r]
                    for t in base:
                        assert search(arr, t) == arr.index(t), (r, t)
              `,
              hidden: true,
            },
          ],
          hints: [
            "At any mid, at least one half (`lo..mid` or `mid..hi`) is sorted.",
            "Check whether target lies inside the sorted half using its endpoints; if so search there, else search the other half.",
          ],
          explanation:
            "Python's chained comparisons (`a <= x < b`) make the range checks readable. The hidden test checks every rotation and every target — a good habit when your logic has many branches.",
        },
      ],
    },
  ],
};
